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
      status: runtimeProof.proof_status === "passed" ? "pass" : "fail",
      human_auditability_state: "artifact-only reconstruction is feasible",
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
    remaining_gap: "Runtime alone is reconstructable by a human reviewer, but the audit process remains operationally expensive. Negative runtime traces are now generated inside the runner, while broader audit automation is still limited.",
    next_action: "Extend this runner from generated negative runtime traces into broader audit automation and stricter human-audit cost checks."
  };

  await validateWithBundledSchema(
    payload,
    "aof-runtime-discipline-benchmark.schema.json",
    "runtime discipline benchmark run"
  );

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
