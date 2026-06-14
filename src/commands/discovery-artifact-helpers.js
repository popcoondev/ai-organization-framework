import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";

export function resolveDiscoveryRoot(projectRoot) {
  return path.join(resolveAofRoot(projectRoot), "artifacts", "discovery");
}

export function resolveDiscoveryQuestionSetsRoot(projectRoot) {
  return path.join(resolveDiscoveryRoot(projectRoot), "question-sets");
}

export function resolveBreakthroughPatternsRoot(projectRoot) {
  return path.join(resolveDiscoveryRoot(projectRoot), "breakthrough-patterns");
}

export function resolveAssumptionMapsRoot(projectRoot) {
  return path.join(resolveDiscoveryRoot(projectRoot), "assumption-maps");
}

export function resolveAnomalyLogsRoot(projectRoot) {
  return path.join(resolveDiscoveryRoot(projectRoot), "anomaly-logs");
}

export function resolveDiscoveryHandoffsRoot(projectRoot) {
  return path.join(resolveDiscoveryRoot(projectRoot), "handoffs");
}

export function resolveDiscoveryJudgmentsRoot(projectRoot) {
  return path.join(resolveDiscoveryRoot(projectRoot), "judgments");
}
