import fs from "node:fs/promises";
import path from "node:path";

export const TASK_STATUSES = ["open", "assigned", "done", "archived", "retired"];

export async function readJson(filePath, label) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function maybeReadJson(filePath, label) {
  try {
    return await readJson(filePath, label);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listJsonFiles(dirPath) {
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

export async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

export async function loadTaskState(projectRoot) {
  const tasksRoot = path.join(projectRoot, ".aof", "tasks");
  const taskIndex = new Map();

  for (const status of TASK_STATUSES) {
    const filePaths = await listJsonFiles(path.join(tasksRoot, status));
    for (const filePath of filePaths) {
      const payload = await readJson(filePath, `task ${path.basename(filePath)}`);
      const taskId = payload.task_id ?? path.basename(filePath, ".json");
      if (!taskIndex.has(taskId)) {
        taskIndex.set(taskId, []);
      }
      taskIndex.get(taskId).push({
        statusDir: status,
        filePath,
        payload
      });
    }
  }

  return {
    tasksRoot,
    taskIndex
  };
}

export function summarizeDuplicateTasks(taskIndex) {
  return [...taskIndex.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([taskId, entries]) => ({
      task_id: taskId,
      lifecycle_locations: entries.map((entry) => ({
        status_dir: entry.statusDir,
        payload_status: entry.payload.status ?? null,
        file_name: path.basename(entry.filePath)
      }))
    }))
    .sort((a, b) => a.task_id.localeCompare(b.task_id));
}
