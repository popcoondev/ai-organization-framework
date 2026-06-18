import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { answerCommand } from "../src/commands/answer.js";
import { alternativeAnalysisRecordCommand } from "../src/commands/alternative-analysis-record.js";
import { anomalyLogRecordCommand } from "../src/commands/anomaly-log-record.js";
import { assumptionMapRecordCommand } from "../src/commands/assumption-map-record.js";
import { commandRegisterCommand } from "../src/commands/command-register.js";
import { commandRegistryRefreshCommand } from "../src/commands/command-registry-refresh.js";
import { commandRoutingAuditCommand } from "../src/commands/command-routing-audit.js";
import { confirmationWindowRecordCommand } from "../src/commands/confirmation-window-record.js";
import { councilReviewPacketCommand } from "../src/commands/council-review-packet.js";
import { decisionRegisterCommand } from "../src/commands/decision-register.js";
import { discoveryHandoffBenchmarkCommand } from "../src/commands/discovery-handoff-benchmark.js";
import { discoveryJudgmentPacketCommand } from "../src/commands/discovery-judgment-packet.js";
import { discoveryHandoffRecordCommand } from "../src/commands/discovery-handoff-record.js";
import { discoveryQuestionSetRecordCommand } from "../src/commands/discovery-question-set-record.js";
import { executionLineageCommand } from "../src/commands/execution-lineage.js";
import { initProjectCommand } from "../src/commands/init-project.js";
import { learningLoopSnapshotCommand } from "../src/commands/learning-loop-snapshot.js";
import { missionControlBenchmarkCommand } from "../src/commands/mission-control-benchmark.js";
import { operatorBriefCommand } from "../src/commands/operator-brief.js";
import { contractRegisterCommand } from "../src/commands/contract-register.js";
import { dependencyGraphCommand } from "../src/commands/dependency-graph.js";
import { organizationAuditCommand } from "../src/commands/organization-audit.js";
import { organizationStatusCommand } from "../src/commands/organization-status.js";
import { organizationAnalyticsSnapshotCommand } from "../src/commands/organization-analytics-snapshot.js";
import { outcomeReportCommand } from "../src/commands/outcome-report.js";
import { problemStatementRecordCommand } from "../src/commands/problem-statement-record.js";
import { releaseStateAuditCommand } from "../src/commands/release-state-audit.js";
import { releaseStateRefreshCommand } from "../src/commands/release-state-refresh.js";
import { roleJoinRecordCommand } from "../src/commands/role-join-record.js";
import { roadmapStatusCommand } from "../src/commands/roadmap-status.js";
import { runtimeDisciplineBenchmarkCommand } from "../src/commands/runtime-discipline-benchmark.js";
import { runtimeLoopProofCommand } from "../src/commands/runtime-loop-proof.js";
import { roleResultRecordCommand } from "../src/commands/role-result-record.js";
import { runCommand } from "../src/commands/run.js";
import { selfAuditRecordCommand } from "../src/commands/self-audit-record.js";
import { taskOpenCommand } from "../src/commands/task-open.js";
import { taskUpdateCommand } from "../src/commands/task-update.js";
import { teamOutputRecordCommand } from "../src/commands/team-output-record.js";
import { needValidationRecordCommand } from "../src/commands/need-validation-record.js";
import { valueHypothesisRecordCommand } from "../src/commands/value-hypothesis-record.js";
import { buildVisibilityPageHtml, loadVisibilityViews } from "../src/commands/visibility-serve.js";
import { visibilityExportCommand } from "../src/commands/visibility-export.js";
import { deriveInitialClarification } from "../src/runtime/clarification.js";
import { loadSession } from "../src/runtime/session.js";
import { loadTemplate } from "../src/runtime/template-loader.js";
import { repoRoot, genericExampleProjectRoot, createTempProject, createTempProjectFrom, createTempProjectWithDecisions, createInitializedProject, createInitializedProjectWithDocsDecision, ensureReleaseRefFixtures, ensureReleaseContractFixture, advanceSessionToPlanning, writeVisibilityFixture } from "./runtime-test-helpers.js";

test("discoveryHandoffBenchmarkCommand fails when handoff lacks need-validation linkage", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const questionSet = await discoveryQuestionSetRecordCommand({
    project: projectRoot,
    discoveryObjective: "Test missing linkage",
    keyQuestions: ["Can linkage be omitted?"],
    targetUserOrMarketSlice: "test",
    signals: ["handoff if everything else is present"],
    sourceTaskId: "TASK-DHB-NOLINK"
  });
  const assumptionMap = await assumptionMapRecordCommand({
    project: projectRoot,
    subject: "missing linkage case",
    assumptions: [{
      assumption: "Everything except charter linkage exists",
      assumption_type: "technology",
      confidence: 0.6,
      evidence_state: "moderate",
      break_test_question: "Will the benchmark catch the missing linkage?"
    }],
    sourceTaskId: "TASK-DHB-NOLINK"
  });
  const anomalyLog = await anomalyLogRecordCommand({
    project: projectRoot,
    subject: "missing linkage case",
    anomalies: [{
      observed_anomaly: "No project charter is linked",
      why_it_matters: "The chain should fail linkage checks",
      challenged_assumption: "The chain is project-ready",
      follow_up_recommendation: "Require a linked charter"
    }],
    sourceTaskId: "TASK-DHB-NOLINK"
  });
  await discoveryJudgmentPacketCommand({
    project: projectRoot,
    councilId: "discovery-council",
    judgmentStatus: "synthesize-handoff",
    decisionSummary: "The chain can hand off.",
    rationale: "Everything except final linkage exists.",
    desirabilityAssessment: "Useful for test coverage.",
    feasibilityAssessment: "Simple to reproduce.",
    riskAssessment: "Missing linkage should still block the benchmark.",
    evidenceQualityState: "sufficient",
    recommendedNextStep: "Create a handoff.",
    questionSetRefs: [path.relative(projectRoot, questionSet.artifactPath).replaceAll("\\", "/")],
    artifactRefs: [
      path.relative(projectRoot, assumptionMap.artifactPath).replaceAll("\\", "/"),
      path.relative(projectRoot, anomalyLog.artifactPath).replaceAll("\\", "/")
    ],
    promotionReady: true,
    handoffRequired: true,
    sourceTaskId: "TASK-DHB-NOLINK"
  });
  const handoff = await discoveryHandoffRecordCommand({
    project: projectRoot,
    selectedNeed: "Test missing linkage",
    intendedUserOrSegment: "test segment",
    contextSummary: "Linked charter is absent",
    hypothesis: "DH-004 should fail",
    evidenceRefs: ["docs/test.md"],
    rejectedAlternatives: ["pretend linkage is enough"],
    explicitRisks: ["charter is missing"],
    deliveryValidationRequirements: ["linked charter must exist"],
    need: "Test missing linkage",
    intent: "Fail DH-004",
    context: "No linked charter exists",
    sourceTaskId: "TASK-DHB-NOLINK"
  });
  const problem = await problemStatementRecordCommand({
    project: projectRoot,
    affectedParty: "test user",
    actualProblem: "Linked charter is absent",
    whyItMatters: "The chain should fail",
    whyNow: "Coverage for DH-004 is needed",
    evidenceRefs: ["docs/test.md"]
  });
  const value = await valueHypothesisRecordCommand({
    project: projectRoot,
    expectedValueCreation: "Catch missing linkage",
    beneficiary: "test user",
    supportingEvidence: ["benchmark expectations"],
    successCriteria: ["DH-004 fails"]
  });
  const alternatives = await alternativeAnalysisRecordCommand({
    project: projectRoot,
    subjectNeed: "Test missing linkage",
    alternativeSolutions: ["link the charter correctly"],
    stopOptions: ["stop the chain"]
  });
  await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Test missing linkage",
    validationStatus: "validated",
    validatedNeed: "Test missing linkage",
    decisionSummary: "The benchmark should detect missing charter linkage.",
    authorityAction: "approve-project-charter",
    projectCreationRecommendation: "create-project",
    validationQuestionsAnswered: [
      { question: "Who is affected?", answer: "test user", evidence_state: "sufficient" }
    ],
    hiddenAssumptions: [],
    evidenceGaps: [],
    problemStatementRef: path.relative(projectRoot, problem.artifactPath).replaceAll("\\", "/"),
    valueHypothesisRef: path.relative(projectRoot, value.artifactPath).replaceAll("\\", "/"),
    alternativeAnalysisRef: path.relative(projectRoot, alternatives.artifactPath).replaceAll("\\", "/"),
    discoveryHandoffRef: path.relative(projectRoot, handoff.artifactPath).replaceAll("\\", "/"),
    sourceTaskId: "TASK-DHB-NOLINK"
  });

  const result = await discoveryHandoffBenchmarkCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.equal(result.summary.benchmarks["DH-004"].status, "fail");
});

