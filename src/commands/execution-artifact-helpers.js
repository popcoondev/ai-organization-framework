import path from "node:path";

import { resolveAofRoot } from "../runtime/project-paths.js";
import { listJsonFiles, readJson } from "./operator-surface-helpers.js";

export const EXECUTION_STAGES = ["framing", "planning", "execution", "approval", "review"];

export function resolveExecutionRoot(projectRoot) {
  return path.join(resolveAofRoot(projectRoot), "artifacts", "execution");
}

export function resolveRoleResultsRoot(projectRoot) {
  return path.join(resolveExecutionRoot(projectRoot), "role-results");
}

export function resolveTeamOutputsRoot(projectRoot) {
  return path.join(resolveExecutionRoot(projectRoot), "team-outputs");
}

export function resolveRoleJoinsRoot(projectRoot) {
  return path.join(resolveExecutionRoot(projectRoot), "role-joins");
}

export function resolveCouncilReviewsRoot(projectRoot) {
  return path.join(resolveExecutionRoot(projectRoot), "council-reviews");
}

export async function listExecutionArtifacts(dirPath, label) {
  const jsonPaths = await listJsonFiles(dirPath);
  const records = await Promise.all(
    jsonPaths.map(async (jsonPath) => ({
      filePath: jsonPath,
      payload: await readJson(jsonPath, `${label} ${path.basename(jsonPath)}`)
    }))
  );
  return records.sort((left, right) => {
    const leftAt = left.payload.recorded_at ?? "";
    const rightAt = right.payload.recorded_at ?? "";
    return leftAt.localeCompare(rightAt);
  });
}

export function normalizeArtifactRef(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}
