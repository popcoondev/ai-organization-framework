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
  const tempPath = `${resolvedPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, resolvedPath);
  return resolvedPath;
}

export async function writeTextArtifact(filePath, content) {
  const resolvedPath = path.resolve(filePath);
  await ensureDir(path.dirname(resolvedPath));
  const normalizedContent = content.endsWith("\n") ? content : `${content}\n`;
  const tempPath = `${resolvedPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await fs.writeFile(tempPath, normalizedContent, "utf8");
  await fs.rename(tempPath, resolvedPath);
  return resolvedPath;
}

export function deriveSessionLockPath(sessionPath) {
  return path.resolve(`${sessionPath}.lock`);
}

export async function withFileMutationLock(lockPath, errorMessage, operation, options = {}) {
  return withFileMutationLockOptions(lockPath, errorMessage, operation, options);
}

async function withFileMutationLockOptions(lockPath, errorMessage, operation, options = {}) {
  const wait = options.wait ?? false;
  const retryDelayMs = options.retryDelayMs ?? 10;
  const timeoutMs = options.timeoutMs ?? 2000;
  const startedAt = Date.now();
  let handle;

  while (!handle) {
    try {
      handle = await fs.open(lockPath, "wx");
    } catch (error) {
      if (!(error && error.code === "EEXIST")) {
        throw error;
      }
      if (!wait || Date.now() - startedAt >= timeoutMs) {
        throw new Error(errorMessage);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
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

export async function withSessionMutationLock(sessionPath, operation) {
  const lockPath = deriveSessionLockPath(sessionPath);
  return withFileMutationLockOptions(
    lockPath,
    `Concurrent mutation is not allowed for this session. Wait until the current session update completes: ${sessionPath}`,
    operation,
    { wait: false }
  );
}
