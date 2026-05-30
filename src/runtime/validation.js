import path from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertObject(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object.`);
}

export function assertString(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be a non-empty string.`);
}

export function assertStringArray(value, label) {
  assert(Array.isArray(value) && value.length > 0, `${label} must be a non-empty array.`);
  for (const item of value) {
    assertString(item, `${label} item`);
  }
}

export function assertRelativeAofPath(value, label) {
  assertString(value, label);
  assert(!path.isAbsolute(value), `${label} must be a relative path under .aof/.`);
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  assert(!normalized.startsWith("../") && normalized !== "..", `${label} must not escape .aof/.`);
}
