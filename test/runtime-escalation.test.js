import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { alternativeAnalysisRecordCommand } from "../src/commands/alternative-analysis-record.js";
import { answerCommand } from "../src/commands/answer.js";
import { councilExecCommand } from "../src/commands/council-exec.js";
import { escalationResolveCommand } from "../src/commands/escalation-resolve.js";
import { needValidationAdvanceCommand } from "../src/commands/need-validation-advance.js";
import { needValidationRecordCommand } from "../src/commands/need-validation-record.js";
import { problemStatementRecordCommand } from "../src/commands/problem-statement-record.js";
import { projectCharterRecordCommand } from "../src/commands/project-charter-record.js";
import { runCommand } from "../src/commands/run.js";
import { valueHypothesisRecordCommand } from "../src/commands/value-hypothesis-record.js";
import { loadSession } from "../src/runtime/session.js";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const exampleProjectRoot = path.join(repoRoot, "examples", "aidlc-template");

async function resetStateDirectories(projectRoot) {
  const aofRoot = path.join(projectRoot, ".aof");
  const stateDirs = [
    "sessions",
    "decisions",
    path.join("context", "active"),
    path.join("context", "summaries"),
    path.join("context", "snapshots"),
    path.join("context", "archive"),
    "signals",
    "artifacts"
  ];

  for (const relativeDir of stateDirs) {
    const dirPath = path.join(aofRoot, relativeDir);
    await fs.rm(dirPath, { recursive: true, force: true });
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function createTempProject(t) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-escalation-test-"));
  const projectRoot = path.join(tempRoot, "project");
  const skippedStateDirs = [
    path.join(".aof", "sessions"),
    path.join(".aof", "decisions"),
    path.join(".aof", "context", "active"),
    path.join(".aof", "context", "summaries"),
    path.join(".aof", "context", "snapshots"),
    path.join(".aof", "context", "archive"),
    path.join(".aof", "signals"),
    path.join(".aof", "artifacts")
  ];
  await fs.cp(exampleProjectRoot, projectRoot, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(exampleProjectRoot, source);
      if (!relative || relative === "") {
        return true;
      }
      return !skippedStateDirs.some((skippedDir) => relative === skippedDir || relative.startsWith(`${skippedDir}${path.sep}`));
    }
  });
  await resetStateDirectories(projectRoot);
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });
  return projectRoot;
}

async function createApprovedNeedValidationArtifacts(projectRoot) {
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
    problemStatementRef: path.relative(projectRoot, problem.artifactPath).replaceAll("\\", "/"),
    valueHypothesisRef: path.relative(projectRoot, value.artifactPath).replaceAll("\\", "/"),
    alternativeAnalysisRef: path.relative(projectRoot, alternatives.artifactPath).replaceAll("\\", "/"),
    projectCharterRef: path.relative(projectRoot, charter.artifactPath).replaceAll("\\", "/")
  });

  return { validation };
}

async function advanceSessionToPlanning(projectRoot, sessionPath) {
  const artifacts = await createApprovedNeedValidationArtifacts(projectRoot);
  return needValidationAdvanceCommand({
    session: sessionPath,
    needValidationRecord: artifacts.validation.artifactPath
  });
}

async function createEscalatedApprovalSession(t) {
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

  const approvalResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: ["Guardian=yes"],
    temperature: undefined
  });

  return { projectRoot, runResult, approvalResult };
}

test("approval rejection escalates to human review and can be resolved into reopen", async (t) => {
  const { projectRoot, runResult, approvalResult } = await createEscalatedApprovalSession(t);

  assert.equal(approvalResult.execution.approval_outcome.status, "rejected");
  assert.equal(approvalResult.escalation?.status, "awaiting-human-review");
  assert.equal(approvalResult.projectMemory.confirmationResult?.ok, true);

  const escalatedSession = await loadSession(runResult.sessionPath);
  assert.equal(escalatedSession.status, "waiting_user");
  assert.equal(escalatedSession.current_stage, "approval");
  assert.equal(escalatedSession.stop_reason, "approval-failed-needs-human-escalation");

  const afterApprovalWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const afterApprovalWindow = JSON.parse(await fs.readFile(afterApprovalWindowPath, "utf8"));
  const approvalEntry = afterApprovalWindow.entries.at(-1);
  assert.equal(approvalEntry.question, "council approval で何が決まったか");
  assert.equal(approvalEntry.expectation_state, "rejected");
  assert.equal(approvalEntry.mismatch_state, "council approval rejected the current slice and opened human escalation");
  assert.equal(approvalEntry.scale_direction, "wait for human escalation resolution before continuing");

  const resolutionResult = await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "reopen",
    note: "Need broader clarification after veto"
  });

  assert.equal(resolutionResult.status, "reopened");
  assert.equal(resolutionResult.currentStage, "clarification");
  assert.equal(resolutionResult.escalation.status, "resolved");
  assert.equal(resolutionResult.escalation.resolution, "reopen");

  const reopenedSession = await loadSession(runResult.sessionPath);
  assert.equal(reopenedSession.status, "reopened");
  assert.equal(reopenedSession.current_stage, "clarification");
  assert.equal(reopenedSession.reopen_count, 1);
  assert.equal(reopenedSession.escalation.status, "resolved");
  assert.equal(reopenedSession.escalation.resolution_note, "Need broader clarification after veto");
  assert.equal(reopenedSession.stage_transitions.at(-1)?.reason, "human-escalation-reopen");
});

