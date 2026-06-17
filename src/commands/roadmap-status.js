import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";
import { TASK_STATUSES } from "./operator-surface-helpers.js";
import { loadActiveReleaseManifest } from "./release-state-helpers.js";

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

async function listTasksForStatus(tasksRoot, status) {
  try {
    const entries = await fs.readdir(path.join(tasksRoot, status), { withFileTypes: true });
    const filePaths = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(tasksRoot, status, entry.name))
      .sort();
    return Promise.all(filePaths.map((filePath) => readJson(filePath, `task ${path.basename(filePath)}`)));
  } catch {
    return [];
  }
}

function inferRoadmapTrack(task) {
  const title = String(task.title ?? "");
  const description = String(task.description ?? "");
  const triageNotes = String(task.triage_notes ?? "");
  const joined = `${title}\n${description}\n${triageNotes}`;

  if (/v3\.0|backend-neutral organization runtime|parent-child orchestration|parent\/child orchestration|orchestration contracts|role join/i.test(joined)) {
    return "v3.0";
  }
  if (/v2\.6|visibility outputs|visibility projection|runtime-backed visibility|status_card|timeline_feed|flow_snapshot|human visibility layer/i.test(joined)) {
    return "v2.6";
  }
  if (/v2\.5|allocation|policy evaluation|resource claim|resource reservation|staffing/i.test(joined)) {
    return "v2.5";
  }
  if (/task creation concurrency-safe|unique task lifecycle|operator-facing organization surfaces|organization-status and roadmap-status/i.test(joined)) {
    return "v2.3";
  }
  if (/discovery layer|discovery-to-delivery|breakthrough-pattern|assumption map|anomaly log/i.test(joined)) {
    return "v3.0";
  }
  if (/v2\.3|operator-facing|organization surfaces/i.test(joined)) {
    return "v2.3";
  }
  if (/v2\.4|execution packet|council review|execution lineage/i.test(joined)) {
    return "v2.4";
  }
  return "unmapped";
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
  const activeRoot = path.join(aofRoot, "context", "active");
  const goalsRoot = path.join(aofRoot, "goals");

  const [alignmentPulse, nextValueSlice, allTasks] = await Promise.all([
    maybeReadJson(path.join(activeRoot, "alignment-pulse.json"), "alignment pulse"),
    maybeReadJson(path.join(goalsRoot, "next-value-slice.json"), "next value slice"),
    Promise.all(TASK_STATUSES.map(async (status) => ({
      status,
      tasks: await listTasksForStatus(tasksRoot, status)
    })))
  ]);
  const activeReleaseRecord = await loadActiveReleaseManifest(projectRoot);

  const grouped = {
    "v2.3": [],
    "v2.4": [],
    "v2.5": [],
    "v2.6": [],
    "v3.0": [],
    unmapped: []
  };

  for (const group of allTasks) {
    for (const task of group.tasks) {
      grouped[inferRoadmapTrack(task)].push(toTaskSummary(task, group.status));
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
    alignment: alignmentPulse
      ? {
          question: alignmentPulse.question,
          answer: alignmentPulse.answer,
          prioritized_task_ids: alignmentPulse.prioritized_task_ids ?? [],
          scale_direction: alignmentPulse.scale_direction ?? null
        }
      : null,
    release_tracks: grouped
  };
}
