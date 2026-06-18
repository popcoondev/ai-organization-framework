import path from "node:path";

import { resolveAofRoot } from "../runtime/project-paths.js";
import { TASK_STATUSES, listJsonFiles, maybeReadJson, readJson } from "./operator-surface-helpers.js";
import { loadActiveReleaseManifest } from "./release-state-helpers.js";
import { inferRoadmapTrack, loadSituationAssessmentSummary } from "./situation-assess.js";

async function listTasksForStatus(tasksRoot, status) {
  const filePaths = await listJsonFiles(path.join(tasksRoot, status));
  return Promise.all(filePaths.map((filePath) => readJson(filePath, `task ${path.basename(filePath)}`)));
}

function toTaskSummary(task, status) {
  return {
    task_id: task.task_id,
    title: task.title,
    status,
    updated_at: task.updated_at ?? null
  };
}

export async function roadmapStatusCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const goalsRoot = path.join(aofRoot, "goals");

  const [nextValueSlice, allTasks, situation] = await Promise.all([
    maybeReadJson(path.join(goalsRoot, "next-value-slice.json"), "next value slice"),
    Promise.all(TASK_STATUSES.map(async (status) => ({
      status,
      tasks: await listTasksForStatus(tasksRoot, status)
    }))),
    loadSituationAssessmentSummary(projectRoot)
  ]);
  const activeReleaseRecord = await loadActiveReleaseManifest(projectRoot);

  const grouped = {
    "v2.3": [],
    "v2.4": [],
    "v2.5": [],
    "v2.6": [],
    "v3.0": [],
    "v3.4": [],
    "v3.5": [],
    "v3.6": [],
    "v3.7": [],
    unmapped: []
  };

  for (const group of allTasks) {
    for (const task of group.tasks) {
      const track = inferRoadmapTrack(task);
      if (!grouped[track]) {
        grouped[track] = [];
      }
      grouped[track].push(toTaskSummary(task, group.status));
    }
  }

  return {
    ok: true,
    projectRoot,
    roadmap_refs: {
      roadmap: "docs/vnext-roadmap.md",
      release_plan: "docs/vnext-release-plan.md",
      current_release_definition: activeReleaseRecord?.manifest.release_definition_ref ?? "docs/v3.0-release-definition.md"
    },
    active_release: activeReleaseRecord?.manifest ?? null,
    next_value_slice: nextValueSlice?.content ?? null,
    alignment: situation.operator_alignment,
    release_tracks: grouped
  };
}
