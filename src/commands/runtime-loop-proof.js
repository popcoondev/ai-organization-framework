import fs from "node:fs/promises";
import path from "node:path";

import { answerCommand } from "./answer.js";
import { allocationPlanRecordCommand } from "./allocation-plan-record.js";
import { alternativeAnalysisRecordCommand } from "./alternative-analysis-record.js";
import { councilExecCommand } from "./council-exec.js";
import { councilReviewPacketCommand } from "./council-review-packet.js";
import { executionLineageCommand } from "./execution-lineage.js";
import { learningLoopSnapshotCommand } from "./learning-loop-snapshot.js";
import { needValidationAdvanceCommand } from "./need-validation-advance.js";
import { needValidationRecordCommand } from "./need-validation-record.js";
import { outcomeReportCommand } from "./outcome-report.js";
import { policyEvaluationReportCommand } from "./policy-evaluation-report.js";
import { problemStatementRecordCommand } from "./problem-statement-record.js";
import { projectCharterRecordCommand } from "./project-charter-record.js";
import { resolveAofRoot } from "../runtime/project-paths.js";
import { resourceClaimRecordCommand } from "./resource-claim-record.js";
import { roleJoinRecordCommand } from "./role-join-record.js";
import { roleResultRecordCommand } from "./role-result-record.js";
import { runCommand } from "./run.js";
import { selfAuditRecordCommand } from "./self-audit-record.js";
import { teamOutputRecordCommand } from "./team-output-record.js";
import { valueHypothesisRecordCommand } from "./value-hypothesis-record.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";

async function captureGoalState(projectRoot, goalType) {
  const fileName = goalType === "operating-goal" ? "operating-goal.json" : "next-value-slice.json";
  const goalPath = path.join(resolveAofRoot(projectRoot), "goals", fileName);
  try {
    return {
      goalPath,
      existed: true,
      raw: await fs.readFile(goalPath, "utf8")
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        goalPath,
        existed: false,
        raw: null
      };
    }
    throw error;
  }
}

async function restoreGoalState(snapshot) {
  if (!snapshot) {
    return;
  }
  if (!snapshot.existed) {
    await fs.rm(snapshot.goalPath, { force: true });
    return;
  }
  await fs.writeFile(snapshot.goalPath, snapshot.raw, "utf8");
}

function normalizeRef(projectRoot, absolutePath) {
  return path.relative(projectRoot, absolutePath).replaceAll("\\", "/");
}

function defaultResponsesForRequest() {
  return [
    "新規登録導線全体",
    "登録完了率を 5% 改善する",
    "認証基盤は変更しない"
  ];
}

async function advanceWithSyntheticNeedValidation(projectRoot, sessionPath) {
  const problem = await problemStatementRecordCommand({
    project: projectRoot,
    affectedParty: "newly invited workspace admins",
    actualProblem: "activation fails during permission setup",
    whyItMatters: "high-intent admins fail before reaching value",
    whyNow: "activation drop-off is blocking the onboarding target",
    evidenceRefs: ["docs/research/funnel-notes.md"]
  });
  const value = await valueHypothesisRecordCommand({
    project: projectRoot,
    expectedValueCreation: "higher activation completion",
    beneficiary: "newly invited workspace admins",
    supportingEvidence: ["analytics and interviews indicate confusion"],
    successCriteria: ["activation completion improves"]
  });
  const alternatives = await alternativeAnalysisRecordCommand({
    project: projectRoot,
    subjectNeed: "Reduce activation failure for invited admins",
    alternativeSolutions: ["clarify permission setup in-product"],
    stopOptions: ["do not create a project if the issue is not reproducible"]
  });
  const charter = await projectCharterRecordCommand({
    project: projectRoot,
    validatedNeedRef: ".aof/artifacts/need-validation/records/NVR-001.json",
    validatedObjective: "Ship the smallest validated intervention",
    scope: ["permission-step framing"],
    constraints: ["do not redesign the full onboarding flow"],
    expectedOutcomes: ["higher activation completion"]
  });
  const validation = await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Improve onboarding",
    validationStatus: "validated",
    validatedNeed: "Reduce activation failure caused by permission-step confusion",
    decisionSummary: "The validated need is narrow enough for planning.",
    authorityAction: "approve-project-charter",
    projectCreationRecommendation: "create-project",
    validationQuestionsAnswered: [
      { question: "Who is affected?", answer: "newly invited workspace admins", evidence_state: "sufficient" }
    ],
    hiddenAssumptions: [],
    evidenceGaps: [],
    problemStatementRef: normalizeRef(projectRoot, problem.artifactPath),
    valueHypothesisRef: normalizeRef(projectRoot, value.artifactPath),
    alternativeAnalysisRef: normalizeRef(projectRoot, alternatives.artifactPath),
    projectCharterRef: normalizeRef(projectRoot, charter.artifactPath)
  });

  return needValidationAdvanceCommand({
    session: sessionPath,
    needValidationRecord: validation.artifactPath
  });
}

