export const COMMAND_REGISTRY_DETAIL_REF = "docs/cli-reference.md";
export const COMMAND_REGISTRY_FILE = "command-registry.json";
export const COMMAND_REGISTRY_FORMAT_VERSION = 1;

export const COMMAND_CATEGORY_SUMMARIES = [
  { category: "read", purpose: "Inspect current runtime state, registries, and operator-facing summaries." },
  { category: "verify", purpose: "Validate integrity, drift, and benchmark-grade compliance." },
  { category: "write", purpose: "Write canonical runtime artifacts, decisions, and state transitions." },
  { category: "execute", purpose: "Advance the runtime, orchestration, or repair path." },
  { category: "observe", purpose: "Export or visualize evidence, metrics, lineage, and analytics." }
];

export const COMMAND_ROUTING_TOP_COMMANDS = [
  "init",
  "upgrade",
  "command-register",
  "organization-status",
  "organization-verify",
  "command-routing-audit",
  "run",
  "council-exec",
  "release-state-audit",
  "need-validation-benchmark"
];

export const COMMAND_ROUTING_FLOW = [
  "Read the command register first to route without loading the full CLI reference.",
  "Use read commands to inspect runtime state before changing artifacts.",
  "Use verify commands before claiming correctness or release readiness.",
  "Use write commands to persist canonical artifacts and governed state changes.",
  "Use execute commands to move the runtime or orchestration loop forward.",
  "Use observe commands when exporting visibility, metrics, or analytical outputs."
];

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

const CATEGORY_OVERRIDES = {
  run: "execute",
  init: "execute",
  upgrade: "execute",
  answer: "execute",
  "outcome-report": "write",
  "cadence-trigger-guide": "execute",
  "cadence-follow-through": "execute",
  "live-verify": "execute",
  "decision-verify": "verify",
  "decision-register": "read",
  "breakthrough-library-register": "read",
  "discovery-handoff-benchmark": "verify",
  "release-state-refresh": "execute",
  "release-state-audit": "verify",
  "need-validation-advance": "execute",
  "need-validation-benchmark": "verify",
  "learning-loop-snapshot": "observe",
  "contract-register": "read",
  "dependency-graph": "read",
  "metrics-snapshot": "observe",
  "organization-audit": "verify",
  "organization-status": "read",
  "organization-analytics-snapshot": "observe",
  "organization-verify": "verify",
  "roadmap-status": "read",
  "verify-archive": "observe",
  "verify-archive-dashboard": "observe",
  "verify-archive-log": "observe",
  "verify-history": "observe",
  "verify-log": "observe",
  "verify-lineage": "observe",
  "verify-dashboard": "observe",
  "verify-dashboard-log": "observe",
  "verify-dashboard-index": "observe",
  "visibility-export": "observe",
  "visibility-serve": "observe",
  packet: "read",
  signal: "write",
  council: "read",
  "council-exec": "execute",
  "provider-check": "read",
  "escalation-resolve": "write",
  "runtime-loop-proof": "execute",
  "execution-lineage": "observe",
  "runtime-discipline-benchmark": "verify",
  "command-registry-refresh": "execute",
  "command-register": "read",
  "command-routing-audit": "verify"
};

const PURPOSE_OVERRIDES = {
  init: "Seed a project with the canonical AOF runtime skeleton and recognition packet.",
  upgrade: "Upgrade an existing AOF installation to the current bootstrap shape.",
  "command-registry-refresh": "Write the canonical command registry artifact from the CLI command catalog.",
  "command-register": "Read the command registry so operators and AI can route without loading the full CLI reference.",
  "command-routing-audit": "Verify that bootstrap, orientation, and command registry routing surfaces remain aligned.",
  "organization-status": "Read the operator-facing organization summary and active goals.",
  "organization-verify": "Verify bootstrap, organization, capability, and command-routing integrity.",
  "release-state-audit": "Verify that active release refs and governed release surfaces remain aligned.",
  "release-state-refresh": "Repair the active release manifest and governed release refs.",
  run: "Start an AOF runtime session from a user request.",
  "council-exec": "Execute a council stage and optionally invoke model-backed seats.",
  "need-validation-benchmark": "Benchmark whether Need Validation rejects, reframes, and gates project creation correctly."
};

