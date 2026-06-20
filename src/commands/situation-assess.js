import path from "node:path";

import { resolveAofRoot } from "../runtime/project-paths.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";
import { loadActiveReleaseManifest } from "./release-state-helpers.js";
import { TASK_STATUSES, listJsonFiles, maybeReadJson, readJson } from "./operator-surface-helpers.js";

export function normalizeTrackLabel(raw) {
  if (!raw) {
    return null;
  }
  const match = String(raw).match(/v?(\d+)\.(\d+)/i);
  if (!match) {
    return null;
  }
  return `v${match[1]}.${match[2]}`;
}

export function extractTrackFromText(text) {
  const match = String(text ?? "").match(/\bv(\d+)\.(\d+)\b/i);
  if (!match) {
    return null;
  }
  return `v${match[1]}.${match[2]}`;
}

function trackNumber(track) {
  const normalized = normalizeTrackLabel(track);
  if (!normalized) {
    return -1;
  }
  const match = normalized.match(/^v(\d+)\.(\d+)$/i);
  if (!match) {
    return -1;
  }
  return Number.parseInt(match[1], 10) * 1000 + Number.parseInt(match[2], 10);
}

export function inferRoadmapTrack(task) {
  const title = String(task.title ?? "");
  const description = String(task.description ?? "");
  const triageNotes = String(task.triage_notes ?? "");
  const joined = `${title}\n${description}\n${triageNotes}`;

  const explicitTrack = extractTrackFromText(joined);
  if (explicitTrack) {
    return explicitTrack;
  }
  if (/skillful actor runtime|actor skill packet|capability-fit|capability fit|actor assignment evaluation|resource claim and policy gate|policy gate integration|skillful actor negative benchmark|hri projection|self-hosting proof/i.test(joined)) {
    return "v5.0";
  }
  if (/post-release transition|roadmap truthfulness|situation assessment|situation judgment/i.test(joined)) {
    return "v3.7";
  }
  if (/mission control|artifact graph|blocker visibility|recommended next action|visibility layer/i.test(joined)) {
    return "v3.6";
  }
  if (/command routing|command registry|cli context efficiency|recognition-packet/i.test(joined)) {
    return "v3.5";
  }
  if (/release-state freshness|drift detection|active release manifest/i.test(joined)) {
    return "v3.4";
  }
  if (/backend-neutral organization runtime|parent-child orchestration|parent\/child orchestration|orchestration contracts|role join/i.test(joined)) {
    return "v3.0";
  }
  if (/visibility outputs|visibility projection|runtime-backed visibility|status_card|timeline_feed|flow_snapshot|human visibility layer/i.test(joined)) {
    return "v2.6";
  }
  if (/allocation|policy evaluation|resource claim|resource reservation|staffing/i.test(joined)) {
    return "v2.5";
  }
  if (/execution packet|council review|execution lineage/i.test(joined)) {
    return "v2.4";
  }
  if (/task creation concurrency-safe|unique task lifecycle|operator-facing organization surfaces|organization-status and roadmap-status/i.test(joined)) {
    return "v2.3";
  }
  if (/discovery layer|discovery-to-delivery|breakthrough-pattern|assumption map|anomaly log/i.test(joined)) {
    return "v3.0";
  }
  return "unmapped";
}

function latestAt(task) {
  return String(task.updated_at ?? task.done_at ?? task.created_at ?? "");
}

async function listTasksByStatus(projectRoot, status) {
  const tasksRoot = path.join(resolveAofRoot(projectRoot), "tasks", status);
  const filePaths = await listJsonFiles(tasksRoot);
  const tasks = await Promise.all(
    filePaths.map(async (filePath) => ({
      filePath,
      status,
      payload: await readJson(filePath, `task ${path.basename(filePath)}`)
    }))
  );
  return tasks.sort((left, right) => latestAt(right.payload).localeCompare(latestAt(left.payload)));
}

async function loadTaskSets(projectRoot) {
  const groups = await Promise.all(TASK_STATUSES.map(async (status) => ({
    status,
    tasks: await listTasksByStatus(projectRoot, status)
  })));
  const byId = new Map();
  for (const group of groups) {
    for (const entry of group.tasks) {
      byId.set(entry.payload.task_id, entry);
    }
  }
  return { groups, byId };
}

