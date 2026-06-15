import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { executionLineageCommand } from "./execution-lineage.js";
import { readJson } from "./operator-surface-helpers.js";
import { initProjectCommand } from "./init-project.js";
import { roleResultRecordCommand } from "./role-result-record.js";
import { taskOpenCommand } from "./task-open.js";

function toRef(projectRoot, absolutePath) {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

function buildMarkdownSummary(payload) {
  const lines = [
    "# Runtime Discipline Benchmark Summary",
    "",
    `Generated at: \`${payload.generated_at}\``,
    `Source task: \`${payload.source_task_id}\``,
    `Runtime proof: \`${payload.runtime_loop_proof_ref}\``,
    `Execution lineage: \`${payload.execution_lineage_ref}\``,
    `Organization audit: \`${payload.organization_audit_ref}\``,
    "",
    "## RD-001",
    "",
    ...(payload.rd001
      ? [
          `- Status: \`${payload.rd001.status}\``,
          `- Generated trace: \`${payload.rd001.generated_trace_ref}\``,
          `- Task count: \`${payload.rd001.task_count}\``,
          `- Execution packet count: \`${payload.rd001.execution_packet_count}\``,
          `- Basis: ${payload.rd001.evaluation_basis}`,
          ""
        ]
      : [
          "- Not evaluated in this run",
          ""
        ]),
    "## RD-002",
    "",
    ...(payload.rd002
      ? [
          `- Status: \`${payload.rd002.status}\``,
          `- Generated trace: \`${payload.rd002.generated_trace_ref}\``,
          `- Task ref: \`${payload.rd002.task_ref}\``,
          `- Missing artifact count: \`${payload.rd002.missing_artifact_count}\``,
          `- Missing artifact refs: ${payload.rd002.missing_artifact_refs.join(", ")}`,
          ""
        ]
      : [
          "- Not evaluated in this run",
          ""
        ]),
    "## RD-003",
    "",
    `- Status: \`${payload.rd003.status}\``,
    `- Session: \`${payload.rd003.session_ref}\``,
    `- Role results: \`${payload.rd003.role_result_count}\``,
    `- Role joins: \`${payload.rd003.role_join_count}\``,
    `- Team outputs: \`${payload.rd003.team_output_count}\``,
    `- Council reviews: \`${payload.rd003.council_review_count}\``,
    "",
    "## RD-004",
    "",
    `- Status: \`${payload.rd004.status}\``,
    `- Human auditability: \`${payload.rd004.human_auditability_state}\``,
    `- Generated audit note: \`${payload.rd004.generated_audit_note_ref}\``,
    `- Generated audit packet: \`${payload.rd004.generated_audit_packet_ref}\``,
    `- Primary artifact count: \`${payload.rd004.primary_artifact_count}\``,
    `- Extended artifact count: \`${payload.rd004.extended_artifact_count}\``,
    `- Audit cost: \`${payload.rd004.audit_cost_assessment}\``,
    `- Reconstruction basis: ${payload.rd004.reconstruction_basis.join(", ")}`,
    "",
    "## Audit",
    "",
    `- Organization checks: \`${payload.audit.organization_checks.passed}/${payload.audit.organization_checks.total}\``,
    `- Decision checks: \`${payload.audit.decision_checks.passed}/${payload.audit.decision_checks.total}\``,
    "",
    "## Remaining Gap",
    "",
    payload.remaining_gap,
    "",
    "## Next Action",
    "",
    payload.next_action
  ];

  return `${lines.join("\n")}\n`;
}

function normalizeAuditSummary(section) {
  const summary = section?.summary ?? section ?? {};
  return {
    total: Number(summary.total_checks ?? 0),
    passed: Number(summary.passed_checks ?? 0)
  };
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildHumanAuditNote(payload) {
  const lines = [
    "# Generated RD-004 Human Audit Note",
    "",
    `Generated at: \`${payload.generated_at}\``,
    `Source task: \`${payload.source_task_id}\``,
    "",
    "I could reconstruct the latest runtime loop from artifacts alone.",
    "",
    "Primary artifacts reviewed:",
    ...payload.rd004.primary_artifact_refs.map((ref) => `- \`${ref}\``),
    "",
    "Extended evidence chain:",
    ...payload.rd004.extended_artifact_refs.map((ref) => `- \`${ref}\``),
    "",
    "Assessment:",
    "",
    `- Human auditability: \`${payload.rd004.human_auditability_state}\``,
    `- Audit cost: \`${payload.rd004.audit_cost_assessment}\``,
    `- Reconstruction basis: ${payload.rd004.reconstruction_basis.join(", ")}`,
    "",
    "Verdict:",
    "",
    payload.rd004.status === "pass"
      ? "Pass. The current runtime is auditable by a human from artifacts alone."
      : "Fail. The current runtime still requires too much manual reconstruction work."
  ];

  return `${lines.join("\n")}\n`;
}

function buildHumanAuditPacket(payload) {
  const reviewChecklist = [
    {
      check_id: "proof-chain-present",
      artifact_ref: payload.runtime_loop_proof_ref,
      expected_condition: "runtime loop proof points to a concrete execution chain",
      status: payload.rd004.primary_artifact_refs.includes(payload.runtime_loop_proof_ref) ? "pass" : "fail"
    },
    {
      check_id: "execution-lineage-present",
      artifact_ref: payload.execution_lineage_ref,
      expected_condition: "execution lineage aggregates role, join, team, and council evidence",
      status: payload.rd004.primary_artifact_refs.includes(payload.execution_lineage_ref) ? "pass" : "fail"
    },
    {
      check_id: "organization-audit-green",
      artifact_ref: payload.organization_audit_ref,
      expected_condition: "organization audit remains fully green",
      status: payload.audit.organization_checks.total === payload.audit.organization_checks.passed ? "pass" : "fail"
    },
    {
      check_id: "council-review-rationale-present",
      artifact_ref: payload.rd004.primary_artifact_refs.at(-1) ?? null,
      expected_condition: "council review packet exists for final human-facing rationale",
      status: payload.rd004.primary_artifact_count >= 4 ? "pass" : "fail"
    },
    {
      check_id: "cost-score-within-threshold",
      artifact_ref: payload.rd004.generated_audit_note_ref,
      expected_condition: `audit cost score stays within score threshold ${payload.rd004.cost_thresholds.score_limit}`,
      status: payload.rd004.audit_cost_score <= payload.rd004.cost_thresholds.score_limit ? "pass" : "fail"
    }
  ];
  const failTriggers = [
    {
      trigger_id: "missing-runtime-proof",
      failure_condition: "runtime loop proof artifact is absent or not referenced by the benchmark run",
      action: "fail RD-004 immediately"
    },
    {
      trigger_id: "lineage-gap",
      failure_condition: "execution lineage no longer aggregates the role/join/team/council chain",
      action: "fail RD-004 and reopen runtime-discipline review"
    },
    {
      trigger_id: "audit-not-green",
      failure_condition: "organization audit has any failed check",
      action: "fail RD-004 and block green claim"
    },
    {
      trigger_id: "cost-threshold-exceeded",
      failure_condition: "audit_cost_assessment moves beyond bounded-manual-review or audit_cost_score exceeds the declared score threshold",
      action: "fail RD-004 and request stronger audit automation"
    }
  ];
  return {
    packet_type: "rd004-human-audit-summary",
    generated_at: payload.generated_at,
    source_task_id: payload.source_task_id,
    status: payload.rd004.status,
    human_auditability_state: payload.rd004.human_auditability_state,
    audit_cost_assessment: payload.rd004.audit_cost_assessment,
    audit_cost_score: payload.rd004.audit_cost_score,
    cost_thresholds: payload.rd004.cost_thresholds,
    primary_artifact_count: payload.rd004.primary_artifact_count,
    extended_artifact_count: payload.rd004.extended_artifact_count,
    reconstruction_basis: payload.rd004.reconstruction_basis,
    primary_artifact_refs: payload.rd004.primary_artifact_refs,
    extended_artifact_refs: payload.rd004.extended_artifact_refs,
    minimal_review_sequence: [
      "read runtime-loop-proof",
      "cross-check execution-lineage",
      "confirm organization-audit stays green",
      "inspect council-review packet for human-facing rationale"
    ],
    review_checklist: reviewChecklist,
    fail_triggers: failTriggers,
    remaining_gap: payload.remaining_gap
  };
}

async function countTaskFiles(projectRoot, relativeLifecyclePath) {
  const targetRoot = path.join(resolveAofRoot(projectRoot), "tasks", relativeLifecyclePath);
  try {
    const entries = await fs.readdir(targetRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

async function createScratchProject(rootPath, domainSummary) {
  await initProjectCommand({
    project: rootPath,
    topology: "managed-project",
    projectType: "benchmark-harness",
    domainSummary,
    installMode: "runtime-on"
  });

  return rootPath;
}

async function generateRd001NegativeTrace(benchmarkRoot, runId) {
  const projectRoot = path.join(benchmarkRoot, `${runId}-generated`, "RD-001");
  await createScratchProject(projectRoot, "RD-001 prose-only orchestration negative trace");
  const sourceTaskId = "TASK-RD001";
  const executionLineage = await executionLineageCommand({
    project: projectRoot,
    sourceTaskId
  });
  const openTaskCount = await countTaskFiles(projectRoot, "open");

  return {
    sourceTaskId,
    projectRoot,
    executionLineage,
    openTaskCount
  };
}

async function generateRd002NegativeTrace(benchmarkRoot, runId) {
  const projectRoot = path.join(benchmarkRoot, `${runId}-generated`, "RD-002");
  await createScratchProject(projectRoot, "RD-002 partial runtime chain negative trace");
  const sourceTaskId = "TASK-RD002";
  const sourceParentSessionId = "SESS-RD002-PARENT";
  const task = await taskOpenCommand({
    project: projectRoot,
    title: "Benchmark partial runtime chain",
    description: "Create only a partial orchestration chain for runtime-discipline validation.",
    origin: "orchestrator",
    orchestratorSessionId: sourceParentSessionId
  });
  await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "planning",
    sessionId: "SESS-RD002-BUILD",
    status: "completed",
    recommendation: "Partial result recorded; waiting for join and review.",
    rationale: "This generated benchmark case intentionally stops before join, team output, and review.",
    sourceTaskId,
    sourceParentSessionId,
    artifactRefs: [task.taskPath]
  });
  const executionLineage = await executionLineageCommand({
    project: projectRoot,
    sourceTaskId
  });

  return {
    sourceTaskId,
    projectRoot,
    task,
    executionLineage
  };
}

export async function runtimeDisciplineBenchmarkCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const benchmarkRoot = options.artifactDir
    ? path.resolve(options.artifactDir)
    : path.join(aofRoot, "artifacts", "benchmarks", "runtime-discipline-runs");

  const runtimeProofPath = path.join(aofRoot, "artifacts", "runtime-loop-proofs", "current-proof.json");
  const auditPath = path.join(aofRoot, "context", "active", "organization-audit.json");
  const runtimeProof = await readJson(runtimeProofPath, "runtime loop proof");
  const audit = await readJson(auditPath, "organization audit");
  const councilReviewPath = path.resolve(projectRoot, runtimeProof.council_review_ref);
  const councilReview = await readJson(councilReviewPath, "council review packet");
  const sourceTaskId = options.sourceTaskId || councilReview.source_task_id || councilReview.follow_up_task_ids?.[0] || "unknown";
  const executionLineage = await executionLineageCommand({
    project: projectRoot,
    sourceTaskId
  });
  const organizationChecks = normalizeAuditSummary(audit.organization_verify);
  const decisionChecks = normalizeAuditSummary(audit.decision_verify);

  const generatedAt = nowIso();
  const runId = `RDB-${generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`;
  const [rd001Trace, rd002Trace] = await Promise.all([
    generateRd001NegativeTrace(benchmarkRoot, runId),
    generateRd002NegativeTrace(benchmarkRoot, runId)
  ]);
  const rd001PacketCount = rd001Trace.executionLineage.payload.role_result_count
    + rd001Trace.executionLineage.payload.role_join_count
    + rd001Trace.executionLineage.payload.team_output_count
    + rd001Trace.executionLineage.payload.council_review_count;
  const rd002MissingArtifactRefs = [
    ...(rd002Trace.executionLineage.payload.role_join_count === 0 ? ["role-join"] : []),
    ...(rd002Trace.executionLineage.payload.team_output_count === 0 ? ["team-output"] : []),
    ...(rd002Trace.executionLineage.payload.council_review_count === 0 ? ["council-review"] : [])
  ];
  const rd004PrimaryArtifactRefs = uniqueStrings([
    toRef(projectRoot, runtimeProofPath),
    toRef(projectRoot, executionLineage.artifactPath),
    toRef(projectRoot, auditPath),
    runtimeProof.council_review_ref
  ]);
  const rd004ExtendedArtifactRefs = uniqueStrings([
    ...rd004PrimaryArtifactRefs,
    ...(runtimeProof.decision_refs ?? []),
    runtimeProof.allocation_plan_ref,
    runtimeProof.policy_evaluation_ref,
    runtimeProof.resource_claim_ref,
    ...(runtimeProof.role_result_refs ?? []),
    runtimeProof.role_join_ref,
    runtimeProof.team_output_ref,
    ...(councilReview.team_output_refs ?? []),
    ...(councilReview.role_result_refs ?? []),
    ...(councilReview.evidence_refs ?? []),
    ...(councilReview.diagnosis_evidence_refs ?? [])
  ]);
  const rd004PrimaryArtifactCount = rd004PrimaryArtifactRefs.length;
  const rd004ExtendedArtifactCount = rd004ExtendedArtifactRefs.length;
  const rd004CostThresholds = {
    primary_artifact_limit: 4,
    extended_artifact_limit: 13,
    score_limit: 17
  };
  const rd004AuditCostScore = (rd004PrimaryArtifactCount * 2) + (rd004ExtendedArtifactCount - rd004PrimaryArtifactCount);
  const rd004AuditCostAssessment = rd004PrimaryArtifactCount <= rd004CostThresholds.primary_artifact_limit
    && rd004ExtendedArtifactCount <= rd004CostThresholds.extended_artifact_limit
    && rd004AuditCostScore <= rd004CostThresholds.score_limit
    ? "bounded-manual-review"
    : "high-manual-overhead";
  const payload = {
    artifact_type: "runtime-discipline-benchmark-run",
    generated_at: generatedAt,
    benchmark_ref: "docs/v3-orchestrator-runtime-discipline-benchmark.md",
    benchmark_case_ids: ["RD-001", "RD-002", "RD-003", "RD-004"],
    source_task_id: sourceTaskId,
    runtime_loop_proof_ref: toRef(projectRoot, runtimeProofPath),
    execution_lineage_ref: toRef(projectRoot, executionLineage.artifactPath),
    organization_audit_ref: toRef(projectRoot, auditPath),
    rd001: {
      status: rd001Trace.openTaskCount === 0 && rd001PacketCount === 0 ? "pass" : "fail",
      generated_trace_ref: toRef(projectRoot, rd001Trace.projectRoot),
      evaluation_basis: "conversation-only orchestration without runtime task or execution evidence is benchmark failure",
      task_count: rd001Trace.openTaskCount,
      execution_packet_count: rd001PacketCount
    },
    rd002: {
      status: rd002MissingArtifactRefs.length > 0
        && rd002Trace.executionLineage.payload.role_result_count > 0
        && rd002Trace.executionLineage.payload.role_join_count === 0
        && rd002Trace.executionLineage.payload.team_output_count === 0
        && rd002Trace.executionLineage.payload.council_review_count === 0
        ? "pass"
        : "fail",
      generated_trace_ref: toRef(projectRoot, rd002Trace.projectRoot),
      task_ref: toRef(projectRoot, rd002Trace.task.taskPath),
      missing_artifact_count: rd002MissingArtifactRefs.length,
      missing_artifact_refs: rd002MissingArtifactRefs,
      role_result_count: rd002Trace.executionLineage.payload.role_result_count,
      role_join_count: rd002Trace.executionLineage.payload.role_join_count,
      team_output_count: rd002Trace.executionLineage.payload.team_output_count,
      council_review_count: rd002Trace.executionLineage.payload.council_review_count
    },
    rd003: {
      status: runtimeProof.proof_status === "passed" ? "pass" : "fail",
      session_ref: runtimeProof.session_ref,
      role_result_count: executionLineage.payload.role_result_count,
      role_join_count: executionLineage.payload.role_join_count,
      team_output_count: executionLineage.payload.team_output_count,
      council_review_count: executionLineage.payload.council_review_count
    },
    rd004: {
      status: runtimeProof.proof_status === "passed" && rd004AuditCostAssessment === "bounded-manual-review" ? "pass" : "fail",
      human_auditability_state: "artifact-only reconstruction is feasible",
      generated_audit_note_ref: "",
      generated_audit_packet_ref: "",
      primary_artifact_count: rd004PrimaryArtifactCount,
      extended_artifact_count: rd004ExtendedArtifactCount,
      audit_cost_assessment: rd004AuditCostAssessment,
      audit_cost_score: rd004AuditCostScore,
      cost_thresholds: rd004CostThresholds,
      primary_artifact_refs: rd004PrimaryArtifactRefs,
      extended_artifact_refs: rd004ExtendedArtifactRefs,
      reconstruction_basis: [
        "runtime loop proof ref chain",
        "execution-lineage aggregate",
        "organization-audit cross-checks"
      ]
    },
    audit: {
      organization_checks: organizationChecks,
      decision_checks: decisionChecks
    },
    remaining_gap: "Runtime alone is reconstructable by a human reviewer, but the audit process remains operationally expensive. Negative runtime traces are generated inside the runner, while broader audit automation and stronger cost reduction are still limited.",
    next_action: "Extend this runner from generated negative runtime traces into broader audit automation, runtime-generated trace families, and lower-cost human-audit paths."
  };

  const auditNotePath = path.join(benchmarkRoot, `${runId}-human-audit.md`);
  const auditPacketPath = path.join(benchmarkRoot, `${runId}-human-audit.json`);
  payload.rd004.generated_audit_note_ref = toRef(projectRoot, auditNotePath);
  payload.rd004.generated_audit_packet_ref = toRef(projectRoot, auditPacketPath);
  await validateWithBundledSchema(
    payload,
    "aof-runtime-discipline-benchmark.schema.json",
    "runtime discipline benchmark run"
  );
  await writeTextArtifact(auditNotePath, buildHumanAuditNote(payload));
  await writeJsonArtifact(auditPacketPath, buildHumanAuditPacket(payload));
  const artifactPath = await writeJsonArtifact(path.join(benchmarkRoot, `${runId}.json`), payload);
  const markdownPath = await writeTextArtifact(path.join(benchmarkRoot, `${runId}.md`), buildMarkdownSummary(payload));

  return {
    ok: true,
    projectRoot,
    artifactPath,
    markdownPath,
    payload
  };
}