test("roleResultRecordCommand writes a valid execution role result artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "planning",
    sessionId: "SESS-BUILD-001",
    status: "completed",
    recommendation: "Merge into the team packet.",
    rationale: "Implementation direction is coherent.",
    signals: ["guardian review pending"],
    artifactRefs: ["docs/v2.4-execution-contract-definition.md"],
    decisionRequired: true,
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001",
    confidence: 0.8
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.result_type, "role-result");
  assert.equal(payload.session_id, "SESS-BUILD-001");
  assert.deepEqual(payload.signals, ["guardian review pending"]);
  assert.equal(payload.decision_required, true);
});

test("teamOutputRecordCommand derives missing roles and writes a valid team output artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const roleResult = await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "planning",
    sessionId: "SESS-BUILD-001",
    status: "completed",
    recommendation: "Ready for aggregation.",
    rationale: "Builder packet is complete."
  });

  const result = await teamOutputRecordCommand({
    project: projectRoot,
    teamId: "runtime-team",
    stage: "planning",
    expectedRoles: ["Builder", "Guardian"],
    receivedRoles: ["Builder"],
    aggregateState: "waiting-for-missing-roles",
    blockingSignals: ["guardian pending"],
    recommendedNextStep: "Wait for Guardian role result.",
    joinedRoleResultRefs: [path.relative(projectRoot, roleResult.artifactPath)],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.deepEqual(payload.expected_roles, ["Builder", "Guardian"]);
  assert.deepEqual(payload.received_roles, ["Builder"]);
  assert.deepEqual(payload.missing_roles, ["Guardian"]);
  assert.equal(payload.aggregate_state, "waiting-for-missing-roles");
});

test("operatorBriefCommand writes a schema-valid operator briefing artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  await fs.mkdir(path.join(projectRoot, ".aof", "goals"), { recursive: true });
  await fs.mkdir(path.join(projectRoot, ".aof", "tasks", "open"), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, ".aof", "goals", "operating-goal.json"),
    `${JSON.stringify({
      artifact_type: "operating-goal",
      content: "AOF needs a v3.8 operator briefing layer above runtime situation assessment."
    }, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(projectRoot, ".aof", "goals", "next-value-slice.json"),
    `${JSON.stringify({
      artifact_type: "next-value-slice",
      content: "Define v3.8 as an operator briefing layer that compresses runtime situation judgment into one truthful answer surface for operators."
    }, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(projectRoot, ".aof", "tasks", "open", "TASK-044.json"),
    `${JSON.stringify({
      task_id: "TASK-044",
      title: "Define v3.8 operator briefing layer above situation assessment",
      status: "open",
      created_at: "2026-06-18T11:56:21.341Z",
      updated_at: "2026-06-18T11:56:38.083Z",
      description: "Turn runtime situation judgment into a compact operator-facing brief."
    }, null, 2)}\n`,
    "utf8"
  );

  const result = await operatorBriefCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.equal(result.brief.view_type, "operator_brief");
  assert.equal(result.brief.current_state.primary_frontier_task?.task_id, "TASK-044");
  assert.match(result.brief.next_action.recommended_action, /TASK-044/);
});

test("roleJoinRecordCommand derives missing roles and writes a valid orchestrator join artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await roleJoinRecordCommand({
    project: projectRoot,
    stage: "planning",
    expectedRoles: ["Builder", "Guardian", "Visionary"],
    receivedRoles: ["Builder", "Guardian"],
    aggregateState: "waiting-for-missing-roles",
    blockingSignals: ["visionary pending"],
    recommendedNextStep: "Wait for Visionary role result.",
    receivedSessionIds: ["SESS-BUILD-001", "SESS-GUARD-001"],
    sourceTaskId: "TASK-011",
    sourceParentSessionId: "SESS-PARENT-001",
    summary: "Two of three child role outputs have arrived."
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.join_type, "role-join");
  assert.deepEqual(payload.expected_roles, ["Builder", "Guardian", "Visionary"]);
  assert.deepEqual(payload.received_roles, ["Builder", "Guardian"]);
  assert.deepEqual(payload.missing_roles, ["Visionary"]);
  assert.equal(payload.aggregate_state, "waiting-for-missing-roles");
});

test("councilReviewPacketCommand writes a valid council review packet", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await councilReviewPacketCommand({
    project: projectRoot,
    councilId: "architecture-council",
    stage: "review",
    reviewStatus: "changes-requested",
    decisionSummary: "Guardian evidence is still missing.",
    rationale: "Council approval requires both execution and risk views.",
    recommendation: "Collect Guardian output and resubmit.",
    targetAudience: "An operator deciding whether this slice is ready for external review.",
    expectedUserReaction: "The operator should block release because the evidence is incomplete.",
    blockingReasons: [
      "Guardian evidence is missing.",
      "The current packet cannot justify external confidence."
    ],
    artifactChangeRecommendations: [
      "Add the missing Guardian output summary.",
      "Show the missing evidence directly in the packet."
    ],
    organizationChangeRecommendations: [
      "Require a human-facing quality check before council approval."
    ],
    diagnosisCategory: "role-gap",
    diagnosisConfidence: 0.8,
    diagnosisEvidenceRefs: [
      ".aof/artifacts/execution/team-outputs/TOUT-001.json"
    ],
    humanOverrideSignal: "Owner judged the current packet not yet credible.",
    teamOutputRefs: [".aof/artifacts/execution/team-outputs/TOUT-001.json"],
    roleResultRefs: [".aof/artifacts/execution/role-results/RRES-001.json"],
    evidenceRefs: ["docs/v2.4-execution-contract-definition.md"],
    followUpTaskIds: ["TASK-012"],
    escalationRequired: false,
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.packet_type, "council-review-packet");
  assert.equal(payload.review_status, "changes-requested");
  assert.equal(payload.target_audience, "An operator deciding whether this slice is ready for external review.");
  assert.equal(payload.expected_user_reaction, "The operator should block release because the evidence is incomplete.");
  assert.deepEqual(payload.blocking_reasons, [
    "Guardian evidence is missing.",
    "The current packet cannot justify external confidence."
  ]);
  assert.deepEqual(payload.organization_change_recommendations, [
    "Require a human-facing quality check before council approval."
  ]);
  assert.equal(payload.diagnosis_category, "role-gap");
  assert.equal(payload.diagnosis_confidence, 0.8);
  assert.deepEqual(payload.diagnosis_evidence_refs, [
    ".aof/artifacts/execution/team-outputs/TOUT-001.json"
  ]);
  assert.equal(payload.human_override_signal, "Owner judged the current packet not yet credible.");
  assert.deepEqual(payload.follow_up_task_ids, ["TASK-012"]);
});