function summarizeTaskEntry(entry, projectRoot) {
  if (!entry) {
    return null;
  }
  return {
    task_id: entry.payload.task_id,
    title: entry.payload.title,
    status: entry.status,
    updated_at: entry.payload.updated_at ?? null,
    track: inferRoadmapTrack(entry.payload),
    artifact_ref: path.relative(projectRoot, entry.filePath)
  };
}

function pickFrontierTask(openTasks, activeReleaseTrack, nextValueSlice, operatingGoal, activeAlignmentEntries = []) {
  if (activeAlignmentEntries.length > 0) {
    return activeAlignmentEntries[0];
  }

  const targetTracks = [extractTrackFromText(nextValueSlice), extractTrackFromText(operatingGoal)].filter(Boolean);
  for (const targetTrack of targetTracks) {
    const exact = openTasks.find((entry) => inferRoadmapTrack(entry.payload) === targetTrack);
    if (exact) {
      return exact;
    }
  }

  const activeTrackNumber = trackNumber(activeReleaseTrack);
  const futureTasks = openTasks
    .filter((entry) => trackNumber(inferRoadmapTrack(entry.payload)) > activeTrackNumber)
    .sort((left, right) => {
      const diff = trackNumber(inferRoadmapTrack(right.payload)) - trackNumber(inferRoadmapTrack(left.payload));
      if (diff !== 0) {
        return diff;
      }
      return latestAt(right.payload).localeCompare(latestAt(left.payload));
    });
  if (futureTasks.length > 0) {
    return futureTasks[0];
  }
  return openTasks[0] ?? null;
}

function deriveCurrentStage({ staleReleaseTasks, frontierTask, nextValueSlice, operatingGoal }) {
  if (staleReleaseTasks.length > 0) {
    return "truth-conflict";
  }
  if (frontierTask) {
    return "implementation-ready";
  }
  if (nextValueSlice || operatingGoal) {
    return "frontier-definition-needed";
  }
  return "no-frontier";
}

function buildRecommendedAction({ staleReleaseTasks, staleAlignment, frontierTask, nextValueSlice, projectRoot }) {
  if (staleReleaseTasks.length > 0) {
    const task = staleReleaseTasks[0];
    return {
      recommended_action: `Reconcile stale shipped-release task ${task.payload.task_id}: ${task.payload.title}`,
      rationale: "Open implementation work still points at a release that has already shipped.",
      artifact_ref: path.relative(projectRoot, task.filePath)
    };
  }
  if (staleAlignment) {
    return {
      recommended_action: "Refresh roadmap guidance from the current live frontier instead of the stale alignment pulse.",
      rationale: "The saved alignment pulse points at tasks that are no longer current open work.",
      artifact_ref: ".aof/context/active/alignment-pulse.json"
    };
  }
  if (frontierTask) {
    return {
      recommended_action: `Start ${frontierTask.payload.task_id}: ${frontierTask.payload.title}`,
      rationale: "This is the best open task aligned with the current operating goal and next release frontier.",
      artifact_ref: path.relative(projectRoot, frontierTask.filePath)
    };
  }
  return {
    recommended_action: nextValueSlice
      ? `Open an implementation task for the current frontier: ${nextValueSlice}`
      : "Define the next operating frontier.",
    rationale: "No current open implementation task is aligned to the current operating goal.",
    artifact_ref: ".aof/goals/next-value-slice.json"
  };
}

