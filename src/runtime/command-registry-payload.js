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
  "operator-brief",
  "situation-assess",
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

const COMMAND_NAMES = [
  "run",
  "init",
  "upgrade",
  "answer",
  "outcome-report",
  "allocation-plan-record",
  "policy-evaluation-report",
  "resource-claim-record",
  "task-open",
  "task-update",
  "goal-project",
  "confirmation-window-record",
  "alignment-pulse",
  "cadence-trigger-guide",
  "cadence-follow-through",
  "self-audit-record",
  "retire-candidate-review",
  "live-verify",
  "decision-verify",
  "decision-register",
  "discovery-question-set-record",
  "breakthrough-pattern-record",
  "breakthrough-library-register",
  "assumption-map-record",
  "anomaly-log-record",
  "discovery-judgment-packet",
  "discovery-handoff-record",
  "discovery-handoff-benchmark",
  "release-state-refresh",
  "release-state-audit",
  "problem-statement-record",
  "value-hypothesis-record",
  "alternative-analysis-record",
  "experiment-proposal-record",
  "project-charter-record",
  "need-validation-record",
  "need-validation-advance",
  "need-validation-benchmark",
  "learning-loop-snapshot",
  "contract-register",
  "dependency-graph",
  "metrics-snapshot",
  "organization-audit",
  "organization-status",
  "organization-analytics-snapshot",
  "organization-verify",
  "roadmap-status",
  "verify-archive",
  "verify-archive-dashboard",
  "verify-archive-log",
  "verify-history",
  "verify-log",
  "verify-lineage",
  "verify-dashboard",
  "verify-dashboard-log",
  "verify-dashboard-index",
  "visibility-export",
  "operator-brief",
  "mission-control-benchmark",
  "situation-assess",
  "visibility-serve",
  "packet",
  "signal",
  "council",
  "council-exec",
  "provider-check",
  "escalation-resolve",
  "role-result-record",
  "role-join-record",
  "team-output-record",
  "council-review-packet",
  "runtime-loop-proof",
  "execution-lineage",
  "runtime-discipline-benchmark",
  "command-registry-refresh",
  "command-register",
  "command-routing-audit"
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
  "operator-brief": "read",
  "mission-control-benchmark": "verify",
  "situation-assess": "read",
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
  "need-validation-benchmark": "Benchmark whether Need Validation rejects, reframes, and gates project creation correctly.",
  "mission-control-benchmark": "Benchmark whether Mission Control truthfully advances through runtime stage transitions.",
  "operator-brief": "Read the compact operator-facing brief derived from current runtime situation assessment.",
  "situation-assess": "Diagnose the current runtime situation, truth conflicts, and best next operating move."
};

const INPUT_HINTS = {
  init: ["project", "topology"],
  upgrade: ["project"],
  run: ["request", "project?"],
  "command-registry-refresh": ["project", "write-artifact?"],
  "command-register": ["project"],
  "command-routing-audit": ["project", "write-artifact?"],
  "operator-brief": ["project", "write-artifact?"],
  "organization-status": ["project"],
  "organization-verify": ["project"],
  "release-state-refresh": ["project", "release-version", "release-tag"],
  "release-state-audit": ["project"],
  "council-exec": ["session", "stage", "project?"],
  "need-validation-benchmark": ["project", "write-artifact?"],
  "mission-control-benchmark": ["project", "write-artifact?"],
  "situation-assess": ["project", "write-artifact?"]
};

const OUTPUT_HINTS = {
  init: ["bootstrap artifacts"],
  upgrade: ["upgraded bootstrap artifacts"],
  run: ["runtime session"],
  "command-registry-refresh": ["command registry artifact"],
  "command-register": ["command routing summary"],
  "command-routing-audit": ["routing audit result"],
  "operator-brief": ["operator briefing packet"],
  "organization-status": ["organization summary"],
  "organization-verify": ["verification report"],
  "release-state-refresh": ["active release manifest"],
  "release-state-audit": ["release drift audit"],
  "council-exec": ["council execution packet"],
  "need-validation-benchmark": ["benchmark report"],
  "mission-control-benchmark": ["benchmark report"],
  "situation-assess": ["situation diagnosis"]
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

export function getCommandCatalogMetadata() {
  return COMMAND_NAMES.map((command) => {
    const category = inferCategory(command);
    return {
      command,
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

export function buildCommandRegistryPayload(generatedAt) {
  return {
    artifact_type: "command-registry",
    registry_format_version: COMMAND_REGISTRY_FORMAT_VERSION,
    generated_at: generatedAt,
    detail_ref: COMMAND_REGISTRY_DETAIL_REF,
    commands: getCommandCatalogMetadata().map((entry) => ({
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
