import {
  buildCommandRegistryPayload,
  COMMAND_REGISTRY_DETAIL_REF,
  getCommandCatalogMetadata
} from "./command-registry-payload.js";

const COMMAND_SPECS = [
  ["run", "./commands/run.js", "runCommand"],
  ["init", "./commands/init-project.js", "initProjectCommand"],
  ["upgrade", "./commands/upgrade-project.js", "upgradeProjectCommand"],
  ["answer", "./commands/answer.js", "answerCommand"],
  ["outcome-report", "./commands/outcome-report.js", "outcomeReportCommand"],
  ["allocation-plan-record", "./commands/allocation-plan-record.js", "allocationPlanRecordCommand"],
  ["policy-evaluation-report", "./commands/policy-evaluation-report.js", "policyEvaluationReportCommand"],
  ["resource-claim-record", "./commands/resource-claim-record.js", "resourceClaimRecordCommand"],
  ["task-open", "./commands/task-open.js", "taskOpenCommand"],
  ["task-update", "./commands/task-update.js", "taskUpdateCommand"],
  ["goal-project", "./commands/goal-project.js", "goalProjectCommand"],
  ["confirmation-window-record", "./commands/confirmation-window-record.js", "confirmationWindowRecordCommand"],
  ["alignment-pulse", "./commands/alignment-pulse.js", "alignmentPulseCommand"],
  ["cadence-trigger-guide", "./commands/cadence-trigger-guide.js", "cadenceTriggerGuideCommand"],
  ["cadence-follow-through", "./commands/cadence-follow-through.js", "cadenceFollowThroughCommand"],
  ["self-audit-record", "./commands/self-audit-record.js", "selfAuditRecordCommand"],
  ["retire-candidate-review", "./commands/retire-candidate-review.js", "retireCandidateReviewCommand"],
  ["live-verify", "./commands/live-verify.js", "liveVerifyCommand"],
  ["decision-verify", "./commands/decision-verify.js", "decisionVerifyCommand"],
  ["decision-register", "./commands/decision-register.js", "decisionRegisterCommand"],
  ["discovery-question-set-record", "./commands/discovery-question-set-record.js", "discoveryQuestionSetRecordCommand"],
  ["breakthrough-pattern-record", "./commands/breakthrough-pattern-record.js", "breakthroughPatternRecordCommand"],
  ["breakthrough-library-register", "./commands/breakthrough-library-register.js", "breakthroughLibraryRegisterCommand"],
  ["assumption-map-record", "./commands/assumption-map-record.js", "assumptionMapRecordCommand"],
  ["anomaly-log-record", "./commands/anomaly-log-record.js", "anomalyLogRecordCommand"],
  ["discovery-judgment-packet", "./commands/discovery-judgment-packet.js", "discoveryJudgmentPacketCommand"],
  ["discovery-handoff-record", "./commands/discovery-handoff-record.js", "discoveryHandoffRecordCommand"],
  ["discovery-handoff-benchmark", "./commands/discovery-handoff-benchmark.js", "discoveryHandoffBenchmarkCommand"],
  ["release-state-refresh", "./commands/release-state-refresh.js", "releaseStateRefreshCommand"],
  ["release-state-audit", "./commands/release-state-audit.js", "releaseStateAuditCommand"],
  ["problem-statement-record", "./commands/problem-statement-record.js", "problemStatementRecordCommand"],
  ["value-hypothesis-record", "./commands/value-hypothesis-record.js", "valueHypothesisRecordCommand"],
  ["alternative-analysis-record", "./commands/alternative-analysis-record.js", "alternativeAnalysisRecordCommand"],
  ["experiment-proposal-record", "./commands/experiment-proposal-record.js", "experimentProposalRecordCommand"],
  ["project-charter-record", "./commands/project-charter-record.js", "projectCharterRecordCommand"],
  ["need-validation-record", "./commands/need-validation-record.js", "needValidationRecordCommand"],
  ["need-validation-advance", "./commands/need-validation-advance.js", "needValidationAdvanceCommand"],
  ["need-validation-benchmark", "./commands/need-validation-benchmark.js", "needValidationBenchmarkCommand"],
  ["learning-loop-snapshot", "./commands/learning-loop-snapshot.js", "learningLoopSnapshotCommand"],
  ["contract-register", "./commands/contract-register.js", "contractRegisterCommand"],
  ["dependency-graph", "./commands/dependency-graph.js", "dependencyGraphCommand"],
  ["metrics-snapshot", "./commands/metrics-snapshot.js", "metricsSnapshotCommand"],
  ["organization-audit", "./commands/organization-audit.js", "organizationAuditCommand"],
  ["organization-status", "./commands/organization-status.js", "organizationStatusCommand"],
  ["organization-analytics-snapshot", "./commands/organization-analytics-snapshot.js", "organizationAnalyticsSnapshotCommand"],
  ["organization-verify", "./commands/organization-verify.js", "organizationVerifyCommand"],
  ["roadmap-status", "./commands/roadmap-status.js", "roadmapStatusCommand"],
  ["verify-archive", "./commands/verify-archive.js", "verifyArchiveCommand"],
  ["verify-archive-dashboard", "./commands/verify-archive-dashboard.js", "verifyArchiveDashboardCommand"],
  ["verify-archive-log", "./commands/verify-archive-log.js", "verifyArchiveLogCommand"],
  ["verify-history", "./commands/verify-history.js", "verifyHistoryCommand"],
  ["verify-log", "./commands/verify-log.js", "verifyLogCommand"],
  ["verify-lineage", "./commands/verify-lineage.js", "verifyLineageCommand"],
  ["verify-dashboard", "./commands/verify-dashboard.js", "verifyDashboardCommand"],
  ["verify-dashboard-log", "./commands/verify-dashboard-log.js", "verifyDashboardLogCommand"],
  ["verify-dashboard-index", "./commands/verify-dashboard-index.js", "verifyDashboardIndexCommand"],
  ["visibility-export", "./commands/visibility-export.js", "visibilityExportCommand"],
  ["mission-control-benchmark", "./commands/mission-control-benchmark.js", "missionControlBenchmarkCommand"],
  ["visibility-serve", "./commands/visibility-serve.js", "visibilityServeCommand"],
  ["packet", "./commands/packet.js", "packetCommand"],
  ["signal", "./commands/signal.js", "signalCommand"],
  ["council", "./commands/council.js", "councilCommand"],
  ["council-exec", "./commands/council-exec.js", "councilExecCommand"],
  ["provider-check", "./commands/provider-check.js", "providerCheckCommand"],
  ["escalation-resolve", "./commands/escalation-resolve.js", "escalationResolveCommand"],
  ["role-result-record", "./commands/role-result-record.js", "roleResultRecordCommand"],
  ["role-join-record", "./commands/role-join-record.js", "roleJoinRecordCommand"],
  ["team-output-record", "./commands/team-output-record.js", "teamOutputRecordCommand"],
  ["council-review-packet", "./commands/council-review-packet.js", "councilReviewPacketCommand"],
  ["runtime-loop-proof", "./commands/runtime-loop-proof.js", "runtimeLoopProofCommand"],
  ["execution-lineage", "./commands/execution-lineage.js", "executionLineageCommand"],
  ["runtime-discipline-benchmark", "./commands/runtime-discipline-benchmark.js", "runtimeDisciplineBenchmarkCommand"],
  ["command-registry-refresh", "./commands/command-registry-refresh.js", "commandRegistryRefreshCommand"],
  ["command-register", "./commands/command-register.js", "commandRegisterCommand"],
  ["command-routing-audit", "./commands/command-routing-audit.js", "commandRoutingAuditCommand"]
];

