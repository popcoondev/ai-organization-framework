import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";

export function resolveAllocationRoot(projectRoot) {
  return path.join(resolveAofRoot(projectRoot), "artifacts", "allocation");
}

export function resolveAllocationPlansRoot(projectRoot) {
  return path.join(resolveAllocationRoot(projectRoot), "plans");
}

export function resolvePolicyEvaluationsRoot(projectRoot) {
  return path.join(resolveAllocationRoot(projectRoot), "policy-evaluations");
}

export function resolveResourceClaimsRoot(projectRoot) {
  return path.join(resolveAllocationRoot(projectRoot), "resource-claims");
}