export async function loadSituationAssessmentSummary(projectRoot) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeRoot = path.join(aofRoot, "context", "active");
  const goalsRoot = path.join(aofRoot, "goals");

  const [activeReleaseRecord, nextValueSlice, operatingGoal, alignmentPulse, taskSets] = await Promise.all([
    loadActiveReleaseManifest(projectRoot),
    maybeReadJson(path.join(goalsRoot, "next-value-slice.json"), "next value slice"),
    maybeReadJson(path.join(goalsRoot, "operating-goal.json"), "operating goal"),
    maybeReadJson(path.join(activeRoot, "alignment-pulse.json"), "alignment pulse"),
    loadTaskSets(projectRoot)
  ]);

  const openTasks = taskSets.groups.find((group) => group.status === "open")?.tasks ?? [];
  const activeReleaseTrack = normalizeTrackLabel(activeReleaseRecord?.manifest.release_version);
  const staleReleaseTasks = openTasks.filter((entry) => inferRoadmapTrack(entry.payload) === activeReleaseTrack);

  const alignmentIds = Array.isArray(alignmentPulse?.prioritized_task_ids) ? alignmentPulse.prioritized_task_ids : [];
  const activeAlignmentEntries = alignmentIds
    .map((taskId) => taskSets.byId.get(taskId))
    .filter(Boolean)
    .filter((entry) => entry.status === "open" || entry.status === "assigned");
  const frontierTask = pickFrontierTask(
    openTasks,
    activeReleaseTrack,
    nextValueSlice?.content ?? "",
    operatingGoal?.content ?? "",
    activeAlignmentEntries
  );
  const staleAlignment = alignmentIds.length > 0 && activeAlignmentEntries.length === 0
    ? {
        code: "stale-alignment-pulse",
        severity: "warning",
        summary: "The stored alignment pulse points at tasks that are no longer current open work.",
        artifact_ref: ".aof/context/active/alignment-pulse.json"
      }
    : null;

  const conflicts = [];
  if (staleReleaseTasks.length > 0) {
    conflicts.push({
      code: "shipped-release-task-open",
      severity: "critical",
      summary: "An open task still targets the release that is already shipped.",
      artifact_ref: path.relative(projectRoot, staleReleaseTasks[0].filePath)
    });
  }
  if (staleAlignment) {
    conflicts.push(staleAlignment);
  }

  const targetTrack = extractTrackFromText(nextValueSlice?.content ?? "") ?? extractTrackFromText(operatingGoal?.content ?? "");
  if (targetTrack && frontierTask && inferRoadmapTrack(frontierTask.payload) !== targetTrack) {
    conflicts.push({
      code: "frontier-task-mismatch",
      severity: "warning",
      summary: "The best current open task does not match the track named by the current goal or slice.",
      artifact_ref: path.relative(projectRoot, frontierTask.filePath)
    });
  }

  const recommendedAction = buildRecommendedAction({
    staleReleaseTasks,
    staleAlignment,
    frontierTask,
    nextValueSlice: nextValueSlice?.content ?? "",
    projectRoot
  });

  return {
    artifact_type: "situation-assessment",
    generated_at: new Date().toISOString(),
    project_root: projectRoot,
    active_release_version: activeReleaseRecord?.manifest.release_version ?? null,
    active_release_track: activeReleaseTrack,
    operating_goal: operatingGoal?.content ?? null,
    next_value_slice: nextValueSlice?.content ?? null,
    current_runtime_stage: deriveCurrentStage({
      staleReleaseTasks,
      frontierTask,
      nextValueSlice: nextValueSlice?.content ?? "",
      operatingGoal: operatingGoal?.content ?? ""
    }),
    primary_frontier_task: summarizeTaskEntry(frontierTask, projectRoot),
    stale_release_tasks: staleReleaseTasks.map((entry) => summarizeTaskEntry(entry, projectRoot)),
    current_truth_conflicts: conflicts,
    operator_alignment: {
      question: "What is the highest-leverage operating move now?",
      answer: recommendedAction.recommended_action,
      prioritized_task_ids: frontierTask ? [frontierTask.payload.task_id] : [],
      scale_direction: frontierTask
        ? `Prioritize ${frontierTask.payload.task_id} while keeping Mission Control, roadmap guidance, and open tasks aligned with the same frontier.`
        : "Define or reconcile the next frontier before expanding execution."
    },
    recommended_action: recommendedAction
  };
}

export async function situationAssessCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const summary = await loadSituationAssessmentSummary(projectRoot);
  await validateWithBundledSchema(summary, "aof-situation-assessment.schema.json", "situation assessment");

  let artifactPath = null;
  if (options.artifactPath) {
    artifactPath = await writeJsonArtifact(options.artifactPath, summary);
  }

  return {
    ok: true,
    artifactPath,
    summary
  };
}
