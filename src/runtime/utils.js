import fs from "node:fs/promises";
import path from "node:path";

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`.toUpperCase();
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJsonArtifact(filePath, payload) {
  const resolvedPath = path.resolve(filePath);
  await ensureDir(path.dirname(resolvedPath));
  await fs.writeFile(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return resolvedPath;
}

export async function writeTextArtifact(filePath, content) {
  const resolvedPath = path.resolve(filePath);
  await ensureDir(path.dirname(resolvedPath));
  const normalizedContent = content.endsWith("\n") ? content : `${content}\n`;
  await fs.writeFile(resolvedPath, normalizedContent, "utf8");
  return resolvedPath;
}

export function deriveSessionLockPath(sessionPath) {
  return path.resolve(`${sessionPath}.lock`);
}

export async function withSessionMutationLock(sessionPath, operation) {
  const lockPath = deriveSessionLockPath(sessionPath);
  let handle;

  try {
    handle = await fs.open(lockPath, "wx");
  } catch (error) {
    if (error && error.code === "EEXIST") {
      throw new Error(
        `Concurrent mutation is not allowed for this session. Wait until the current session update completes: ${sessionPath}`
      );
    }
    throw error;
  }

  try {
    return await operation();
  } finally {
    try {
      await handle?.close();
    } finally {
      await fs.rm(lockPath, { force: true });
    }
  }
}
