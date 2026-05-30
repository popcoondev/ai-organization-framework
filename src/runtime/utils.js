import fs from "node:fs/promises";

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