test("executionLineageCommand aggregates execution artifacts by source task", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const roleResult = await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "planning",
    sessionId: "SESS-BUILD-001",
    status: "completed",
    recommendation: "Merge into the team packet.",
    rationale: "Builder execution is complete.",
    signals: ["guardian review pending"],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });
  const teamOutput = await teamOutputRecordCommand({
    project: projectRoot,
    teamId: "runtime-team",
    stage: "planning",
    expectedRoles: ["Builder", "Guardian"],
    receivedRoles: ["Builder"],
    aggregateState: "waiting-for-missing-roles",
    blockingSignals: ["guardian pending"],
    recommendedNextStep: "Wait for Guardian role result.",
    joinedRoleResultRefs: [path.relative(projectRoot, roleResult.artifactPath)],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });
  await roleJoinRecordCommand({
    project: projectRoot,
    stage: "planning",
    expectedRoles: ["Builder", "Guardian"],
    receivedRoles: ["Builder"],
    aggregateState: "waiting-for-missing-roles",
    blockingSignals: ["guardian pending"],
    recommendedNextStep: "Wait for Guardian role result.",
    receivedSessionIds: ["SESS-BUILD-001"],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });
  await councilReviewPacketCommand({
    project: projectRoot,
    councilId: "architecture-council",
    stage: "review",
    reviewStatus: "deferred",
    decisionSummary: "Waiting for complete team packet.",
    rationale: "Guardian output has not arrived.",
    recommendation: "Wait for Guardian role result.",
    teamOutputRefs: [path.relative(projectRoot, teamOutput.artifactPath)],
    roleResultRefs: [path.relative(projectRoot, roleResult.artifactPath)],
    followUpTaskIds: ["TASK-012"],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });

  const result = await executionLineageCommand({
    project: projectRoot,
    sourceTaskId: "TASK-012"
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.role_result_count, 1);
  assert.equal(result.payload.role_join_count, 1);
  assert.equal(result.payload.team_output_count, 1);
  assert.equal(result.payload.council_review_count, 1);
  assert.equal(result.payload.recommended_next_step, "Wait for Guardian role result.");
  assert.equal(result.payload.stages_observed.includes("planning"), true);
});

