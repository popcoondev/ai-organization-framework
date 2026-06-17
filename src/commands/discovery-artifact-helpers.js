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

export function resolveNeedValidationRoot(projectRoot) {
  return path.join(resolveAofRoot(projectRoot), "artifacts", "need-validation");
}

export function resolveProblemStatementsRoot(projectRoot) {
  return path.join(resolveNeedValidationRoot(projectRoot), "problem-statements");
}

export function resolveValueHypothesesRoot(projectRoot) {
  return path.join(resolveNeedValidationRoot(projectRoot), "value-hypotheses");
}

export function resolveAlternativeAnalysesRoot(projectRoot) {
  return path.join(resolveNeedValidationRoot(projectRoot), "alternative-analyses");
}

export function resolveExperimentProposalsRoot(projectRoot) {
  return path.join(resolveNeedValidationRoot(projectRoot), "experiment-proposals");
}

export function resolveProjectChartersRoot(projectRoot) {
  return path.join(resolveNeedValidationRoot(projectRoot), "project-charters");
}

export function resolveNeedValidationRecordsRoot(projectRoot) {
  return path.join(resolveNeedValidationRoot(projectRoot), "records");
}
