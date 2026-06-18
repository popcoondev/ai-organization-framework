import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "./project-paths.js";
import { nowIso, withFileMutationLock, writeJsonArtifact, ensureDir } from "./utils.js";
import { validateWithBundledSchema } from "./validation.js";

const TASK_DIRS = ["open", "assigned", "done", "archived", "retired"];
const TASK_STATUS_PRIORITY = { open: 0, assigned: 1, done: 2, archived: 3, retired: 4 };

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

async function readTaskRecord(filePath) {
  return {
    filePath,
    payload: JSON.parse(await fs.readFile(filePath, "utf8"))
  };
}

function compareTaskRecords(a, b) {
  const updatedAtA = String(a.payload.updated_at ?? "");
  const updatedAtB = String(b.payload.updated_at ?? "");
  if (updatedAtA !== updatedAtB) {
    return updatedAtB.localeCompare(updatedAtA);
  }
  return (TASK_STATUS_PRIORITY[b.payload.status] ?? -1) - (TASK_STATUS_PRIORITY[a.payload.status] ?? -1);
}

async function buildCanonicalTaskIndex(tasksRoot) {
  const files = await listTaskFiles(tasksRoot);
  const records = await Promise.all(files.map((filePath) => readTaskRecord(filePath)));
  const grouped = new Map();

  for (const record of records) {
    const taskId = record.payload.task_id;
    if (!grouped.has(taskId)) {
      grouped.set(taskId, []);
    }
    grouped.get(taskId).push(record);
  }

  const canonicalIndex = new Map();
  for (const [taskId, candidates] of grouped.entries()) {
    const sorted = [...candidates].sort(compareTaskRecords);
    canonicalIndex.set(taskId, {
      canonical: sorted[0],
      candidates: sorted
    });
  }

  return canonicalIndex;
}

async function listTaskFilesForStatus(tasksRoot, status) {
  const canonicalIndex = await buildCanonicalTaskIndex(tasksRoot);
  return [...canonicalIndex.values()]
    .filter((entry) => entry.canonical.payload.status === status)
    .map((entry) => entry.canonical.filePath);
}

async function findTaskRecord(tasksRoot, taskId) {
  const canonicalIndex = await buildCanonicalTaskIndex(tasksRoot);
  return canonicalIndex.get(taskId) ?? null;
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

function deriveTaskMutationLockPath(tasksRoot) {
  return path.join(tasksRoot, ".task-mutation.lock");
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
  return withFileMutationLock(
    deriveTaskMutationLockPath(tasksRoot),
    `Concurrent task mutation is not allowed for this project. Wait until the current task update completes: ${projectRoot}`,
    async () => {
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
        last_triaged_at: null,
        stale_candidate_at: null,
        retire_candidate_at: null,
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
    },
    { wait: true, retryDelayMs: 10, timeoutMs: 5000 }
  );
}

export async function updateTaskArtifact({
  projectRoot,
  taskId,
  status = null,
  assignedSessionIds,
  relatedDecisionRecordId,
  triageNotes,
  lastTriagedAt,
  staleCandidateAt,
  retireCandidateAt
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  return withFileMutationLock(
    deriveTaskMutationLockPath(tasksRoot),
    `Concurrent task mutation is not allowed for this project. Wait until the current task update completes: ${projectRoot}`,
    async () => {
      const taskRecord = await findTaskRecord(tasksRoot, taskId);
      if (!taskRecord) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const current = taskRecord.canonical.payload;
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
        last_triaged_at: lastTriagedAt ?? current.last_triaged_at ?? null,
        stale_candidate_at: staleCandidateAt !== undefined ? staleCandidateAt : current.stale_candidate_at ?? null,
        retire_candidate_at: retireCandidateAt !== undefined ? retireCandidateAt : current.retire_candidate_at ?? null
      };

      await validateWithBundledSchema(payload, "aof-task.schema.json", "task");
      const nextPath = path.join(tasksRoot, nextStatus, `${taskId}.json`);
      await ensureDir(path.dirname(nextPath));
      await writeJsonArtifact(nextPath, payload);

      for (const candidate of taskRecord.candidates) {
        if (candidate.filePath !== nextPath) {
          await fs.rm(candidate.filePath, { force: true });
        }
      }

      return {
        ok: true,
        taskId,
        taskPath: nextPath,
        payload
      };
    },
    { wait: true, retryDelayMs: 10, timeoutMs: 5000 }
  );
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