test("runtimeLoopProofCommand generates an auditable backend-neutral loop proof bundle", async (t) => {
  const projectRoot = await createTempProject(t);

  const result = await runtimeLoopProofCommand({
    project: projectRoot,
    provider: "mock",
    sourceTaskId: "TASK-011"
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.proof_type, "runtime-loop-proof");
  assert.equal(result.payload.proof_status, "passed");
  assert.equal(result.payload.phases.framing, "completed");
  assert.equal(result.payload.phases.review, "approved");
  assert.equal(result.payload.phases.outcome, "success");
  assert.equal(result.payload.role_result_refs.length, 2);
  assert.equal(typeof result.payload.role_join_ref, "string");
  assert.equal(typeof result.payload.execution_lineage_ref, "string");
  assert.equal(typeof result.payload.learning_loop_ref, "string");

  const proofArtifact = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(proofArtifact.proof_type, "runtime-loop-proof");

  const learningLoop = JSON.parse(await fs.readFile(path.join(projectRoot, result.payload.learning_loop_ref), "utf8"));
  assert.equal(learningLoop.learning_state.has_outcome_evidence, true);
  assert.equal(learningLoop.improvement_proposal.proposal_basis, "framework-self-audit");

  const lineage = JSON.parse(await fs.readFile(path.join(projectRoot, result.payload.execution_lineage_ref), "utf8"));
  assert.equal(lineage.role_result_count, 2);
  assert.equal(lineage.role_join_count, 1);
  assert.equal(lineage.team_output_count, 1);
  assert.equal(lineage.council_review_count, 1);
});

test("runtimeDisciplineBenchmarkCommand writes reusable RD-003 and RD-004 benchmark summaries", async (t) => {
  const projectRoot = await createTempProject(t);

  await runtimeLoopProofCommand({
    project: projectRoot,
    provider: "mock",
    sourceTaskId: "TASK-011"
  });
  await organizationAuditCommand({
    project: projectRoot
  });

  const result = await runtimeDisciplineBenchmarkCommand({
    project: projectRoot,
    sourceTaskId: "TASK-011"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  const markdown = await fs.readFile(result.markdownPath, "utf8");
  assert.equal(payload.artifact_type, "runtime-discipline-benchmark-run");
  assert.equal(payload.source_task_id, "TASK-011");
  assert.equal(payload.rd001.status, "pass");
  assert.equal(payload.rd001.task_count, 0);
  assert.equal(payload.rd001.execution_packet_count, 0);
  assert.equal(payload.rd002.status, "pass");
  assert.equal(payload.rd002.failure_family_count, 3);
  assert.equal(payload.rd002.failure_families.length, 3);
  const missingJoinFamily = payload.rd002.failure_families.find((family) => family.family_id === "missing-join-and-review");
  const missingCouncilFamily = payload.rd002.failure_families.find((family) => family.family_id === "missing-council-review-only");
  const missingTeamOutputFamily = payload.rd002.failure_families.find((family) => family.family_id === "missing-team-output-and-review");
  assert.deepEqual(missingJoinFamily.missing_artifact_refs, ["role-join", "team-output", "council-review"]);
  assert.equal(missingJoinFamily.role_result_count, 1);
  assert.equal(missingJoinFamily.role_join_count, 0);
  assert.deepEqual(missingCouncilFamily.missing_artifact_refs, ["council-review"]);
  assert.equal(missingCouncilFamily.role_join_count, 1);
  assert.equal(missingCouncilFamily.team_output_count, 1);
  assert.deepEqual(missingTeamOutputFamily.missing_artifact_refs, ["team-output", "council-review"]);
  assert.equal(missingTeamOutputFamily.role_join_count, 1);
  assert.equal(missingTeamOutputFamily.team_output_count, 0);
  assert.equal(payload.rd003.status, "pass");
  assert.equal(payload.rd004.status, "pass");
  assert.equal(typeof payload.rd004.generated_audit_note_ref, "string");
  assert.equal(typeof payload.rd004.generated_audit_packet_ref, "string");
  assert.equal(typeof payload.rd004.generated_reconstruction_map_ref, "string");
  assert.equal(typeof payload.rd004.generated_audit_index_ref, "string");
  assert.equal(typeof payload.rd004.generated_audit_gate_ref, "string");
  assert.equal(typeof payload.rd004.generated_audit_shortcut_ref, "string");
  assert.equal(payload.rd004.primary_artifact_count > 0, true);
  assert.equal(payload.rd004.extended_artifact_count >= payload.rd004.primary_artifact_count, true);
  assert.equal(payload.rd004.audit_cost_score > 0, true);
  assert.equal(payload.rd004.cost_thresholds.primary_artifact_limit, 4);
  assert.equal(payload.rd004.cost_thresholds.extended_artifact_limit, 13);
  assert.equal(payload.rd004.cost_thresholds.score_limit, 17);
  const auditPacket = JSON.parse(await fs.readFile(path.join(projectRoot, payload.rd004.generated_audit_packet_ref), "utf8"));
  const reconstructionMap = JSON.parse(await fs.readFile(path.join(projectRoot, payload.rd004.generated_reconstruction_map_ref), "utf8"));
  const auditIndex = JSON.parse(await fs.readFile(path.join(projectRoot, payload.rd004.generated_audit_index_ref), "utf8"));
  const auditGate = JSON.parse(await fs.readFile(path.join(projectRoot, payload.rd004.generated_audit_gate_ref), "utf8"));
  const auditShortcut = JSON.parse(await fs.readFile(path.join(projectRoot, payload.rd004.generated_audit_shortcut_ref), "utf8"));
  assert.equal(auditPacket.packet_type, "rd004-human-audit-summary");
  assert.equal(auditPacket.review_checklist.length, 5);
  assert.equal(auditPacket.review_checklist.every((entry) => entry.status === "pass"), true);
  assert.equal(auditPacket.fail_triggers.length, 4);
  assert.equal(auditPacket.audit_cost_score, payload.rd004.audit_cost_score);
  assert.equal(reconstructionMap.packet_type, "rd004-audit-reconstruction-map");
  assert.equal(reconstructionMap.reconstruction_steps.length, 4);
  assert.equal(reconstructionMap.negative_runtime_families.length, 3);
  assert.equal(reconstructionMap.audit_cost.score, payload.rd004.audit_cost_score);
  assert.equal(auditIndex.packet_type, "rd004-audit-index");
  assert.equal(auditIndex.low_cost_review_path.length, 4);
  assert.equal(auditIndex.compressed_counts.primary_artifact_count, payload.rd004.primary_artifact_count);
  assert.equal(auditIndex.required_refs.generated_reconstruction_map_ref, payload.rd004.generated_reconstruction_map_ref);
  assert.equal(auditGate.packet_type, "rd004-audit-gate");
  assert.equal(auditGate.gate_count, 4);
  assert.equal(auditGate.blocking_gate_count, 0);
  assert.equal(auditGate.gates.every((gate) => gate.status === "pass"), true);
  assert.equal(auditShortcut.packet_type, "rd004-audit-shortcut");
  assert.equal(auditShortcut.low_cost_review_path.length, 4);
  assert.equal(auditShortcut.gate_checks.length, 4);
  assert.equal(auditShortcut.gate_checks.every((gate) => gate.status === "pass"), true);
  assert.equal(auditShortcut.canonical_review_surface.runtime_loop_proof_ref, payload.runtime_loop_proof_ref);
  assert.equal(auditShortcut.negative_runtime_family_ids.length, 3);
  assert.equal(Number.isInteger(payload.audit.organization_checks.passed), true);
  assert.equal(Number.isInteger(payload.audit.decision_checks.passed), true);
  assert.match(markdown, /RD-001/);
  assert.match(markdown, /RD-002/);
  assert.match(markdown, /missing-council-review-only/);
  assert.match(markdown, /missing-team-output-and-review/);
  assert.match(markdown, /RD-004/);
  assert.match(markdown, /Generated audit note/);
  assert.match(markdown, /Generated audit packet/);
  assert.match(markdown, /Generated reconstruction map/);
  assert.match(markdown, /Generated audit index/);
  assert.match(markdown, /Generated audit gate/);
  assert.match(markdown, /Generated audit shortcut/);
  assert.match(markdown, /Remaining Gap/);
});

test("organizationAnalyticsSnapshotCommand writes an inspectable organization analytics artifact", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-analytics-"));
  const projectRoot = path.join(tempRoot, "target-project");
  await fs.mkdir(projectRoot, { recursive: true });
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  await initProjectCommand({
    project: projectRoot,
    topology: "managed-project",
    projectType: "web-app",
    domainSummary: "Internal operations dashboard",
    installMode: "runtime-on"
  });

  await taskOpenCommand({
    project: projectRoot,
    title: "Create analytics slice"
  });

  const result = await organizationAnalyticsSnapshotCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.snapshot_type, "aof-organization-analytics");
  assert.equal(typeof result.payload.contract_health.coverage_ratio, "number");
  assert.ok(Array.isArray(result.payload.observations));
});

test("organizationStatusCommand returns an operator-facing organization summary", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await organizationStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.topology, "managed-project");
  assert.equal(typeof result.goals.next_value_slice, "string");
  assert.equal(result.organization_summary.council_count > 0, true);
  assert.equal(result.command_surface.command_registry_present, true);
  assert.equal(result.command_surface.command_count > 0, true);
});

test("commandRegistryRefreshCommand writes the canonical command registry artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await commandRegistryRefreshCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  const registry = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(registry.artifact_type, "command-registry");
  assert.equal(registry.commands.some((entry) => entry.command === "command-register"), true);
});

test("commandRegisterCommand exposes command taxonomy and top commands", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await commandRegisterCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.command_count > 0, true);
  assert.equal(result.top_commands.includes("organization-status"), true);
  assert.equal(result.commands.some((entry) => entry.category === "verify"), true);
});

test("commandRoutingAuditCommand reports aligned routing surfaces as green", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await commandRoutingAuditCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.errors.length, 0);
});

test("commandRoutingAuditCommand detects routing drift", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const orientationPath = path.join(projectRoot, ".aof", "context", "active", "project-orientation.json");
  const orientation = JSON.parse(await fs.readFile(orientationPath, "utf8"));
  orientation.command_routing_summary.top_commands = [];
  await fs.writeFile(orientationPath, `${JSON.stringify(orientation, null, 2)}\n`, "utf8");

  const result = await commandRoutingAuditCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.ok(result.summary.errors.some((entry) => entry.includes("top command")));
});

