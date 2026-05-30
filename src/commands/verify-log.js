import path from "node:path";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";
import {
  buildHistorySummary,
  formatHistoryReport,
  readJson,
  resolveBundlePath,
  summarizeBundle
} from "./verify-history.js";

function dedupeEntries(entries) {
  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    const key = entry.bundle_path;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }

  return result;
}

function buildLog(logEntries, inputs) {
  const summary = buildHistorySummary(logEntries);
  const latestTimestamp = logEntries.length > 0
    ? logEntries
        .map((entry) => entry.generated_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null
    : null;

  return {
    artifact_type: "verification-log",
    generated_at: nowIso(),
    latest_timestamp: latestTimestamp,
    updated_from_inputs: inputs,
    entry_count: logEntries.length,
    summary,
    entries: logEntries
  };
}

function buildIndex(logArtifact) {
  const latestEntry = logArtifact.entries.at(-1) ?? null;
  return {
    artifact_type: "verification-index",
    generated_at: nowIso(),
    source_log_generated_at: logArtifact.generated_at,
    source_log_path: "verification-log.json",
    entry_count: logArtifact.entry_count,
    latest_timestamp: logArtifact.latest_timestamp,
    summary: {
      providers: logArtifact.summary.providers,
      workflows: logArtifact.summary.workflows,
      statuses: logArtifact.summary.statuses,
      drift_fields: logArtifact.summary.drift?.fields_with_drift ?? [],
      latest_changed_fields: logArtifact.summary.latest_comparison?.changed_fields ?? []
    },
    latest_entry: latestEntry
      ? {
          generated_at: latestEntry.generated_at,
          bundle_path: latestEntry.bundle_path,
          request: latestEntry.request,
          provider: latestEntry.provider,
          model: latestEntry.model,
          routing_mode: latestEntry.routing_mode,
          workflow: latestEntry.workflow,
          governance: latestEntry.governance,
          happy_path_approval_status: latestEntry.branch_outcomes?.happy_path?.approval_status ?? null,
          signal_reopen_status: latestEntry.branch_outcomes?.signal_reopen?.reopen_status ?? null,
          escalation_reopen_status: latestEntry.branch_outcomes?.escalation_reopen?.resolution_status ?? null,
          escalation_approve_status: latestEntry.branch_outcomes?.escalation_approve?.resolution_status ?? null,
          escalation_stop_status: latestEntry.branch_outcomes?.escalation_stop?.resolution_status ?? null,
          observed_provider_stage_count: latestEntry.provider_observability?.observed_stage_count ?? 0
        }
      : null
  };
}

function formatLogReport(logArtifact) {
  const historyShape = {
    generated_at: logArtifact.generated_at,
    entry_count: logArtifact.entry_count,
    summary: logArtifact.summary,
    sources: logArtifact.updated_from_inputs,
    entries: logArtifact.entries
  };

  const body = formatHistoryReport(historyShape);
  return body.replace(/^# Verification History Report/m, "# Verification Log Report");
}

function formatIndexReport(indexArtifact) {
  const latest = indexArtifact.latest_entry;
  const summary = indexArtifact.summary ?? {};
  const lines = [
    "# Verification Index Report",
    "",
    `- generated at: ${indexArtifact.generated_at ?? "-"}`,
    `- source log generated at: ${indexArtifact.source_log_generated_at ?? "-"}`,
    `- entry count: ${indexArtifact.entry_count ?? 0}`,
    `- latest timestamp: ${indexArtifact.latest_timestamp ?? "-"}`,
    `- providers: ${(summary.providers ?? []).join(", ") || "-"}`,
    `- workflows: ${(summary.workflows ?? []).join(", ") || "-"}`,
    `- drift fields: ${(summary.drift_fields ?? []).join(", ") || "-"}`,
    `- latest changed fields: ${(summary.latest_changed_fields ?? []).join(", ") || "-"}`,
    "",
    "## Latest Entry"
  ];

  if (!latest) {
    lines.push("- none", "");
    return lines.join("\n");
  }

  lines.push(`- generated at: ${latest.generated_at ?? "-"}`);
  lines.push(`- bundle path: ${latest.bundle_path ?? "-"}`);
  lines.push(`- request: ${latest.request ?? "-"}`);
  lines.push(`- provider/model: ${latest.provider ?? "-"} / ${latest.model ?? "-"}`);
  lines.push(`- routing mode: ${latest.routing_mode ?? "-"}`);
  lines.push(`- workflow: ${latest.workflow?.workflow_id ?? "-"} (${latest.workflow?.name ?? "-"})`);
  lines.push(`- governance: ${latest.governance?.model ?? "-"} / escalation target=${latest.governance?.escalation_target ?? "-"}`);
  lines.push(`- happy path approval: ${latest.happy_path_approval_status ?? "-"}`);
  lines.push(`- signal reopen: ${latest.signal_reopen_status ?? "-"}`);
  lines.push(`- escalation reopen: ${latest.escalation_reopen_status ?? "-"}`);
  lines.push(`- escalation approve: ${latest.escalation_approve_status ?? "-"}`);
  lines.push(`- escalation stop: ${latest.escalation_stop_status ?? "-"}`);
  lines.push(`- observed provider stages: ${latest.observed_provider_stage_count ?? 0}`);
  lines.push("");

  return lines.join("\n");
}

export async function verifyLogCommand(options) {
  if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
    throw new Error("At least one --input is required for `verify-log`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-log`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const logJsonPath = path.join(artifactDir, "verification-log.json");
  const logReportPath = path.join(artifactDir, "verification-log.md");

  let existingEntries = [];
  try {
    const existingLog = await readJson(logJsonPath, "verification log");
    existingEntries = Array.isArray(existingLog.entries) ? existingLog.entries : [];
  } catch (error) {
    if (!(error instanceof Error) || !/ENOENT/.test(error.message)) {
      throw error;
    }
  }

  const newEntries = [];
  const resolvedInputs = [];
  for (const input of options.inputs) {
    const bundlePath = await resolveBundlePath(input);
    const bundle = await readJson(bundlePath, "verification bundle");
    newEntries.push(summarizeBundle(bundle, bundlePath, path.resolve(input)));
    resolvedInputs.push(path.resolve(input));
  }

  const entries = dedupeEntries([...existingEntries, ...newEntries]);
  const logArtifact = buildLog(entries, resolvedInputs);
  const indexArtifact = buildIndex(logArtifact);
  const writtenLogJsonPath = await writeJsonArtifact(logJsonPath, logArtifact);
  const writtenLogReportPath = await writeTextArtifact(logReportPath, formatLogReport(logArtifact));
  const indexJsonPath = await writeJsonArtifact(path.join(artifactDir, "verification-index.json"), indexArtifact);
  const indexReportPath = await writeTextArtifact(path.join(artifactDir, "verification-index.md"), formatIndexReport(indexArtifact));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    logJsonPath: writtenLogJsonPath,
    logReportPath: writtenLogReportPath,
    indexJsonPath,
    indexReportPath,
    entryCount: logArtifact.entry_count,
    latestTimestamp: logArtifact.latest_timestamp,
    providers: logArtifact.summary.providers,
    workflows: logArtifact.summary.workflows
  };
}
