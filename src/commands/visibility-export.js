import fs from "node:fs/promises";
import path from "node:path";

import { organizationStatusCommand } from "./organization-status.js";
import { organizationAnalyticsSnapshotCommand } from "./organization-analytics-snapshot.js";
import { learningLoopSnapshotCommand } from "./learning-loop-snapshot.js";
import { metricsSnapshotCommand } from "./metrics-snapshot.js";
import { roadmapStatusCommand } from "./roadmap-status.js";
import { resolveAofRoot } from "../runtime/project-memory.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";

async function readJson(filePath, label) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function listTaskFiles(dirPath) {
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

async function listLatestDoneTasks(aofRoot, limit = 3) {
  const taskPaths = await listTaskFiles(path.join(aofRoot, "tasks", "done"));
  const tasks = await Promise.all(taskPaths.map((taskPath) => readJson(taskPath, `task ${path.basename(taskPath)}`)));
  return tasks
    .sort((left, right) => String(right.updated_at ?? "").localeCompare(String(left.updated_at ?? "")))
    .slice(0, limit);
}

function pickCurrentVisibilityTask(roadmapStatus) {
  const v26Tasks = Array.isArray(roadmapStatus.release_tracks?.["v2.6"]) ? roadmapStatus.release_tracks["v2.6"] : [];
  return v26Tasks.find((task) => task.status === "open" || task.status === "assigned") ?? null;
}

function buildStatusCard({
  currentTask,
  nextValueSlice,
  metricsArtifactRef,
  analytics
}) {
  return {
    view_type: "status_card",
    as_of: analytics.generated_at,
    usage_level: "runtime-backed",
    current_phase: currentTask?.title ?? "organization_operating",
    current_goal: nextValueSlice ?? "No next value slice is currently projected.",
    owner: "AOF Runtime",
    open_signals: analytics.observations.filter((entry) => entry !== "No immediate organization bottleneck was detected from the current local artifact set."),
    next_checkpoint: currentTask?.title ?? nextValueSlice ?? "Review the next open organization task.",
    latest_artifact_ref: metricsArtifactRef,
    runtime_evidence_state: "present"
  };
}

function buildTimelineEntries({
  nextValueSlice,
  nextValueUpdatedAt,
  metrics,
  analytics,
  doneTasks
}) {
  const entries = [];

  if (nextValueSlice && nextValueUpdatedAt) {
    entries.push({
      at: nextValueUpdatedAt,
      actor: "AOF Runtime",
      event_type: "next_value_slice_updated",
      summary: nextValueSlice,
      rationale: "Project memory was updated to reflect the current operating focus.",
      next: "Project the current slice into operator visibility outputs.",
      refs: [".aof/goals/next-value-slice.json"]
    });
  }

  entries.push({
    at: metrics.generated_at,
    actor: "Verification Team",
    event_type: "metrics_snapshot",
    summary: `Allocation review load is ${metrics.observed_metrics.find((entry) => entry.metric_key === "allocation-review-load")?.value ?? 0}.`,
    rationale: "The current runtime metrics summarize review pressure and task inventory from live artifacts.",
    next: "Use the visibility packet to inspect operator-facing runtime health.",
    refs: [".aof/context/active/metrics-snapshot.json"]
  });

  entries.push({
    at: analytics.generated_at,
    actor: "Operations Council",
    event_type: "organization_analytics",
    summary: analytics.observations[0] ?? "No immediate organization bottleneck was detected.",
    rationale: "Organization analytics compress current task, dependency, contract, and escalation health.",
    next: "Review the highest-leverage open release task.",
    refs: [".aof/context/active/organization-analytics.json"]
  });

  for (const task of doneTasks) {
    entries.push({
      at: task.updated_at ?? task.done_at ?? task.created_at ?? metrics.generated_at,
      actor: "AOF Runtime",
      event_type: "task_completed",
      summary: task.title,
      rationale: "Completed tasks show the latest closed release work in the runtime task archive.",
      next: "Continue with the next open bridge-release task.",
      refs: [`.aof/tasks/done/${task.task_id}.json`]
    });
  }

  return entries
    .sort((left, right) => String(right.at).localeCompare(String(left.at)))
    .slice(0, 6);
}

function buildFlowSnapshot(hasOpenV26Task) {
  const nodes = [
    { id: "operator_surfaces", label: "operator_surfaces", state: "done" },
    { id: "execution_contracts", label: "execution_contracts", state: "done" },
    { id: "governed_allocation", label: "governed_allocation", state: "done" },
    { id: "visibility_projection", label: "visibility_projection", state: hasOpenV26Task ? "current" : "done" },
    { id: "runtime_loop_proof", label: "runtime_loop_proof", state: hasOpenV26Task ? "pending" : "current" }
  ];

  const edges = [
    { from: "operator_surfaces", to: "execution_contracts", reason: "operator model became execution-aware" },
    { from: "execution_contracts", to: "governed_allocation", reason: "execution artifacts enabled governed assignment planning" },
    { from: "governed_allocation", to: "visibility_projection", reason: "allocation state should become operator-visible automatically" },
    { from: "visibility_projection", to: "runtime_loop_proof", reason: "runtime proof should consume the same inspectable visibility layer" }
  ];

  return {
    view_type: "flow_snapshot",
    nodes,
    edges,
    current_node: hasOpenV26Task ? "visibility_projection" : "runtime_loop_proof",
    ordered_nodes: nodes
  };
}

export async function visibilityExportCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const artifactDir = path.resolve(options.artifactDir || path.join(aofRoot, "artifacts", "visibility", "current"));

  const [organizationStatus, roadmapStatus, metricsResult, analyticsResult, learningLoopResult, doneTasks] = await Promise.all([
    organizationStatusCommand({ project: projectRoot }),
    roadmapStatusCommand({ project: projectRoot }),
    metricsSnapshotCommand({ project: projectRoot }),
    organizationAnalyticsSnapshotCommand({ project: projectRoot }),
    learningLoopSnapshotCommand({ project: projectRoot }),
    listLatestDoneTasks(aofRoot)
  ]);

  const currentTask = pickCurrentVisibilityTask(roadmapStatus);
  const nextValueSlice = organizationStatus.goals.next_value_slice;
  const nextValueUpdatedAt = learningLoopResult.payload.current_next_value_slice?.updated_at ?? metricsResult.payload.generated_at;
  const metricsArtifactRef = path.relative(projectRoot, metricsResult.artifactPath);

  const statusCard = buildStatusCard({
    currentTask,
    nextValueSlice,
    metricsArtifactRef,
    analytics: analyticsResult.payload
  });
  const timelineFeed = {
    view_type: "timeline_feed",
    entries: buildTimelineEntries({
      nextValueSlice,
      nextValueUpdatedAt,
      metrics: metricsResult.payload,
      analytics: analyticsResult.payload,
      doneTasks
    })
  };
  const flowSnapshot = buildFlowSnapshot(Boolean(currentTask));

  await validateWithBundledSchema(statusCard, "aof-status-card-view.schema.json", "status card view");
  await validateWithBundledSchema(timelineFeed, "aof-timeline-feed-view.schema.json", "timeline feed view");
  await validateWithBundledSchema(flowSnapshot, "aof-flow-snapshot-view.schema.json", "flow snapshot view");

  const statusPath = await writeJsonArtifact(path.join(artifactDir, "status-card.json"), statusCard);
  const timelinePath = await writeJsonArtifact(path.join(artifactDir, "timeline-feed.json"), timelineFeed);
  const flowPath = await writeJsonArtifact(path.join(artifactDir, "flow-snapshot.json"), flowSnapshot);

  return {
    ok: true,
    projectRoot,
    artifactDir,
    statusPath,
    timelinePath,
    flowPath,
    payloads: {
      status_card: statusCard,
      timeline_feed: timelineFeed,
      flow_snapshot: flowSnapshot
    }
  };
}