test("releaseStateRefreshCommand writes an active release manifest and repairs active refs", async (t) => {
  const projectRoot = await createInitializedProject(t);
  await ensureReleaseContractFixture(projectRoot);

  const result = await releaseStateRefreshCommand({
    project: projectRoot,
    releaseVersion: "3.4.0",
    releaseTag: "v3.4.0",
    releaseDefinitionRef: "docs/v3.4-release-definition.md",
    releaseNotesRef: "docs/v3.4.0-release-notes.md",
    releaseChecklistRef: "docs/v3.4-release-checklist.md",
    organizationMission: "Keep the self-hosting runtime truthful about the active release baseline after a real release."
  });

  assert.equal(result.ok, true);
  const manifest = JSON.parse(await fs.readFile(result.activeReleaseManifestPath, "utf8"));
  const bootstrap = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "project-bootstrap.json"), "utf8"));
  const organization = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "organization.json"), "utf8"));
  const releaseContract = organization.contracts.find((contract) => contract.contract_id === "contract-governance-to-release");

  assert.equal(manifest.release_version, "3.4.0");
  assert.equal(bootstrap.aof_version, "3.4.0");
  assert.equal(releaseContract.artifact_ref, "docs/v3.4-release-definition.md");
  assert.match(organization.mission, /active release baseline/i);
});

test("releaseStateAuditCommand reports aligned release-state surfaces as green", async (t) => {
  const projectRoot = await createInitializedProject(t);
  await ensureReleaseRefFixtures(projectRoot);
  await ensureReleaseContractFixture(projectRoot);

  await releaseStateRefreshCommand({
    project: projectRoot,
    releaseVersion: "3.4.0",
    releaseTag: "v3.4.0",
    releaseDefinitionRef: "docs/v3.4-release-definition.md",
    releaseNotesRef: "docs/v3.4.0-release-notes.md",
    releaseChecklistRef: "docs/v3.4-release-checklist.md"
  });

  const result = await releaseStateAuditCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.equal(result.summary.active_release.release_tag, "v3.4.0");
  assert.equal(result.summary.errors.length, 0);
});

test("releaseStateAuditCommand detects bootstrap and contract drift", async (t) => {
  const projectRoot = await createInitializedProject(t);
  await ensureReleaseRefFixtures(projectRoot);
  await ensureReleaseContractFixture(projectRoot);

  await releaseStateRefreshCommand({
    project: projectRoot,
    releaseVersion: "3.4.0",
    releaseTag: "v3.4.0",
    releaseDefinitionRef: "docs/v3.4-release-definition.md",
    releaseNotesRef: "docs/v3.4.0-release-notes.md",
    releaseChecklistRef: "docs/v3.4-release-checklist.md"
  });

  const bootstrapPath = path.join(projectRoot, ".aof", "project-bootstrap.json");
  const organizationPath = path.join(projectRoot, ".aof", "organization.json");
  const bootstrap = JSON.parse(await fs.readFile(bootstrapPath, "utf8"));
  bootstrap.aof_version = "2.2.0";
  await fs.writeFile(bootstrapPath, `${JSON.stringify(bootstrap, null, 2)}\n`, "utf8");

  const organization = JSON.parse(await fs.readFile(organizationPath, "utf8"));
  const releaseContract = organization.contracts.find((contract) => contract.contract_id === "contract-governance-to-release");
  releaseContract.artifact_ref = "docs/v3.0-release-definition.md";
  await fs.writeFile(organizationPath, `${JSON.stringify(organization, null, 2)}\n`, "utf8");

  const result = await releaseStateAuditCommand({ project: projectRoot });

  assert.equal(result.ok, false);
  assert.ok(result.summary.errors.some((entry) => entry.includes("bootstrap version alignment")));
  assert.ok(result.summary.errors.some((entry) => entry.includes("governance release contract alignment")));
});

test("organizationStatusCommand exposes active release manifest when present", async (t) => {
  const projectRoot = await createInitializedProject(t);
  await ensureReleaseContractFixture(projectRoot);

  await releaseStateRefreshCommand({
    project: projectRoot,
    releaseVersion: "3.4.0",
    releaseTag: "v3.4.0",
    releaseDefinitionRef: "docs/v3.4-release-definition.md",
    releaseNotesRef: "docs/v3.4.0-release-notes.md",
    releaseChecklistRef: "docs/v3.4-release-checklist.md"
  });

  const result = await organizationStatusCommand({
    project: projectRoot
  });

  assert.equal(result.active_release.release_version, "3.4.0");
  assert.equal(result.active_release.release_definition_ref, "docs/v3.4-release-definition.md");
});

test("contractRegisterCommand lists declared contracts with artifact presence", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await contractRegisterCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.contracts), true);
  assert.equal(result.contract_count, result.contracts.length);
  assert.equal(result.contracts.every((entry) => typeof entry.artifact_present === "boolean"), true);
});

test("dependencyGraphCommand returns declared dependency edges and adjacency", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await dependencyGraphCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.dependencies), true);
  assert.equal(result.dependency_count, result.dependencies.length);
  assert.equal(typeof result.adjacency, "object");
});

test("decisionRegisterCommand lists decision artifacts and pair alignment", async (t) => {
  const projectRoot = await createTempProjectWithDecisions(t);

  const result = await decisionRegisterCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.decision_count > 0, true);
  assert.equal(result.decisions.some((entry) => entry.pair_alignment_state === "aligned"), true);
});

test("decisionRegisterCommand respects declared canonical markdown when no template manifest exists", async (t) => {
  const projectRoot = await createInitializedProjectWithDocsDecision(t);

  const result = await decisionRegisterCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.decision_count, 1);
  assert.equal(result.decisions[0].canonical_markdown_path, "docs/ADR-001.md");
  assert.equal(result.decisions[0].pair_alignment_state, "aligned");
});

test("roadmapStatusCommand groups tasks by roadmap track", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Define v2.3 operator-facing organization surfaces",
    triageNotes: "organization-status and roadmap-status"
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.release_tracks["v2.3"]), true);
  assert.equal(result.release_tracks["v2.3"].length > 0, true);
});

test("roadmapStatusCommand resolves current release definition through the active release manifest when present", async (t) => {
  const projectRoot = await createInitializedProject(t);
  await ensureReleaseContractFixture(projectRoot);

  await releaseStateRefreshCommand({
    project: projectRoot,
    releaseVersion: "3.4.0",
    releaseTag: "v3.4.0",
    releaseDefinitionRef: "docs/v3.4-release-definition.md",
    releaseNotesRef: "docs/v3.4.0-release-notes.md",
    releaseChecklistRef: "docs/v3.4-release-checklist.md"
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.roadmap_refs.current_release_definition, "docs/v3.4-release-definition.md");
  assert.equal(result.active_release.release_version, "3.4.0");
});

test("roadmapStatusCommand maps discovery-layer research work into the v3.0 track", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Design Discovery Layer and Discovery-to-Delivery handoff contract",
    description: "Evaluate Discovery Layer through discovery question-set, breakthrough-pattern, assumption map, anomaly log, and handoff artifacts."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.release_tracks["v3.0"]), true);
  assert.equal(
    result.release_tracks["v3.0"].some((task) => task.title === "Design Discovery Layer and Discovery-to-Delivery handoff contract"),
    true
  );
});

test("roadmapStatusCommand keeps v3.0 runtime-loop tasks in the v3.0 track even when allocation terms appear in the description", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Prove v3.0 backend-neutral organization runtime loop",
    description: "Demonstrate one auditable end-to-end organization loop from framing through allocation, execution, review, outcome, and next-step recommendation across a backend-neutral orchestration contract."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(
    result.release_tracks["v3.0"].some((task) => task.title === "Prove v3.0 backend-neutral organization runtime loop"),
    true
  );
  assert.equal(
    result.release_tracks["v2.5"].some((task) => task.title === "Prove v3.0 backend-neutral organization runtime loop"),
    false
  );
});

