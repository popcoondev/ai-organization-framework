import path from "node:path";

export function resolveAofRoot(projectRoot) {
  return path.join(path.resolve(projectRoot), ".aof");
}