const INPUT_HINTS = {
  init: ["project", "topology"],
  upgrade: ["project"],
  run: ["request", "project?"],
  "command-registry-refresh": ["project", "write-artifact?"],
  "command-register": ["project"],
  "command-routing-audit": ["project", "write-artifact?"],
  "organization-status": ["project"],
  "organization-verify": ["project"],
  "release-state-refresh": ["project", "release-version", "release-tag"],
  "release-state-audit": ["project"],
  "council-exec": ["session", "stage", "project?"],
  "need-validation-benchmark": ["project", "write-artifact?"]
};

const OUTPUT_HINTS = {
  init: ["bootstrap artifacts"],
  upgrade: ["upgraded bootstrap artifacts"],
  run: ["runtime session"],
  "command-registry-refresh": ["command registry artifact"],
  "command-register": ["command routing summary"],
  "command-routing-audit": ["routing audit result"],
  "organization-status": ["organization summary"],
  "organization-verify": ["verification report"],
  "release-state-refresh": ["active release manifest"],
  "release-state-audit": ["release drift audit"],
  "council-exec": ["council execution packet"],
  "need-validation-benchmark": ["benchmark report"]
};

function humanizeCommand(command) {
  return command.replace(/-/g, " ");
}

function inferCategory(command) {
  if (CATEGORY_OVERRIDES[command]) {
    return CATEGORY_OVERRIDES[command];
  }
  if (command.endsWith("-record")) {
    return "write";
  }
  if (command.endsWith("-verify") || command.endsWith("-benchmark") || command.endsWith("-audit")) {
    return "verify";
  }
  if (command.endsWith("-status") || command.endsWith("-register")) {
    return "read";
  }
  return "execute";
}

function inferPurpose(command, category) {
  if (PURPOSE_OVERRIDES[command]) {
    return PURPOSE_OVERRIDES[command];
  }
  const label = humanizeCommand(command);
  if (category === "write") {
    return `Write the canonical ${label} artifact.`;
  }
  if (category === "verify") {
    return `Verify ${label} integrity and governed correctness.`;
  }
  if (category === "observe") {
    return `Export or inspect ${label} evidence for operators.`;
  }
  if (category === "read") {
    return `Read the current ${label} surface.`;
  }
  return `Advance the runtime through ${label}.`;
}

function inferOperatorPath(command, category) {
  if (COMMAND_ROUTING_TOP_COMMANDS.includes(command)) {
    return "top-level-routing";
  }
  if (category === "write") {
    return "artifact-recording";
  }
  if (category === "verify") {
    return "integrity-and-benchmarking";
  }
  if (category === "observe") {
    return "visibility-and-analysis";
  }
  if (category === "read") {
    return "state-inspection";
  }
  return "runtime-execution";
}

export function getCommandCatalog() {
  return COMMAND_SPECS.map(([command, handlerPath, exportName]) => {
    const category = inferCategory(command);
    return {
      command,
      handlerPath,
      exportName,
      category,
      purpose: inferPurpose(command, category),
      operator_path: inferOperatorPath(command, category),
      top_command: COMMAND_ROUTING_TOP_COMMANDS.includes(command),
      inputs: INPUT_HINTS[command] ?? [],
      outputs: OUTPUT_HINTS[command] ?? [],
      detail_ref: COMMAND_REGISTRY_DETAIL_REF
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

export function buildCommandRegistryPayload(generatedAt) {
  return {
    artifact_type: "command-registry",
    registry_format_version: COMMAND_REGISTRY_FORMAT_VERSION,
    generated_at: generatedAt,
    detail_ref: COMMAND_REGISTRY_DETAIL_REF,
    commands: getCommandCatalog().map((entry) => ({
      command: entry.command,
      category: entry.category,
      purpose: entry.purpose,
      operator_path: entry.operator_path,
      top_command: entry.top_command,
      inputs: entry.inputs,
      outputs: entry.outputs,
      detail_ref: entry.detail_ref
    }))
  };
}

export function buildCommandRoutingSummary() {
  const registry = buildCommandRegistryPayload(new Date(0).toISOString());
  return {
    detail_ref: COMMAND_REGISTRY_DETAIL_REF,
    categories: COMMAND_CATEGORY_SUMMARIES,
    top_commands: registry.commands
      .filter((entry) => entry.top_command)
      .map((entry) => ({
        command: entry.command,
        category: entry.category,
        purpose: entry.purpose
      })),
    runtime_flow: COMMAND_ROUTING_FLOW
  };
}