test("roadmapStatusCommand maps visibility projection work into the v2.6 track", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Project active .aof operating state into visibility outputs automatically",
    description: "Export status_card, timeline_feed, and flow_snapshot JSON from live runtime state."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.release_tracks["v2.6"]), true);
  assert.equal(
    result.release_tracks["v2.6"].some((task) => task.title === "Project active .aof operating state into visibility outputs automatically"),
    true
  );
});

test("roadmapStatusCommand does not classify historical visibility mentions as v2.6 release work", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Ship v2.0 bootstrap installer and canonical docs set",
    description: "AOF needs a managed-project bootstrap path that installs the canonical .aof file set and AI-readable operating packet.",
    triageNotes: "Renumbered after a historical visibility-output task collision."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(
    result.release_tracks["v2.6"].some((task) => task.title === "Ship v2.0 bootstrap installer and canonical docs set"),
    false
  );
  assert.equal(
    result.release_tracks["v2.0"].some((task) => task.title === "Ship v2.0 bootstrap installer and canonical docs set"),
    true
  );
});

test("roadmapStatusCommand maps Mission Control visibility work into the v3.6 track", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Implement v3.6 bounded Mission Control visibility layer",
    description: "Add mission overview, artifact graph, blocker visibility, and recommended next action derived from canonical runtime artifacts."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.release_tracks["v3.6"]), true);
  assert.equal(
    result.release_tracks["v3.6"].some((task) => task.title === "Implement v3.6 bounded Mission Control visibility layer"),
    true
  );
});

test("visibilityExportCommand writes runtime-backed visibility views consumable by the viewer", async (t) => {
  const projectRoot = await createInitializedProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Project active .aof operating state into visibility outputs automatically",
    description: "Export status_card, timeline_feed, and flow_snapshot JSON from live runtime state."
  });

  await taskOpenCommand({
    project: projectRoot,
    title: "Define v2.6 runtime-backed visibility projection layer",
    description: "Add a first-class runtime command that exports status_card, timeline_feed, and flow_snapshot JSON from live .aof artifacts."
  });

  const result = await visibilityExportCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  const views = await loadVisibilityViews({
    statusInput: result.statusPath,
    timelineInput: result.timelinePath,
    flowInput: result.flowPath,
    missionInput: result.missionPath
  });

  assert.equal(views.status_card.view_type, "status_card");
  assert.equal(views.status_card.usage_level, "runtime-backed");
  assert.equal(views.timeline_feed.view_type, "timeline_feed");
  assert.equal(views.timeline_feed.entries.length > 0, true);
  assert.equal(views.flow_snapshot.view_type, "flow_snapshot");
  assert.equal(views.flow_snapshot.current_node, "visibility_projection");
  assert.equal(views.mission_control.view_type, "mission_control");
  assert.equal(typeof views.mission_control.next_action.recommended_action, "string");
  assert.equal(
    views.flow_snapshot.ordered_nodes.some((node) => node.id === "runtime_loop_proof"),
    true
  );
});

test("missionControlBenchmarkCommand proves Mission Control stage transitions from baseline through implementation-ready", async () => {
  const result = await missionControlBenchmarkCommand({
    project: repoRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.benchmarks["MC-001"].status, "pass");
  assert.equal(result.summary.benchmarks["MC-002"].status, "pass");
  assert.equal(result.summary.benchmarks["MC-003"].status, "pass");
  assert.equal(result.summary.benchmarks["MC-004"].status, "pass");
  assert.equal(result.summary.benchmarks["MC-005"].status, "pass");
  assert.deepEqual(
    result.summary.snapshots.map((entry) => entry.stage),
    ["visibility-baseline", "discovery-handoff", "planning-ready", "implementation-ready"]
  );
});

test("organizationAuditCommand reports duplicate task lifecycle state as a failure", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Detect duplicate task lifecycle state"
  });

  const duplicatePath = path.join(projectRoot, ".aof", "tasks", "done", "TASK-001.json");
  const openPath = path.join(projectRoot, ".aof", "tasks", "open", "TASK-001.json");
  await fs.copyFile(openPath, duplicatePath);

  const result = await organizationAuditCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.equal(result.payload.task_integrity.ok, false);
  assert.equal(result.payload.task_integrity.duplicate_task_count, 1);
});

test("learningLoopSnapshotCommand writes a seeded loop artifact when no outcome exists", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-learning-seeded-"));
  const projectRoot = path.join(tempRoot, "target-project");
  await fs.mkdir(projectRoot, { recursive: true });
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  await initProjectCommand({
    project: projectRoot,
    topology: "managed-project",
    projectType: "web-app",
    domainSummary: "Internal operations dashboard",
    installMode: "runtime-on"
  });

  const result = await learningLoopSnapshotCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.snapshot_type, "aof-learning-loop");
  assert.equal(result.payload.learning_state.has_outcome_evidence, false);
  assert.equal(result.payload.learning_state.has_next_value_slice, true);
});

test("learningLoopSnapshotCommand connects outcome, self-audit, and improvement focus", async (t) => {
  const projectRoot = await createTempProject(t);

  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

  await outcomeReportCommand({
    session: runResult.sessionPath,
    result: "success",
    note: "登録導線の KPI が改善した",
    signalRef: "SIG-001"
  });

  await selfAuditRecordCommand({
    project: projectRoot,
    auditId: "FSA-LOOP-001",
    scope: "post-outcome review",
    summary: "An outcome was captured and should be folded into the next improvement slice.",
    detectedGap: "The improvement loop still needs an explicit artifact connecting outcome and follow-up action.",
    nextAction: "formalize the next improvement focus from the latest outcome evidence",
    relatedTaskIds: ["TASK-004"],
    maxEntries: 3
  });

  const result = await learningLoopSnapshotCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.learning_state.has_outcome_evidence, true);
  assert.equal(result.payload.learning_state.has_self_audit, true);
  assert.equal(result.payload.learning_state.loop_state, "improving");
  assert.equal(result.payload.improvement_proposal.proposal_basis, "framework-self-audit");
});

