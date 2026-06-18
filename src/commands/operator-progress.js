import fs from "node:fs/promises";
import path from "node:path";

import { organizationStatusCommand } from "./organization-status.js";
import { roadmapStatusCommand } from "./roadmap-status.js";
import { loadSituationAssessmentSummary } from "./situation-assess.js";
import { resolveAofRoot } from "../runtime/project-paths.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";

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

async function readJson(filePath, label) {
  const raw = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function loadLatestDoneTask(aofRoot) {
  const taskPaths = await listJsonFiles(path.join(aofRoot, "tasks", "done"));
  if (taskPaths.length === 0) {
    return null;
  }
  const tasks = await Promise.all(taskPaths.map(async (taskPath) => ({
    taskPath,
    payload: await readJson(taskPath, `task ${path.basename(taskPath)}`)
  })));
  return tasks.sort((left, right) => String(right.payload.done_at ?? right.payload.updated_at ?? "").localeCompare(String(left.payload.done_at ?? left.payload.updated_at ?? "")))[0] ?? null;
}

export function buildOperatorProgressView({
  organizationStatus,
  situation,
  latestDoneTask
}) {
  const frontier = situation.primary_frontier_task;
  const changedItems = [];
  if (latestDoneTask?.payload?.task_id) {
    changedItems.push({
      kind: "completed-task",
      summary: `${latestDoneTask.payload.task_id} completed: ${latestDoneTask.payload.title}`,
      artifact_ref: `.aof/tasks/done/${latestDoneTask.payload.task_id}.json`
    });
  }
  if (frontier?.task_id) {
    changedItems.push({
      kind: "frontier-task",
      summary: `${frontier.task_id} is now the active frontier: ${frontier.title}`,
      artifact_ref: frontier.artifact_ref
    });
  }
  changedItems.push({
    kind: "goal-refresh",
    summary: organizationStatus.goals.next_value_slice,
    artifact_ref: ".aof/goals/next-value-slice.json"
  });

  return {
    view_type: "operator_progress",
    generated_at: situation.generated_at,
    current_checkpoint: {
      stage: situation.current_runtime_stage,
      frontier_task_id: frontier?.task_id ?? null,
      summary: frontier
        ? `${frontier.task_id} is active and the runtime is ${situation.current_runtime_stage}.`
        : `The runtime is ${situation.current_runtime_stage}.`,
      artifact_ref: frontier?.artifact_ref ?? ".aof/goals/next-value-slice.json"
    },
    previous_checkpoint: latestDoneTask
      ? {
          summary: `${latestDoneTask.payload.task_id} was the latest completed checkpoint.`,
          artifact_ref: `.aof/tasks/done/${latestDoneTask.payload.task_id}.json`
        }
      : {
          summary: "No completed checkpoint is currently recorded.",
          artifact_ref: null
        },
    changes_since_last_checkpoint: changedItems,
    progress_answer: {
      what_changed: changedItems.map((item) => item.summary).join(" "),
      why_it_matters: frontier
        ? `${frontier.task_id} now defines the current operating move after the latest completed release step.`
        : "The runtime still needs a concrete current frontier to make progress legible.",
      next_checkpoint: situation.recommended_action?.recommended_action ?? "Define the next checkpoint."
    }
  };
}

export async function operatorProgressCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const artifactPath = path.resolve(
    options.artifactPath || path.join(aofRoot, "artifacts", "visibility", "current", "operator-progress.json")
  );

  const [organizationStatus, roadmapStatus, situation, latestDoneTask] = await Promise.all([
    organizationStatusCommand({ project: projectRoot }),
    roadmapStatusCommand({ project: projectRoot }),
    loadSituationAssessmentSummary(projectRoot),
    loadLatestDoneTask(aofRoot)
  ]);
  void roadmapStatus;

  const progress = buildOperatorProgressView({
    organizationStatus,
    situation,
    latestDoneTask
  });
  await validateWithBundledSchema(progress, "aof-operator-progress-view.schema.json", "operator progress view");

  const writtenArtifactPath = await writeJsonArtifact(artifactPath, progress);
  return {
    ok: true,
    artifactPath: writtenArtifactPath,
    progress
  };
}