export function getCommandCatalog() {
  const metadataByCommand = new Map(getCommandCatalogMetadata().map((entry) => [entry.command, entry]));
  return COMMAND_SPECS.map(([command, handlerPath, exportName]) => {
    const metadata = metadataByCommand.get(command);
    return {
      command,
      handlerPath,
      exportName,
      category: metadata.category,
      purpose: metadata.purpose,
      operator_path: metadata.operator_path,
      top_command: metadata.top_command,
      inputs: metadata.inputs,
      outputs: metadata.outputs,
      detail_ref: metadata.detail_ref
    };
  }).sort((left, right) => left.command.localeCompare(right.command));
}

export function buildCommandHandlers() {
  const handlers = {};
  for (const entry of getCommandCatalog()) {
    const importPath = entry.handlerPath.startsWith("./commands/")
      ? `../commands/${entry.handlerPath.slice("./commands/".length)}`
      : entry.handlerPath;
    handlers[entry.command] = {
      load: () => import(new URL(importPath, import.meta.url)),
      exportName: entry.exportName
    };
  }
  handlers["visibility-serve"].formatResult = (result) => ({
    ok: result.ok,
    host: result.host,
    port: result.port,
    title: result.title,
    url: result.url,
    sources: result.sources
  });
  return handlers;
}

export { buildCommandRegistryPayload, COMMAND_REGISTRY_DETAIL_REF };