test("learningLoopSnapshotCommand skips unreadable session artifacts and still returns the latest valid outcome", async (t) => {
  const projectRoot = await createTempProject(t);

  const validSessionPath = path.join(projectRoot, ".aof", "sessions", "SESS-VALID-001.json");
  const brokenSessionPath = path.join(projectRoot, ".aof", "sessions", "SESS-BROKEN-001.json");

  await fs.writeFile(validSessionPath, JSON.stringify({
    session_id: "SESS-VALID-001",
    outcome_reports: [
      {
        report_id: "OUT-VALID-001",
        result: "failure",
        observed_at: "2026-06-15T10:00:00.000Z",
        note: "Operator rejected the result.",
        signal_ref: "SIG-REJECT-001"
      }
    ]
  }, null, 2));

  const result = await learningLoopSnapshotCommand({
    project: projectRoot
  }, {
    listJsonFiles: async () => [brokenSessionPath, validSessionPath],
    readJson: async (filePath, label) => {
      if (filePath === brokenSessionPath) {
        throw new Error(`${label} is unreadable`);
      }
      return JSON.parse(await fs.readFile(filePath, "utf8"));
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.latest_outcome.report_id, "OUT-VALID-001");
  assert.equal(result.skippedUnreadableSessions.length, 1);
  assert.match(result.payload.observations.at(-1), /Skipped unreadable session artifacts: 1/);
});

test("taskUpdateCommand moves a task across lifecycle directories", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Ship runtime write path",
    origin: "orchestrator",
    orchestratorSessionId: "SESS-ORCH-001",
    operatingGoalRef: "self-hosting-gap"
  });

  const result = await taskUpdateCommand({
    project: projectRoot,
    taskId: "TASK-001",
    status: "done",
    relatedDecisionRecordId: "DEC-003",
    triageNotes: "Completed in self-hosting slice"
  });

  assert.equal(result.ok, true);
  assert.equal(result.taskPath.endsWith(path.join(".aof", "tasks", "done", "TASK-001.json")), true);

  await assert.rejects(
    fs.access(path.join(projectRoot, ".aof", "tasks", "open", "TASK-001.json"))
  );

  const payload = JSON.parse(await fs.readFile(result.taskPath, "utf8"));
  assert.equal(payload.status, "done");
  assert.equal(payload.related_decision_record_id, "DEC-003");
  assert.equal(typeof payload.done_at, "string");
});

test("taskUpdateCommand consolidates duplicate lifecycle files for the same task id", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Consolidate duplicate lifecycle state"
  });

  const openPath = path.join(projectRoot, ".aof", "tasks", "open", "TASK-001.json");
  const duplicateDonePath = path.join(projectRoot, ".aof", "tasks", "done", "TASK-001.json");
  const duplicatePayload = JSON.parse(await fs.readFile(openPath, "utf8"));
  duplicatePayload.status = "done";
  duplicatePayload.updated_at = "2026-06-01T00:00:00.000Z";
  duplicatePayload.done_at = "2026-06-01T00:00:00.000Z";
  await fs.mkdir(path.dirname(duplicateDonePath), { recursive: true });
  await fs.writeFile(duplicateDonePath, `${JSON.stringify(duplicatePayload, null, 2)}\n`, "utf8");

  const result = await taskUpdateCommand({
    project: projectRoot,
    taskId: "TASK-001",
    status: "done",
    triageNotes: "Canonical done state after duplicate cleanup"
  });

  assert.equal(result.ok, true);
  await assert.rejects(fs.access(openPath));
  await fs.access(duplicateDonePath);

  const finalPayload = JSON.parse(await fs.readFile(duplicateDonePath, "utf8"));
  assert.equal(finalPayload.status, "done");
  assert.equal(finalPayload.triage_notes, "Canonical done state after duplicate cleanup");
});

test("confirmationWindowRecordCommand persists only the latest confirmation entries", async (t) => {
  const projectRoot = await createTempProject(t);

  await confirmationWindowRecordCommand({
    project: projectRoot,
    question: "まだ解くべき問題は同じか",
    answer: "はい",
    expectationState: "problem unchanged",
    maxEntries: 2
  });

  await confirmationWindowRecordCommand({
    project: projectRoot,
    question: "次の value slice は妥当か",
    answer: "はい、まず write path",
    scaleDirection: "implement runtime write path",
    maxEntries: 2
  });

  await confirmationWindowRecordCommand({
    project: projectRoot,
    question: "期待に近づいているか",
    answer: "一部。confirmation memory はまだ無い",
    mismatchState: "recent confirmation window missing",
    maxEntries: 2
  });

  const windowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const payload = JSON.parse(await fs.readFile(windowPath, "utf8"));
  assert.equal(payload.window_type, "recent-confirmation-window");
  assert.equal(payload.entries.length, 2);
  assert.equal(payload.entries[0].question, "次の value slice は妥当か");
  assert.equal(payload.entries[1].question, "期待に近づいているか");
});

test("loadTemplate fails when a required actor role is missing", async (t) => {
  const projectRoot = await createTempProject(t);
  const actorPath = path.join(projectRoot, ".aof", "actors", "visionary.yaml");
  const brokenActor = [
    "actor_id: visionary-worker-01",
    "display_name: Visionary Worker",
    "kind: ai",
    "capabilities:",
    "  - product-framing",
    "  - requirements-review",
    "policy_profile: default-product-policy",
    ""
  ].join("\n");
  await fs.writeFile(actorPath, brokenActor, "utf8");

  await assert.rejects(
    loadTemplate(projectRoot),
    /actor\.roles must be an array|actor\.roles must be a non-empty array/
  );
});

test("loadTemplate accepts optional clarification term overrides in organization config", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  use_default_high_stakes_patterns: false",
      "  use_default_brownfield_patterns: false",
      "  high_stakes_terms:",
      "    - structural",
      "  brownfield_terms:",
      "    - retrofit",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);

  assert.equal(template.organization.clarification.use_default_high_stakes_patterns, false);
  assert.equal(template.organization.clarification.use_default_brownfield_patterns, false);
  assert.deepEqual(template.organization.clarification.high_stakes_terms, ["structural"]);
  assert.deepEqual(template.organization.clarification.brownfield_terms, ["retrofit"]);
});

test("loadTemplate accepts partial clarification copy overrides and rejects malformed copy blocks", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  copy:",
      "    en:",
      "      questions:",
      "        scope: Which physical area should this redesign cover first?",
      "      summary_initial_questions: runtime generated architecture-specific clarification questions",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  assert.equal(
    template.organization.clarification.copy.en.questions.scope,
    "Which physical area should this redesign cover first?"
  );

  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  copy:",
      "    en:",
      "      questions:",
      "        scope:",
      "          label: bad-shape",
      ""
    ].join("\n"),
    "utf8"
  );

  await assert.rejects(
    loadTemplate(projectRoot),
    /organization\.clarification\.copy\.en\.questions\.scope must be a non-empty string/
  );
});

test("loadTemplate accepts clarification question policy and rejects malformed priority keys", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  question_policy:",
      "    initial_question_budget: 2",
      "    followup_budget: 1",
      "    max_rounds: 2",
      "    priority_order:",
      "      - high-stakes-risk",
      "      - missing-constraint",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  assert.equal(template.organization.clarification.question_policy.initial_question_budget, 2);
  assert.deepEqual(template.organization.clarification.question_policy.priority_order, [
    "high-stakes-risk",
    "missing-constraint"
  ]);

  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  question_policy:",
      "    priority_order:",
      "      - scope",
      ""
    ].join("\n"),
    "utf8"
  );

  await assert.rejects(
    loadTemplate(projectRoot),
    /organization\.clarification\.question_policy\.priority_order contains an unsupported key/
  );
});

test("generic example template loads successfully", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const template = await loadTemplate(projectRoot);

  assert.equal(template.organization.organization_id, "civic-studio");
  assert.equal(template.workflowId, "service-design");
  assert.equal(template.workflow.name, "Service Design");
  assert.deepEqual(template.workflow.decision_points, ["concept-approval", "launch-approval"]);
  assert.equal(template.organization.clarification.use_default_high_stakes_patterns, false);
  assert.equal(
    template.organization.clarification.copy.en.questions.scope,
    "Which service touchpoint or environment should this redesign cover, and what should stay out of scope?"
  );
});