test("answerCommand can resume an escalation-reopened session back into planning", async (t) => {
  const { runResult } = await createEscalatedApprovalSession(t);

  await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "reopen",
    note: "Need broader clarification after veto"
  });

  const resumed = await answerCommand({
    session: runResult.sessionPath,
    responses: ["Guardian 指摘を踏まえて認証制約を維持したまま段階導入する"]
  });

  assert.equal(resumed.status, "framed");
  assert.equal(resumed.currentStage, "need-validation");
  assert.ok(resumed.decisionId);

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "need-validation");
  assert.equal(session.routing_mode, "fast-track");
  assert.equal(session.escalation.status, "resolved");
  assert.equal("stop_reason" in session, false);
  assert.equal("recoverability" in session, false);
  assert.equal("suggested_next_action" in session, false);
});

test("escalation-reopened fast-track session can continue into proposal and review", async (t) => {
  const { projectRoot, runResult } = await createEscalatedApprovalSession(t);

  await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "reopen",
    note: "Need broader clarification after veto"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: ["Guardian 指摘を踏まえて認証制約を維持したまま段階導入する"]
  });
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

  const proposalResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "proposal",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  const reviewResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "review",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  assert.equal(proposalResult.executionStatus, "completed");
  assert.equal(proposalResult.execution.steps.length, 1);
  assert.deepEqual(proposalResult.execution.steps.map((step) => step.role), ["Builder"]);

  assert.equal(reviewResult.executionStatus, "completed");
  assert.equal(reviewResult.execution.steps.length, 1);
  assert.deepEqual(reviewResult.execution.steps.map((step) => step.role), ["Guardian"]);

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "planning");
  assert.equal(session.routing_mode, "fast-track");
  assert.equal(session.council_execution_runs.length, 3);
  assert.deepEqual(
    session.council_execution_runs.map((run) => run.stage),
    ["approval", "proposal", "review"]
  );
});

test("approval rejection can be resolved into human approve", async (t) => {
  const { projectRoot, runResult } = await createEscalatedApprovalSession(t);

  const resolutionResult = await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "approve",
    note: "Human approver accepted the exception"
  });

  assert.equal(resolutionResult.status, "closed");
  assert.equal(resolutionResult.currentStage, "approval");
  assert.equal(resolutionResult.stopReason, "human-escalation-approved");
  assert.equal(resolutionResult.escalation.status, "resolved");
  assert.equal(resolutionResult.escalation.resolution, "approve");
  assert.equal(resolutionResult.projectMemory.confirmationResult?.ok, true);

  const closedSession = await loadSession(runResult.sessionPath);
  assert.equal(closedSession.status, "closed");
  assert.equal(closedSession.current_stage, "approval");
  assert.equal(closedSession.suggested_next_action, "record final approval outcome and proceed to closure");

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  const latestEntry = confirmationWindow.entries.at(-1);
  assert.equal(latestEntry.question, "human escalation で何を決めたか");
  assert.equal(latestEntry.answer, "Human approver accepted the exception");
  assert.equal(latestEntry.scale_direction, "close the current slice and proceed to outcome tracking");
});

test("approval rejection can be resolved into stop", async (t) => {
  const { runResult } = await createEscalatedApprovalSession(t);

  const resolutionResult = await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "stop",
    note: "Human approver chose to stop the work"
  });

  assert.equal(resolutionResult.status, "stopped");
  assert.equal(resolutionResult.currentStage, "approval");
  assert.equal(resolutionResult.stopReason, "human-escalation-stopped");
  assert.equal(resolutionResult.escalation.status, "resolved");
  assert.equal(resolutionResult.escalation.resolution, "stop");

  const stoppedSession = await loadSession(runResult.sessionPath);
  assert.equal(stoppedSession.status, "stopped");
  assert.equal(stoppedSession.current_stage, "approval");
  assert.equal(stoppedSession.suggested_next_action, "stop work and wait for a new trigger");
});
