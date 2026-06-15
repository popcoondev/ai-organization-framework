import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { executionLineageCommand } from "./execution-lineage.js";
import { pathExists, readJson } from "./operator-surface-helpers.js";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");

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
          `- Fixture: \`${payload.rd001.fixture_ref}\``,
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
          `- Fixture: \`${payload.rd002.fixture_ref}\``,
          `- Missing artifact count: \`${payload.rd002.missing_artifact_count}\``,
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

async function loadOptionalFixture(filePath, label) {
  if (!(await pathExists(filePath))) {
    return null;
  }
  return readJson(filePath, label);
}

async function loadFixtureWithFallback(projectFixturePath, bundledFileName, label) {
  const bundledFixturePath = path.join(REPO_ROOT, ".aof", "artifacts", "benchmarks", "fixtures", bundledFileName);
  if (await pathExists(projectFixturePath)) {
    return {
      payload: await readJson(projectFixturePath, label),
      refPath: projectFixturePath
    };
  }
  if (await pathExists(bundledFixturePath)) {
    return {
      payload: await readJson(bundledFixturePath, label),
      refPath: bundledFixturePath
    };
  }
  return null;
}

export async function runtimeDisciplineBenchmarkCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const benchmarkRoot = options.artifactDir
    ? path.resolve(options.artifactDir)
    : path.join(aofRoot, "artifacts", "benchmarks", "runtime-discipline-runs");

  const runtimeProofPath = path.join(aofRoot, "artifacts", "runtime-loop-proofs", "current-proof.json");
  const auditPath = path.join(aofRoot, "context", "active", "organization-audit.json");
  const fixturesRoot = path.join(aofRoot, "artifacts", "benchmarks", "fixtures");

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
  const [rd001FixtureEntry, rd002FixtureEntry] = await Promise.all([
    loadFixtureWithFallback(
      path.join(fixturesRoot, "RD-001-prose-only-orchestration-context.json"),
      "RD-001-prose-only-orchestration-context.json",
      "RD-001 fixture"
    ),
    loadFixtureWithFallback(
      path.join(fixturesRoot, "RD-002-partial-runtime-chain-context.json"),
      "RD-002-partial-runtime-chain-context.json",
      "RD-002 fixture"
    )
  ]);
  const rd001Fixture = rd001FixtureEntry?.payload ?? null;
  const rd002Fixture = rd002FixtureEntry?.payload ?? null;

  const generatedAt = nowIso();
  const runId = `RDB-${generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`;
  const payload = {
    artifact_type: "runtime-discipline-benchmark-run",
    generated_at: generatedAt,
    benchmark_ref: "docs/v3-orchestrator-runtime-discipline-benchmark.md",
    benchmark_case_ids: [
      ...(rd001Fixture ? ["RD-001"] : []),
      ...(rd002Fixture ? ["RD-002"] : []),
      "RD-003",
      "RD-004"
    ],
    source_task_id: sourceTaskId,
    runtime_loop_proof_ref: toRef(projectRoot, runtimeProofPath),
    execution_lineage_ref: toRef(projectRoot, executionLineage.artifactPath),
    organization_audit_ref: toRef(projectRoot, auditPath),
    ...(rd001Fixture
      ? {
          rd001: {
            status: rd001Fixture.runtime_artifact_scan_result?.task_present === false
              && rd001Fixture.runtime_artifact_scan_result?.role_results_present === false
              && rd001Fixture.runtime_artifact_scan_result?.role_join_present === false
              && rd001Fixture.runtime_artifact_scan_result?.team_output_present === false
              && rd001Fixture.runtime_artifact_scan_result?.council_review_present === false
              ? "pass"
              : "fail",
            fixture_ref: toRef(projectRoot, rd001FixtureEntry.refPath),
            evaluation_basis: "conversation-only orchestration without runtime evidence is benchmark failure"
          }
        }
      : {}),
    ...(rd002Fixture
      ? {
          rd002: {
            status: Array.isArray(rd002Fixture.missing_artifact_refs) && rd002Fixture.missing_artifact_refs.length > 0
              ? "pass"
              : "fail",
            fixture_ref: toRef(projectRoot, rd002FixtureEntry.refPath),
            missing_artifact_count: Array.isArray(rd002Fixture.missing_artifact_refs) ? rd002Fixture.missing_artifact_refs.length : 0
          }
        }
      : {}),
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
    remaining_gap: "Runtime alone is reconstructable by a human reviewer, but the audit process remains operationally expensive. Benchmark runner coverage exists for the latest positive path, while broader audit automation is still limited.",
    next_action: "Extend this runner from fixture-evaluated negative cases into fully generated negative runtime traces and broader audit automation."
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