test("loadTemplate accepts empty decision_points and actor capabilities arrays", async (t) => {
  const projectRoot = await createTempProject(t);
  const workflowPath = path.join(projectRoot, ".aof", "workflows", "aidlc.yaml");
  const actorPath = path.join(projectRoot, ".aof", "actors", "builder.yaml");

  const relaxedWorkflow = [
    "workflow_id: aidlc",
    "name: AI-Driven Lifecycle",
    "entry_conditions: []",
    "stages:",
    "  - clarification",
    "  - planning",
    "  - proposal",
    "  - review",
    "  - approval",
    "decision_points: []",
    "default_governance_scope: requirements-approval",
    "default_routing_mode: deep-path",
    ""
  ].join("\n");

  const relaxedActor = [
    "actor_id: implementation-worker-01",
    "display_name: Builder Worker",
    "kind: ai",
    "roles:",
    "  - Builder",
    "capabilities: []",
    "policy_profile: default-product-policy",
    ""
  ].join("\n");

  await fs.writeFile(workflowPath, relaxedWorkflow, "utf8");
  await fs.writeFile(actorPath, relaxedActor, "utf8");

  const template = await loadTemplate(projectRoot);
  assert.deepEqual(template.workflow.decision_points, []);
  assert.deepEqual(template.actors.find((actor) => actor.actor_id === "implementation-worker-01")?.capabilities, []);
});

test("loadTemplate still rejects empty workflow stages", async (t) => {
  const projectRoot = await createTempProject(t);
  const workflowPath = path.join(projectRoot, ".aof", "workflows", "aidlc.yaml");
  const invalidWorkflow = [
    "workflow_id: aidlc",
    "name: AI-Driven Lifecycle",
    "entry_conditions: []",
    "stages: []",
    "decision_points:",
    "  - requirements-approval",
    "default_governance_scope: requirements-approval",
    "default_routing_mode: deep-path",
    ""
  ].join("\n");

  await fs.writeFile(workflowPath, invalidWorkflow, "utf8");

  await assert.rejects(
    loadTemplate(projectRoot),
    /workflow\.stages must be a non-empty array/
  );
});

test("runCommand uses English clarification questions when organization.language is en", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  const englishOrg = [
    "organization_id: product-team",
    "name: Product Team",
    "language: en",
    "mission: Deliver software outcomes through AIDLC",
    "governance_scopes:",
    "  - requirements-approval",
    "  - design-approval",
    "  - release-approval",
    ""
  ].join("\n");
  await fs.writeFile(organizationPath, englishOrg, "utf8");

  const result = await runCommand({
    project: projectRoot,
    request: "Improve the onboarding flow for new users"
  });

  assert.equal(result.pendingQuestions[0], "What exactly should be improved, and what scope should this effort cover?");
  const session = await loadSession(result.sessionPath);
  assert.equal(session.organization.language, "en");
  assert.equal(
    session.clarification.clarification_summary,
    "runtime identified initial clarification gaps and generated first-round user questions"
  );
});

test("deriveInitialClarification respects domain-specific clarification term overrides", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  use_default_high_stakes_patterns: false",
      "  use_default_brownfield_patterns: false",
      "  high_stakes_terms:",
      "    - structural",
      "  brownfield_terms:",
      "    - retrofit",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  const clarification = deriveInitialClarification(
    "Need a structural retrofit for the west wing",
    template
  );

  assert.equal(clarification.dimensions.risk_exposure, "conflicting");
  assert.equal(clarification.dimensions.brownfield_orientation_completeness, "partial");
  assert.ok(clarification.trigger_classes.includes("high-stakes-risk"));
  assert.ok(
    clarification.gaps.some((gap) => gap.trigger_class === "brownfield-gap")
  );

  const noBrownfieldFromDefault = deriveInitialClarification(
    "Improve the visitor flow",
    template
  );
  assert.equal(noBrownfieldFromDefault.dimensions.brownfield_orientation_completeness, "clear");
  assert.equal(noBrownfieldFromDefault.trigger_classes.includes("brownfield-gap"), false);
});

test("deriveInitialClarification applies partial clarification copy overrides", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver service outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  copy:",
      "    en:",
      "      questions:",
      "        scope: Which service environment should be redesigned first?",
      "      rationales:",
      "        scope: This keeps the service redesign bounded before planning.",
      "      summary_initial_questions: runtime generated service-specific clarification questions",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  const clarification = deriveInitialClarification(
    "Improve the visitor check-in experience",
    template
  );

  assert.equal(
    clarification.pending_questions[0].question,
    "Which service environment should be redesigned first?"
  );
  assert.equal(
    clarification.pending_questions[0].rationale,
    "This keeps the service redesign bounded before planning."
  );
  assert.equal(
    clarification.clarification_summary,
    "runtime generated service-specific clarification questions"
  );
  assert.equal(
    clarification.pending_questions[1].question,
    "How should improvement success be judged: which metric or end state matters most?"
  );
});

test("visibility view loader and HTML shell align with the v1.4 visibility contract", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-visibility-"));
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const fixture = await writeVisibilityFixture(tempRoot);
  const views = await loadVisibilityViews({
    statusInput: fixture.statusPath,
    timelineInput: fixture.timelinePath,
    flowInput: fixture.flowPath,
    missionInput: fixture.missionPath
  });

  assert.equal(views.status_card.view_type, "status_card");
  assert.equal(views.timeline_feed.entries[0].event_type, "candidate_selected");
  assert.equal(views.flow_snapshot.current_node, "selected");
  assert.equal(views.flow_snapshot.ordered_nodes.length, 3);
  assert.equal(views.derived.flow_metrics.total_steps, 3);
  assert.equal(views.derived.flow_metrics.current_step_index, 2);
  assert.equal(views.derived.narrative.current_position.step_progress, "2 / 3");
  assert.equal(views.derived.narrative.next_action.immediate_next_step, "candidate_published");
  assert.equal(views.derived.narrative.remaining_work.remaining_steps_after_current, 1);
  assert.equal(views.derived.current_node_detail.node_label, "candidate_selected");
  assert.equal(views.derived.current_node_detail.substep_progress, "1 / 3");
  assert.equal(views.derived.current_node_detail.current_substep_label, "Final Review");
  assert.equal(views.derived.current_node_detail.next_substep_label, "Ready To Publish");
  assert.equal(views.derived.current_node_detail.branches[0].label, "approve and publish");
  assert.equal(views.derived.current_node_detail.loopbacks[0].to, "generated");
  assert.equal(views.mission_control.view_type, "mission_control");
  assert.equal(views.mission_control.runtime_position.current_phase, "planning-ready");
  assert.equal(views.mission_control.next_action.recommended_action, "verify publish artifact before 10:00 JST");

  const html = buildVisibilityPageHtml("Test Visibility");
  assert.match(html, /Test Visibility/);
  assert.match(html, /Mission Control viewer/);
  assert.match(html, /status-root/);
  assert.match(html, /overview-root/);
  assert.match(html, /node-root/);
  assert.match(html, /timeline-root/);
  assert.match(html, /flow-root/);
  assert.match(html, /progress-donut/);
});
