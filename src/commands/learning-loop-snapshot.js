import fs from "node:fs/promises";
import path from "node:path";

import { loadGoalProjection, resolveAofRoot } from "../runtime/project-memory.js";
import { nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";

async function readJson(filePath, label) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function maybeReadJson(filePath, label) {
  try {
    return await readJson(filePath, label);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function listJsonFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(dirPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function findLatestOutcome(sessionsRoot, deps = {}) {
  const listJsonFilesImpl = deps.listJsonFiles ?? listJsonFiles;
  const readJsonImpl = deps.readJson ?? readJson;
  const onUnreadableSession = deps.onUnreadableSession ?? null;
  const sessionPaths = await listJsonFilesImpl(sessionsRoot);
  let latest = null;

  for (const sessionPath of sessionPaths) {
    let session;
    try {
      session = await readJsonImpl(sessionPath, `session ${path.basename(sessionPath)}`);
    } catch (error) {
      if (typeof onUnreadableSession === "function") {
        onUnreadableSession({
          sessionPath,
          error
        });
      }
      continue;
    }
    for (const report of session.outcome_reports ?? []) {
      if (!latest || String(report.observed_at) > String(latest.observed_at)) {
        latest = {
          source_session_id: session.session_id,
          report_id: report.report_id,
          result: report.result,
          observed_at: report.observed_at,
          note: report.note,
          signal_ref: report.signal_ref ?? null
        };
      }
    }
  }

  return latest;
}

async function countOpenTasks(tasksRoot) {
  const openFiles = await listJsonFiles(path.join(tasksRoot, "open"));
  return openFiles.length;
}

function deriveLoopState({ latestOutcome, latestSelfAudit, nextValueSlice }) {
  if (!latestOutcome && !latestSelfAudit && !nextValueSlice) {
    return "seeded";
  }
  if (latestSelfAudit && latestSelfAudit.result_state === "stable") {
    return "stable";
  }
  if (latestSelfAudit || nextValueSlice) {
    return "improving";
  }
  return "observing";
}

export async function learningLoopSnapshotCommand(options, deps = {}) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const organizationRef = ".aof/organization.json";
  const loadGoalProjectionImpl = deps.loadGoalProjection ?? loadGoalProjection;
  const skippedUnreadableSessions = [];

  const latestSelfAudit = await maybeReadJson(
    path.join(aofRoot, "context", "active", "framework-self-audit.json"),
    "framework self-audit"
  );
  const nextValueSliceProjection = await loadGoalProjectionImpl({
    projectRoot,
    goalType: "next-value-slice"
  }).catch(() => null);
  const latestOutcome = await findLatestOutcome(path.join(aofRoot, "sessions"), {
    listJsonFiles: deps.listJsonFiles,
    readJson: deps.readJson,
    onUnreadableSession: ({ sessionPath }) => {
      skippedUnreadableSessions.push(path.basename(sessionPath));
    }
  });
  const openTaskCount = await countOpenTasks(path.join(aofRoot, "tasks"));

  const currentNextValueSlice = nextValueSliceProjection?.payload
    ? {
        content: nextValueSliceProjection.payload.content,
        updated_at: nextValueSliceProjection.payload.updated_at ?? null,
        declared_complete_at: nextValueSliceProjection.payload.declared_complete_at ?? null,
        source_session_id: nextValueSliceProjection.payload.source_session_id ?? null,
        source_decision_record_id: nextValueSliceProjection.payload.source_decision_record_id ?? null
      }
    : null;

  const auditSummary = latestSelfAudit
    ? {
        audit_id: latestSelfAudit.audit_id,
        recorded_at: latestSelfAudit.recorded_at,
        summary: latestSelfAudit.summary,
        detected_gap: latestSelfAudit.detected_gap,
        result_state: latestSelfAudit.result_state ?? null,
        next_action: latestSelfAudit.next_action,
        related_task_ids: latestSelfAudit.related_task_ids ?? []
      }
    : null;

  const improvementProposal = auditSummary || currentNextValueSlice
    ? {
        proposal_basis: auditSummary
          ? "framework-self-audit"
          : "next-value-slice",
        proposed_focus: auditSummary?.next_action
          ?? currentNextValueSlice?.content
          ?? "Continue the current improvement slice.",
        related_task_ids: auditSummary?.related_task_ids ?? [],
        open_task_count: openTaskCount
      }
    : null;

  const learningState = {
    has_outcome_evidence: Boolean(latestOutcome),
    has_self_audit: Boolean(auditSummary),
    has_next_value_slice: Boolean(currentNextValueSlice),
    loop_state: deriveLoopState({
      latestOutcome,
      latestSelfAudit: auditSummary,
      nextValueSlice: currentNextValueSlice
    })
  };

  const observations = [];
  if (!latestOutcome) {
    observations.push("No outcome report has been observed in the current local session archive.");
  }
  if (!auditSummary) {
    observations.push("No active framework self-audit is present yet.");
  }
  if (currentNextValueSlice) {
    observations.push(`Current next value slice: ${currentNextValueSlice.content}`);
  }
  if (auditSummary) {
    observations.push(`Latest self-audit next action: ${auditSummary.next_action}`);
  }
  if (latestOutcome) {
    observations.push(`Latest outcome result: ${latestOutcome.result}`);
  }
  if (skippedUnreadableSessions.length > 0) {
    observations.push(`Skipped unreadable session artifacts: ${skippedUnreadableSessions.length}`);
  }

  const payload = {
    snapshot_type: "aof-learning-loop",
    snapshot_format_version: 1,
    organization_ref: organizationRef,
    generated_at: nowIso(),
    latest_outcome: latestOutcome,
    latest_self_audit: auditSummary,
    current_next_value_slice: currentNextValueSlice,
    improvement_proposal: improvementProposal,
    learning_state: learningState,
    observations
  };

  await validateWithBundledSchema(payload, "aof-learning-loop.schema.json", "learning loop snapshot");
  const artifactPath = await writeJsonArtifact(path.join(aofRoot, "context", "active", "learning-loop.json"), payload);

  return {
    ok: true,
    artifactPath,
    payload,
    skippedUnreadableSessions
  };
}