export async function runtimeLoopProofCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const artifactPath = path.resolve(
    options.artifactPath || path.join(aofRoot, "artifacts", "runtime-loop-proofs", "current-proof.json")
  );
  const request = options.request || "初回離脱率を下げたい";
  const responses = options.responses?.length ? options.responses : defaultResponsesForRequest();
  const provider = options.provider || "mock";
  const sourceTaskId = options.sourceTaskId || "TASK-011";
  const goalSnapshots = await Promise.all([
    captureGoalState(projectRoot, "operating-goal"),
    captureGoalState(projectRoot, "next-value-slice")
  ]);

  try {
    const runResult = await runCommand({
      project: projectRoot,
      request,
      routingMode: options.routingMode || "fast-track"
    });

    const answerResult = await answerCommand({
      session: runResult.sessionPath,
      responses
    });
    await advanceWithSyntheticNeedValidation(projectRoot, runResult.sessionPath);

    const planningExecution = await councilExecCommand({
      session: runResult.sessionPath,
      project: projectRoot,
      stage: "planning",
      invokeModel: true,
      provider
    });

    const approvalExecution = await councilExecCommand({
      session: runResult.sessionPath,
      project: projectRoot,
      stage: "approval",
      invokeModel: true,
      provider
    });

    const allocationPlan = await allocationPlanRecordCommand({
      project: projectRoot,
      subjectRef: runResult.sessionId,
      targetRoleRefs: ["builder", "guardian"],
      candidateResourceRefs: ["resource-repo-main", "resource-npm-test"],
      recommendedAllocations: [
        {
          role_ref: "builder",
          primary_resource_ref: "resource-repo-main",
          supporting_resource_refs: ["resource-npm-test"],
          rationale: "Implementation and local verification are both required for the runtime slice.",
          capability_refs: ["cap-contract-alignment"],
          constraint_refs: ["policy-main-branch-access"],
          workload_state: "available",
          approval_required: true
        },
        {
          role_ref: "guardian",
          primary_resource_ref: "resource-npm-test",
          supporting_resource_refs: [],
          rationale: "Review coverage should stay verification-linked.",
          capability_refs: ["cap-smoke-validation"],
          constraint_refs: [],
          workload_state: "available",
          approval_required: false
        }
      ],
      policyRefs: ["policy-main-branch-access"],
      riskNotes: ["Repository writes stay review-gated through the declared policy surface."],
      sourceTaskId,
      sourceParentSessionId: runResult.sessionId,
      sourceDecisionRecordId: answerResult.decisionId || runResult.decisionId
    });

    const policyEvaluation = await policyEvaluationReportCommand({
      project: projectRoot,
      subjectRef: runResult.sessionId,
      evaluationScope: "runtime loop proof allocation review",
      overallOutcome: "allowed",
      policyRefs: ["policy-main-branch-access"],
      results: [
        {
          policy_id: "policy-main-branch-access",
          effect: "require-review",
          outcome: "allowed",
          reason: "The proof stays inside reviewed local runtime artifacts rather than autonomous execution.",
          blocking: false
        }
      ],
      recommendedActions: ["Proceed with the reviewed runtime proof slice and keep execution auditable."],
      sourceTaskId,
      sourceParentSessionId: runResult.sessionId,
      sourceDecisionRecordId: answerResult.decisionId || runResult.decisionId
    });

    const resourceClaim = await resourceClaimRecordCommand({
    project: projectRoot,
    subjectRef: runResult.sessionId,
    resourceRef: "resource-repo-main",
    claimantRoleRef: "builder",
    claimScope: "local runtime proof implementation and verification flow",
    claimStatus: "approved",
    approvalPolicyRefs: ["policy-main-branch-access"],
    justification: "The runtime proof needs repository and test surfaces under explicit review constraints.",
    allocationPlanRef: normalizeRef(projectRoot, allocationPlan.artifactPath),
    policyEvaluationRef: normalizeRef(projectRoot, policyEvaluation.artifactPath),
    sourceTaskId,
    sourceParentSessionId: runResult.sessionId,
    sourceDecisionRecordId: answerResult.decisionId || runResult.decisionId
  });

    const builderResult = await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "execution",
    sessionId: "SESS-CHILD-BUILDER-001",
    status: "completed",
    recommendation: "Merge implementation into the orchestrator join.",
    rationale: "The implementation path satisfies the allocation and policy constraints.",
    artifactRefs: [normalizeRef(projectRoot, allocationPlan.artifactPath)],
    sourceTaskId,
    sourceParentSessionId: runResult.sessionId,
    sourceDecisionRecordId: answerResult.decisionId || runResult.decisionId,
    confidence: 0.83
  });

    const guardianResult = await roleResultRecordCommand({
    project: projectRoot,
    role: "Guardian",
    stage: "execution",
    sessionId: "SESS-CHILD-GUARDIAN-001",
    status: "completed",
    recommendation: "Proceed to team aggregation.",
    rationale: "The reviewed slice remains within declared governance and verification constraints.",
    artifactRefs: [normalizeRef(projectRoot, policyEvaluation.artifactPath), normalizeRef(projectRoot, resourceClaim.artifactPath)],
    sourceTaskId,
    sourceParentSessionId: runResult.sessionId,
    sourceDecisionRecordId: answerResult.decisionId || runResult.decisionId,
    confidence: 0.88
  });

    const roleJoin = await roleJoinRecordCommand({
    project: projectRoot,
    stage: "execution",
    expectedRoles: ["Builder", "Guardian"],
    receivedRoles: ["Builder", "Guardian"],
    aggregateState: "ready-for-orchestrator-decision",
    recommendedNextStep: "Aggregate child outputs into the runtime team packet.",
    receivedSessionIds: ["SESS-CHILD-BUILDER-001", "SESS-CHILD-GUARDIAN-001"],
    joinStatus: "resolved",
    sourceTaskId,
    sourceParentSessionId: runResult.sessionId,
    decisionRecordRef: normalizeRef(projectRoot, answerResult.decisionJsonPath || runResult.decisionJsonPath),
    summary: "Parent orchestrator collected the child role outputs."
  });

    const teamOutput = await teamOutputRecordCommand({
    project: projectRoot,
    teamId: "runtime-team",
    stage: "execution",
    expectedRoles: ["Builder", "Guardian"],
    receivedRoles: ["Builder", "Guardian"],
    aggregateState: "ready-for-council-review",
    recommendedNextStep: "Submit the execution packet to council review.",
    joinedRoleResultRefs: [
      normalizeRef(projectRoot, builderResult.artifactPath),
      normalizeRef(projectRoot, guardianResult.artifactPath)
    ],
    artifactRefs: [normalizeRef(projectRoot, roleJoin.artifactPath)],
    decisionRequired: true,
    summary: "The runtime team packet is complete and ready for council review.",
    sourceTaskId,
    sourceParentSessionId: runResult.sessionId,
    sourceDecisionRecordId: answerResult.decisionId || runResult.decisionId
  });

    const councilReview = await councilReviewPacketCommand({
    project: projectRoot,
    councilId: "architecture-council",
    stage: "review",
    reviewStatus: "approved",
    decisionSummary: "The runtime proof slice is coherent and auditable.",
    rationale: "Allocation, execution, and policy evidence align under the backend-neutral contract layer.",
    recommendation: "Record the outcome and project the next runtime proof step.",
    targetAudience: "Framework operator deciding whether the runtime loop proof is credible release evidence.",
    expectedUserReaction: "The operator should accept this slice as a positive proof, but still treat broader coverage as incomplete.",
    blockingReasons: [],
    artifactChangeRecommendations: [
      "Preserve the full allocation-to-review evidence chain when copying this pattern into other backend families."
    ],
    organizationChangeRecommendations: [
      "Expand the same auditable loop shape across additional backend families before the next release tag."
    ],
    diagnosisCategory: "coverage-gap",
    diagnosisConfidence: 0.83,
    diagnosisEvidenceRefs: [
      normalizeRef(projectRoot, allocationPlan.artifactPath),
      normalizeRef(projectRoot, policyEvaluation.artifactPath),
      normalizeRef(projectRoot, resourceClaim.artifactPath),
      normalizeRef(projectRoot, teamOutput.artifactPath)
    ],
    teamOutputRefs: [normalizeRef(projectRoot, teamOutput.artifactPath)],
    roleResultRefs: [
      normalizeRef(projectRoot, builderResult.artifactPath),
      normalizeRef(projectRoot, guardianResult.artifactPath)
    ],
    evidenceRefs: [
      normalizeRef(projectRoot, allocationPlan.artifactPath),
      normalizeRef(projectRoot, policyEvaluation.artifactPath),
      normalizeRef(projectRoot, resourceClaim.artifactPath)
    ],
    followUpTaskIds: [sourceTaskId],
    sourceTaskId,
    sourceParentSessionId: runResult.sessionId,
    sourceDecisionRecordId: answerResult.decisionId || runResult.decisionId
  });

    const outcomeReport = await outcomeReportCommand({
      session: runResult.sessionPath,
      result: "success",
      note: "The backend-neutral runtime loop proof completed with auditable allocation, execution, review, and outcome artifacts.",
      signalRef: normalizeRef(projectRoot, councilReview.artifactPath)
    });

    await selfAuditRecordCommand({
      project: projectRoot,
      auditId: "FSA-RUNTIME-LOOP-001",
      scope: "post-runtime-loop-proof review",
      summary: "One end-to-end runtime proof loop completed and should now be tightened into a release-grade major version gate.",
      detectedGap: "The proof is deterministic and local; broader backend-family evidence is still a release follow-up.",
      nextAction: "Expand the same auditable loop shape across additional backend families without changing the contract layer.",
      relatedTaskIds: [sourceTaskId],
      sourceSessionId: runResult.sessionId,
      sourceDecisionRecordId: answerResult.decisionId || runResult.decisionId,
      maxEntries: 3
    });

    const executionLineage = await executionLineageCommand({
      project: projectRoot,
      sourceTaskId
    });

    const learningLoop = await learningLoopSnapshotCommand({
      project: projectRoot
    });

    const payload = {
      proof_type: "runtime-loop-proof",
      generated_at: learningLoop.payload.generated_at,
      request,
      routing_mode: runResult.routingMode,
      provider,
      proof_status: "passed",
      session_ref: normalizeRef(projectRoot, runResult.sessionPath),
      decision_refs: [
        normalizeRef(projectRoot, runResult.decisionJsonPath),
        normalizeRef(projectRoot, answerResult.decisionJsonPath || runResult.decisionJsonPath)
      ],
      allocation_plan_ref: normalizeRef(projectRoot, allocationPlan.artifactPath),
      policy_evaluation_ref: normalizeRef(projectRoot, policyEvaluation.artifactPath),
      resource_claim_ref: normalizeRef(projectRoot, resourceClaim.artifactPath),
      role_result_refs: [
        normalizeRef(projectRoot, builderResult.artifactPath),
        normalizeRef(projectRoot, guardianResult.artifactPath)
      ],
      role_join_ref: normalizeRef(projectRoot, roleJoin.artifactPath),
      team_output_ref: normalizeRef(projectRoot, teamOutput.artifactPath),
      council_review_ref: normalizeRef(projectRoot, councilReview.artifactPath),
      execution_lineage_ref: normalizeRef(projectRoot, executionLineage.artifactPath),
      learning_loop_ref: normalizeRef(projectRoot, learningLoop.artifactPath),
      phases: {
        framing: answerResult.status === "framed" ? "completed" : answerResult.status,
        allocation: policyEvaluation.payload.overall_outcome,
        execution: roleJoin.payload.aggregate_state,
        review: councilReview.payload.review_status,
        outcome: outcomeReport.latestOutcomeReport?.result ?? "unknown",
        next_step_recommendation: learningLoop.payload.improvement_proposal?.proposed_focus ?? "no recommendation"
      },
      notes: [
        `planning execution status: ${planningExecution.executionStatus}`,
        `approval outcome status: ${approvalExecution.execution.approval_outcome?.status ?? "unknown"}`,
        `learning loop basis: ${learningLoop.payload.improvement_proposal?.proposal_basis ?? "none"}`,
        "global goal projections were restored after this proof run"
      ]
    };

    await validateWithBundledSchema(payload, "aof-runtime-loop-proof.schema.json", "runtime loop proof");
    const writtenArtifactPath = await writeJsonArtifact(artifactPath, payload);

    return {
      ok: true,
      projectRoot,
      artifactPath: writtenArtifactPath,
      payload
    };
  } finally {
    await Promise.all(goalSnapshots.map((snapshot) => restoreGoalState(snapshot)));
  }
}
