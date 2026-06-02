import fs from "node:fs/promises";
import path from "node:path";

import { ensureDir, nowIso, writeJsonArtifact } from "./utils.js";
import { validateWithBundledSchema } from "./validation.js";

const TASK_DIRS = ["open", "assigned", "done", "archived", "retired"];

const GOAL_TYPE_TO_FILE = {
  "north-star": "north-star.json",
  "operating-goal": "operating-goal.json",
  "next-value-slice": "next-value-slice.json"
};

const RECENT_CONFIRMATION_WINDOW_FILE = "recent-confirmation-window.json";
const ALIGNMENT_PULSE_FILE = "alignment-pulse.json";

export function resolveAofRoot(projectRoot) {
  return path.join(path.resolve(projectRoot), ".aof");
}

async function listTaskFiles(tasksRoot) {
  const files = [];
  for (const taskDir of TASK_DIRS) {
    const dirPath = path.join(tasksRoot, taskDir);
    await ensureDir(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.startsWith("TASK-") && entry.name.endsWith(".json")) {
        files.push(path.join(dirPath, entry.name));
      }
    }
  }
  return files;
}

async function listTaskFilesForStatus(tasksRoot, status) {
  const dirPath = path.join(tasksRoot, status);
  await ensureDir(dirPath);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith("TASK-") && entry.name.endsWith(".json"))
    .map((entry) => path.join(dirPath, entry.name));
}

async function findTaskFile(tasksRoot, taskId) {
  const files = await listTaskFiles(tasksRoot);
  return files.find((filePath) => path.basename(filePath) === `${taskId}.json`) ?? null;
}

async function nextTaskId(tasksRoot) {
  const files = await listTaskFiles(tasksRoot);
  let maxId = 0;
  for (const filePath of files) {
    const match = path.basename(filePath).match(/^TASK-(\d+)\.json$/);
    if (!match) {
      continue;
    }
    maxId = Math.max(maxId, Number(match[1]));
  }
  return `TASK-${String(maxId + 1).padStart(3, "0")}`;
}

export async function createOpenTask({
  projectRoot,
  title,
  description = null,
  origin = null,
  orchestratorSessionId = null,
  assignedSessionIds = [],
  relatedDecisionRecordId = null,
  operatingGoalRef = null,
  triageNotes = null
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const openRoot = path.join(tasksRoot, "open");
  await ensureDir(openRoot);
  const taskId = await nextTaskId(tasksRoot);
  const timestamp = nowIso();
  const payload = {
    task_id: taskId,
    title,
    description,
    status: "open",
    origin,
    orchestrator_session_id: orchestratorSessionId,
    assigned_session_ids: assignedSessionIds,
    related_decision_record_id: relatedDecisionRecordId,
    operating_goal_ref: operatingGoalRef,
    created_at: timestamp,
    updated_at: timestamp,
    assigned_at: null,
    done_at: null,
    retired_at: null,
    last_triaged_at: timestamp,
    triage_notes: triageNotes
  };

  await validateWithBundledSchema(payload, "aof-task.schema.json", "task");
  const taskPath = path.join(openRoot, `${taskId}.json`);
  await writeJsonArtifact(taskPath, payload);
  return {
    ok: true,
    taskId,
    taskPath,
    payload
  };
}

export async function updateTaskArtifact({
  projectRoot,
  taskId,
  status = null,
  assignedSessionIds,
  relatedDecisionRecordId,
  triageNotes,
  lastTriagedAt
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const taskPath = await findTaskFile(tasksRoot, taskId);
  if (!taskPath) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const current = JSON.parse(await fs.readFile(taskPath, "utf8"));
  const nextStatus = status ?? current.status;
  if (!TASK_DIRS.includes(nextStatus)) {
    throw new Error(`Unsupported task status: ${nextStatus}`);
  }

  const timestamp = nowIso();
  const payload = {
    ...current,
    status: nextStatus,
    assigned_session_ids: assignedSessionIds ?? current.assigned_session_ids ?? [],
    related_decision_record_id: relatedDecisionRecordId ?? current.related_decision_record_id ?? null,
    triage_notes: triageNotes ?? current.triage_notes ?? null,
    updated_at: timestamp,
    assigned_at: nextStatus === "assigned"
      ? current.assigned_at ?? timestamp
      : current.assigned_at ?? null,
    done_at: nextStatus === "done"
      ? current.done_at ?? timestamp
      : current.done_at ?? null,
    retired_at: nextStatus === "retired"
      ? current.retired_at ?? timestamp
      : current.retired_at ?? null,
    last_triaged_at: lastTriagedAt ?? current.last_triaged_at ?? null
  };

  await validateWithBundledSchema(payload, "aof-task.schema.json", "task");
  const nextPath = path.join(tasksRoot, nextStatus, `${taskId}.json`);
  await ensureDir(path.dirname(nextPath));
  await writeJsonArtifact(nextPath, payload);
  if (path.resolve(taskPath) !== path.resolve(nextPath)) {
    await fs.rm(taskPath, { force: true });
  }

  return {
    ok: true,
    taskId,
    taskPath: nextPath,
    payload
  };
}

export async function listTaskArtifacts({
  projectRoot,
  status = "open"
}) {
  if (!TASK_DIRS.includes(status)) {
    throw new Error(`Unsupported task status: ${status}`);
  }
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const files = await listTaskFilesForStatus(tasksRoot, status);
  const payloads = await Promise.all(
    files.map(async (filePath) => ({
      taskPath: filePath,
      payload: JSON.parse(await fs.readFile(filePath, "utf8"))
    }))
  );
  return {
    ok: true,
    status,
    tasks: payloads
  };
}

export async function writeGoalProjection({
  projectRoot,
  goalType,
  content,
  agreedWithHuman = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  declaredComplete = false
}) {
  const fileName = GOAL_TYPE_TO_FILE[goalType];
  if (!fileName) {
    throw new Error(`Unsupported goal type: ${goalType}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  const goalsRoot = path.join(aofRoot, "goals");
  await ensureDir(goalsRoot);
  const timestamp = nowIso();
  const payload = {
    goal_type: goalType,
    content,
    updated_at: timestamp,
    agreed_with_human: agreedWithHuman,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId,
    declared_complete_at: declaredComplete ? timestamp : null
  };

  await validateWithBundledSchema(payload, "aof-goals.schema.json", "goal projection");
  const goalPath = path.join(goalsRoot, fileName);
  await writeJsonArtifact(goalPath, payload);
  return {
    ok: true,
    goalType,
    goalPath,
    payload
  };
}

export async function loadGoalProjection({ projectRoot, goalType }) {
  const fileName = GOAL_TYPE_TO_FILE[goalType];
  if (!fileName) {
    throw new Error(`Unsupported goal type: ${goalType}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  const goalPath = path.join(aofRoot, "goals", fileName);
  try {
    const raw = await fs.readFile(goalPath, "utf8");
    return {
      ok: true,
      goalType,
      goalPath,
      payload: