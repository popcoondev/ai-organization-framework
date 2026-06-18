import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { answerCommand } from "../src/commands/answer.js";
import { councilExecCommand } from "../src/commands/council-exec.js";
import { liveVerifyCommand } from "../src/commands/live-verify.js";
import { buildCouncilExecutionPlan } from "../src/runtime/council.js";
import { buildModelInputPacket } from "../src/runtime/packet.js";
import { runCommand } from "../src/commands/run.js";
import { verifyHistoryCommand } from "../src/commands/verify-history.js";
import { verifyLogCommand } from "../src/commands/verify-log.js";
import { deriveInitialClarification } from "../src/runtime/clarification.js";
import { loadSession } from "../src/runtime/session.js";
import { loadTemplate } from "../src/runtime/template-loader.js";
import { repoRoot, genericExampleProjectRoot, createTempProject, createTempProjectFrom, advanceSessionToPlanning, writeSignalFixture, countGeneratedFiles, spawnCliWithRetry } from "./runtime-test-helpers.js";

test("deriveInitialClarification respects trigger-class priority order and question budget", async (t) => {
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
      "  question_policy:",
      "    initial_question_budget: 2",
      "    priority_order:",
      "      - brownfield-gap",
      "      - high-stakes-risk",
      "      - missing-success-criteria",
      "      - missing-constraint",
      "      - missing-prohibition",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  const clarification = deriveInitialClarification(
    "Need a structural retrofit for the west wing",
    template
  );

  assert.equal(clarification.pending_questions.length, 2);
  assert.deepEqual(
    clarification.trigger_classes,
    ["brownfield-gap", "high-stakes-risk"]
  );
  assert.equal(
    clarification.pending_questions[0].question,
    "In the current implementation or operation, what context must be carried forward into this decision?"
  );
  assert.equal(
    clarification.pending_questions[1].question,
    "For safety, legal, authentication, or personal-data concerns, what conditions are absolutely non-negotiable?"
  );
});

test("runCommand works with the generic example template", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const result = await runCommand({
    project: projectRoot,
    request: "Need a structural retrofit for legacy visitor circulation"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "waiting_user");
  assert.equal(result.routingMode, "deep-path");
  assert.equal(result.pendingQuestions[0], "For safety, legal, authentication, or personal-data concerns, what conditions are absolutely non-negotiable?");
  assert.equal(
    result.pendingQuestions[1],
    "Which service touchpoint or environment should this redesign cover, and what should stay out of scope?"
  );
  assert.equal(result.pendingQuestions.length, 2);

  const session = await loadSession(result.sessionPath);
  assert.equal(session.workflow_id, "service-design");
  assert.equal(session.organization_id, "civic-studio");
  assert.equal(session.organization.language, "en");
  assert.equal(session.clarification.dimensions.brownfield_orientation_completeness, "partial");
  assert.equal(session.clarification.question_budget.initial_question_budget, 2);
  assert.equal(session.clarification.question_budget.followup_budget, 1);
  assert.equal(session.clarification.question_budget.max_rounds, 2);
  assert.equal(
    session.clarification.clarification_summary,
    "runtime identified service-design clarification gaps and generated first-round questions"
  );
});

test("generic example template works end-to-end through planning and approval", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const runResult = await runCommand({
    project: projectRoot,
    request: "Need a structural retrofit for legacy visitor circulation"
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "Visitor circulation across the legacy civic lobby and service counter",
      "Structural safety, safeguarding, fire egress, and accessibility compliance are non-negotiable"
    ]
  });
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

  const planningExecution = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "planning",
    invokeModel: true,
    provider: "mock"
  });

  const approvalExecution = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    invokeModel: true,
    provider: "mock"
  });

  assert.equal(answerResult.status, "framed");
  assert.equal(answerResult.currentStage, "need-validation");
  assert.equal(planningExecution.executionStatus, "completed");
  assert.equal(approvalExecution.executionStatus, "completed");
  assert.equal(approvalExecution.execution.approval_outcome.status, "approved");
});

test("runCommand creates a session and initial decision record", async (t) => {
  const projectRoot = await createTempProject(t);
  const result = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "waiting_user");
  assert.equal(result.pendingQuestions.length, 3);
  assert.equal(result.routingMode, "deep-path");

  const session = await loadSession(result.sessionPath);
  assert.equal(session.current_stage, "clarification");
  assert.equal(session.routing_mode, "deep-path");
  assert.equal(session.open_decision_ids.length, 1);
  assert.equal(session.reopen_count, 0);
  assert.deepEqual(session.outcome_reports, []);
  assert.equal(session.stage_transitions.length, 1);
  assert.deepEqual(session.stage_transitions[0], {
    from_stage: null,
    to_stage: "clarification",
    from_status: null,
    to_status: "waiting_user",
    at: session.created_at,
    reason: "session-created"
  });
  assert.deepEqual(session.routing_mode_history, [{
    from_mode: null,
    to_mode: "deep-path",
    at: session.created_at,
    reason: "session-created"
  }]);

  const sessionsDir = path.join(projectRoot, ".aof", "sessions");
  const decisionsDir = path.join(projectRoot, ".aof", "decisions");
  assert.equal(await countGeneratedFiles(sessionsDir, ".json"), 1);
  assert.equal(await countGeneratedFiles(decisionsDir, ".json"), 1);
  assert.equal(await countGeneratedFiles(decisionsDir, ".md"), 1);
});

test("runCommand also projects the initial operating goal into project memory", async (t) => {
  const projectRoot = await createTempProject(t);
  const request = "初回離脱率を下げたい";
  const result = await runCommand({
    project: projectRoot,
    request
  });

  assert.equal(result.projectMemory.operatingGoalProjection?.ok, true);

  const goalProjectionPath = path.join(projectRoot, ".aof", "goals", "operating-goal.json");
  const goalProjection = JSON.parse(await fs.readFile(goalProjectionPath, "utf8"));
  assert.equal(goalProjection.goal_type, "operating-goal");
  assert.equal(goalProjection.content, request);
  assert.equal(goalProjection.agreed_with_human, true);
  assert.equal(goalProjection.source_session_id, result.sessionId);
});

test("runCommand renders markdown using the project decision template shell", async (t) => {
  const projectRoot = await createTempProject(t);
  const templatePath = path.join(projectRoot, ".aof", "templates", "decision-record.md");
  await fs.writeFile(
    templatePath,
    [
      "# Custom Decision Shell: {{decision_id}}",
      "",
      "Rendered At: {{created_at}}",
      "",
      "{{decision_record_content}}",
      "",
      "Footer: project-specific shell",
      ""
    ].join("\n"),
    "utf8"
  );

  const result = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  const markdown = await fs.readFile(result.decisionMarkdownPath, "utf8");
  assert.match(markdown, /^# Custom Decision Shell: DEC-/);
  assert.match(markdown, /Footer: project-specific shell/);
  assert.match(markdown, /## Scope/);
});

test("runCommand validates decision records against the project-local decision schema", async (t) => {
  const projectRoot = await createTempProject(t);
  const schemaPath = path.join(projectRoot, ".aof", "templates", "decision-record.schema.json");
  await fs.writeFile(
    schemaPath,
    `${JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        organization: { type: "integer" }
      },
      required: ["organization"],
      additionalProperties: true
    }, null, 2)}\n`,
    "utf8"
  );

  await assert.rejects(
    runCommand({
      project: projectRoot,
      request: "初回離脱率を下げたい"
    }),
    /project decision record\.organization must be of type integer/
  );
});

test("runCommand cleans up the session if decision creation fails", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const sessionsDir = path.join(projectRoot, ".aof", "sessions");
  const decisionsDir = path.join(projectRoot, ".aof", "decisions");

  await assert.rejects(
    runCommand(
      {
        project: projectRoot,
        request: "初回離脱率を下げたい"
      },
      {
        loadTemplate: async () => template,
        createInitialDecision: async () => {
          const error = new Error("decision creation failed");
          throw error;
        }
      }
    ),
    /decision creation failed/
  );

  assert.equal(await countGeneratedFiles(sessionsDir, ".json"), 0);
  assert.equal(await countGeneratedFiles(decisionsDir, ".json"), 0);
  assert.equal(await countGeneratedFiles(decisionsDir, ".md"), 0);
});

test("runCommand cleans up the session and decision files if attach fails", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const sessionsDir = path.join(projectRoot, ".aof", "sessions");
  const decisionsDir = path.join(projectRoot, ".aof", "decisions");

  await assert.rejects(
    runCommand(
      {
        project: projectRoot,
        request: "初回離脱率を下げたい"
      },
      {
        loadTemplate: async () => template,
        attachOpenDecision: async () => {
          throw new Error("attach failed");
        }
      }
    ),
    /attach failed/
  );

  assert.equal(await countGeneratedFiles(sessionsDir, ".json"), 0);
  assert.equal(await countGeneratedFiles(decisionsDir, ".json"), 0);
  assert.equal(await countGeneratedFiles(decisionsDir, ".md"), 0);
});

test("CLI run emits a session and decision payload", async (t) => {
  const projectRoot = await createTempProject(t);
  const cliPath = path.join(repoRoot, "src", "cli.js");
  const result = spawnCliWithRetry([cliPath, "run", "初回離脱率を下げたい", "--project", projectRoot]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.status, "waiting_user");
  assert.equal(payload.routingMode, "deep-path");
  assert.equal(payload.pendingQuestions.length, 3);
});

test("CLI run accepts --fast-track", async (t) => {
  const projectRoot = await createTempProject(t);
  const cliPath = path.join(repoRoot, "src", "cli.js");
  const result = spawnCliWithRetry([cliPath, "run", "初回離脱率を下げたい", "--project", projectRoot, "--fast-track"]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.routingMode, "fast-track");
});

test("runCommand accepts fast-track routing overrides", async (t) => {
  const projectRoot = await createTempProject(t);
  const result = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  assert.equal(result.routingMode, "fast-track");
  const session = await loadSession(result.sessionPath);
  assert.equal(session.routing_mode, "fast-track");
});

test("council planning differs between deep-path and fast-track", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);

  const deepRun = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });
  const deepSession = await loadSession(deepRun.sessionPath);
  const deepPlan = buildCouncilExecutionPlan({
    template,
    session: deepSession,
    stage: "planning"
  });

  const fastRun = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });
  const fastSession = await loadSession(fastRun.sessionPath);
  const fastPlan = buildCouncilExecutionPlan({
    template,
    session: fastSession,
    stage: "planning"
  });

  assert.equal(deepPlan.routing_mode, "deep-path");
  assert.equal(deepPlan.seats.length, 2);
  assert.equal(deepPlan.seats[1].role, "Visionary");
  assert.equal(fastPlan.routing_mode, "fast-track");
  assert.equal(fastPlan.seats.length, 1);
  assert.equal(fastPlan.primary_role, "Builder");
});

test("fast-track approval uses a single Guardian reviewer", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });
  const session = await loadSession(runResult.sessionPath);
  const plan = buildCouncilExecutionPlan({
    template,
    session,
    stage: "approval"
  });

  assert.equal(plan.routing_mode, "fast-track");
  assert.equal(plan.primary_role, "Guardian");
  assert.equal(plan.approval_mode, "single-reviewer");
  assert.equal(plan.seats.length, 1);
  assert.equal(plan.seats[0].role, "Guardian");
});

test("buildModelInputPacket uses canonical call_purpose values per stage", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });
  const session = await loadSession(runResult.sessionPath);

  const clarificationPacket = buildModelInputPacket({ template, session, stage: "clarification", roleOverride: "" });
  const planningPacket = buildModelInputPacket({ template, session, stage: "planning", roleOverride: "" });
  const proposalPacket = buildModelInputPacket({ template, session, stage: "proposal", roleOverride: "" });
  const reviewPacket = buildModelInputPacket({ template, session, stage: "review", roleOverride: "" });
  const approvalPacket = buildModelInputPacket({ template, session, stage: "approval", roleOverride: "Guardian" });
  const reopenPacket = buildModelInputPacket({ template, session, stage: "reopen", roleOverride: "Visionary" });

  assert.equal(clarificationPacket.metadata.call_purpose, "generate-clarification-questions");
  assert.equal(planningPacket.metadata.call_purpose, "generate-plan");
  assert.equal(proposalPacket.metadata.call_purpose, "generate-proposal");
  assert.equal(reviewPacket.metadata.call_purpose, "generate-review");
  assert.equal(approvalPacket.metadata.call_purpose, "generate-approval-recommendation");
  assert.equal(reopenPacket.metadata.call_purpose, "generate-reopen-recommendation");
});

test("councilExecCommand persists routing_mode on execution runs", async (t) => {
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

  const result = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "planning",
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

  assert.equal(result.execution.routing_mode, "fast-track");

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.council_execution_runs.length, 1);
  assert.equal(session.council_execution_runs[0].routing_mode, "fast-track");
});

test("councilExecCommand can write a verification artifact", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
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

  const artifactPath = path.join(projectRoot, ".aof", "artifacts", "planning-exec.json");
  const result = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "planning",
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
    temperature: undefined,
    artifactPath
  });

  assert.equal(result.executionStatus, "completed");
  assert.equal(result.artifactPath, artifactPath);

  const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  assert.equal(artifact.artifact_type, "council-exec");
  assert.equal(artifact.payload.executionId, result.executionId);
  assert.equal(artifact.payload.executionStatus, "completed");
  assert.equal(artifact.payload.execution.execution_id, result.executionId);
});

test("liveVerifyCommand writes a verification bundle and child artifacts", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const artifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verification");
  const result = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: true,
    includeEscalationTerminal: true,
    signalPath
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "completed");
  assert.equal(result.providerCheck.ok, true);
  assert.equal(result.planningExecution.executionStatus, "completed");

  const providerCheckArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "provider-check.json"), "utf8")
  );
  const planningExecArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "planning-exec.json"), "utf8")
  );
  const proposalExecArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "proposal-exec.json"), "utf8")
  );
  const reviewExecArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "review-exec.json"), "utf8")
  );
  const approvalExecArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "approval-exec.json"), "utf8")
  );
  const signalReopenArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "signal-reopen.json"), "utf8")
  );
  const escalationReopenArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "escalation-reopen.json"), "utf8")
  );
  const escalationApproveResolutionArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "escalation-approve-resolution.json"), "utf8")
  );
  const escalationStopResolutionArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "escalation-stop-resolution.json"), "utf8")
  );
  const bundleArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "verification-bundle.json"), "utf8")
  );
  const reportArtifact = await fs.readFile(path.join(artifactDir, "verification-report.md"), "utf8");

  assert.equal(providerCheckArtifact.artifact_type, "provider-check");
  assert.equal(planningExecArtifact.artifact_type, "council-exec");
  assert.equal(proposalExecArtifact.artifact_type, "council-exec");
  assert.equal(reviewExecArtifact.artifact_type, "council-exec");
  assert.equal(approvalExecArtifact.artifact_type, "council-exec");
  assert.equal(signalReopenArtifact.artifact_type, "signal-reopen");
  assert.equal(escalationReopenArtifact.artifact_type, "escalation-reopen");
  assert.equal(escalationApproveResolutionArtifact.artifact_type, "escalation-approve");
  assert.equal(escalationStopResolutionArtifact.artifact_type, "escalation-stop");
  assert.equal(bundleArtifact.artifact_type, "live-provider-verification");
  assert.equal(bundleArtifact.status, "completed");
  assert.equal(bundleArtifact.verification_context.organization.organization_id, "product-team");
  assert.equal(bundleArtifact.verification_context.organization.language, "ja");
  assert.equal(bundleArtifact.verification_context.workflow.workflow_id, "aidlc");
  assert.equal(bundleArtifact.verification_context.workflow.default_routing_mode, "deep-path");
  assert.equal(bundleArtifact.verification_context.governance.model, "council-of-three");
  assert.equal(bundleArtifact.verification_context.policies.policy_profile_id, "default-product-policy");
  assert.match(bundleArtifact.verification_context.template_assets.decision_record_markdown_path, /decision-record\.md$/);
  assert.match(bundleArtifact.verification_context.template_assets.decision_record_schema_path, /decision-record\.schema\.json$/);
  assert.equal(bundleArtifact.execution_policy.include_middle_stages, true);
  assert.equal(bundleArtifact.execution_policy.include_approval, true);
  assert.equal(bundleArtifact.execution_policy.include_signal_reopen, true);
  assert.equal(bundleArtifact.execution_policy.include_escalation_reopen, true);
  assert.equal(bundleArtifact.execution_policy.include_escalation_terminal, true);
  assert.equal(bundleArtifact.execution_policy.provider, "mock");
  assert.equal(bundleArtifact.execution_policy.routing_mode, "workflow-default");
  assert.equal(bundleArtifact.execution_policy.timeout_ms, 30000);
  assert.equal(bundleArtifact.execution_policy.max_retries, 0);
  assert.equal(bundleArtifact.execution_policy.response_count, 3);
  assert.equal(bundleArtifact.execution_policy.signal_response_count, 1);
  assert.equal(bundleArtifact.execution_policy.escalation_resume_response_count, 1);
  assert.equal(bundleArtifact.execution_policy.used_default_responses, false);
  assert.equal(bundleArtifact.artifacts.provider_check.endsWith("provider-check.json"), true);
  assert.equal(bundleArtifact.artifacts.verification_report.endsWith("verification-report.md"), true);
  assert.equal(bundleArtifact.artifacts.verification_bundle.endsWith("verification-bundle.json"), true);
  assert.equal(bundleArtifact.artifacts.planning_execution.endsWith("planning-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.proposal_execution.endsWith("proposal-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.review_execution.endsWith("review-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.approval_execution.endsWith("approval-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.signal_reopen.endsWith("signal-reopen.json"), true);
  assert.equal(bundleArtifact.artifacts.signal_resume_proposal_execution.endsWith("signal-resume-proposal-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.signal_resume_review_execution.endsWith("signal-resume-review-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_approval_execution.endsWith("escalation-approval-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_reopen.endsWith("escalation-reopen.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_resume_proposal_execution.endsWith("escalation-resume-proposal-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_resume_review_execution.endsWith("escalation-resume-review-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_approve_approval_execution.endsWith("escalation-approve-approval-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_approve_resolution.endsWith("escalation-approve-resolution.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_stop_approval_execution.endsWith("escalation-stop-approval-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_stop_resolution.endsWith("escalation-stop-resolution.json"), true);
  assert.equal(bundleArtifact.branch_outcomes.happy_path.planning_status, "completed");
  assert.equal(bundleArtifact.branch_outcomes.happy_path.approval_status, "approved");
  assert.equal(bundleArtifact.branch_outcomes.signal_reopen.reopen_status, "reopened");
  assert.equal(bundleArtifact.branch_outcomes.signal_reopen.resume_answer_status, "framed");
  assert.equal(bundleArtifact.branch_outcomes.escalation_reopen.approval_status, "rejected");
  assert.equal(bundleArtifact.branch_outcomes.escalation_reopen.resolution_status, "reopened");
  assert.equal(bundleArtifact.branch_outcomes.escalation_approve.resolution_status, "closed");
  assert.equal(bundleArtifact.branch_outcomes.escalation_stop.resolution_status, "stopped");
  assert.equal(bundleArtifact.verification_recommendation.action, "investigate-drift");
  assert.equal(bundleArtifact.verification_recommendation.urgency, "warning");
  assert.ok(bundleArtifact.verification_recommendation.source_signals.includes("signal-reopen-observed"));
  assert.equal(bundleArtifact.branch_policies.happy_path.routing_mode, "deep-path");
  assert.equal(bundleArtifact.branch_policies.happy_path.include_middle_stages, true);
  assert.equal(bundleArtifact.branch_policies.happy_path.provider, "mock");
  assert.equal(bundleArtifact.branch_policies.signal_reopen.post_reopen_routing_mode, "deep-path");
  assert.equal(bundleArtifact.branch_policies.escalation_reopen.resolution, "reopen");
  assert.equal(bundleArtifact.branch_policies.escalation_approve.resolution, "approve");
  assert.equal(bundleArtifact.branch_policies.escalation_stop.resolution, "stop");
  assert.equal(bundleArtifact.provider_observability.planning.execution_id, result.planningExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.planning.stage, "planning");
  assert.equal(
    bundleArtifact.provider_observability.planning.step_count,
    result.planningExecution.execution.steps.length
  );
  assert.equal(bundleArtifact.provider_observability.planning.observed_step_count, 0);
  assert.deepEqual(bundleArtifact.provider_observability.planning.steps, []);
  assert.equal(bundleArtifact.provider_observability.proposal.execution_id, result.proposalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.proposal.stage, "proposal");
  assert.equal(
    bundleArtifact.provider_observability.proposal.step_count,
    result.proposalExecution.execution.steps.length
  );
  assert.equal(bundleArtifact.provider_observability.proposal.observed_step_count, 0);
  assert.deepEqual(bundleArtifact.provider_observability.proposal.steps, []);
  assert.equal(bundleArtifact.provider_observability.review.execution_id, result.reviewExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.review.stage, "review");
  assert.equal(
    bundleArtifact.provider_observability.review.step_count,
    result.reviewExecution.execution.steps.length
  );
  assert.equal(bundleArtifact.provider_observability.review.observed_step_count, 0);
  assert.deepEqual(bundleArtifact.provider_observability.review.steps, []);
  assert.equal(bundleArtifact.provider_observability.approval.execution_id, result.approvalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.approval.stage, "approval");
  assert.equal(
    bundleArtifact.provider_observability.approval.step_count,
    result.approvalExecution.execution.steps.length
  );
  assert.equal(bundleArtifact.provider_observability.approval.observed_step_count, 0);
  assert.deepEqual(bundleArtifact.provider_observability.approval.steps, []);
  assert.equal(bundleArtifact.provider_observability.signal_resume_proposal.execution_id, result.signalResumeProposalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.signal_resume_proposal.stage, "proposal");
  assert.equal(bundleArtifact.provider_observability.signal_resume_proposal.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.signal_resume_review.execution_id, result.signalResumeReviewExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.signal_resume_review.stage, "review");
  assert.equal(bundleArtifact.provider_observability.signal_resume_review.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_approval.execution_id, result.escalationApprovalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_approval.stage, "approval");
  assert.equal(bundleArtifact.provider_observability.escalation_approval.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_resume_proposal.execution_id, result.escalationResumeProposalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_resume_proposal.stage, "proposal");
  assert.equal(bundleArtifact.provider_observability.escalation_resume_proposal.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_resume_review.execution_id, result.escalationResumeReviewExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_resume_review.stage, "review");
  assert.equal(bundleArtifact.provider_observability.escalation_resume_review.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_approve_approval.execution_id, result.escalationApproveApprovalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_approve_approval.stage, "approval");
  assert.equal(bundleArtifact.provider_observability.escalation_approve_approval.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_stop_approval.execution_id, result.escalationStopApprovalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_stop_approval.stage, "approval");
  assert.equal(bundleArtifact.provider_observability.escalation_stop_approval.observed_step_count, 0);
  assert.equal(result.signalReopen.status, "reopened");
  assert.equal(result.signalResumeAnswer.status, "framed");
  assert.equal(result.escalationReopen.status, "reopened");
  assert.equal(result.escalationResumeAnswer.status, "framed");
  assert.equal(result.escalationApproveResolution.status, "closed");
  assert.equal(result.escalationStopResolution.status, "stopped");
  assert.equal(bundleArtifact.planningExecution.executionStatus, "completed");
  assert.equal(bundleArtifact.approvalExecution.executionStatus, "completed");
  assert.equal(bundleArtifact.approvalExecution.execution.approval_outcome.status, "approved");
  assert.equal(bundleArtifact.escalationApprovalExecution.execution.approval_outcome.status, "rejected");
  assert.equal(bundleArtifact.escalationApproveApprovalExecution.execution.approval_outcome.status, "rejected");
  assert.equal(bundleArtifact.escalationStopApprovalExecution.execution.approval_outcome.status, "rejected");
  assert.equal(result.reportPath.endsWith("verification-report.md"), true);
  assert.match(reportArtifact, /^# Live Verification Report/m);
  assert.match(reportArtifact, /## Verification Context/);
  assert.match(reportArtifact, /## Execution Policy/);
  assert.match(reportArtifact, /## Branch Outcomes/);
  assert.match(reportArtifact, /## Branch Policies/);
  assert.match(reportArtifact, /## Provider Observability/);
  assert.match(reportArtifact, /## Artifact Inventory/);
  assert.match(reportArtifact, /organization: product-team \(Product Team\)/);
  assert.match(reportArtifact, /happy path approval: approved/);
  assert.match(reportArtifact, /signal reopen status: reopened/);
  assert.match(reportArtifact, /escalation stop resolution: stopped/);
  assert.match(reportArtifact, /verification_report: .*verification-report\.md/);
});

test("liveVerifyCommand summarizes provider response metadata in the verification bundle", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const artifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verification-openai");
  const originalFetch = global.fetch;
  let chatCompletionCount = 0;

  global.fetch = async (url) => {
    if (String(url).endsWith("/models")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: "gpt-4.1-mini" }]
        })
      };
    }

    chatCompletionCount += 1;
    const responseMatrix = [
      {
        requestId: "req_planning_123",
        processingMs: "211",
        remainingRequests: "4998",
        remainingTokens: "198000",
        content: "DECISION: proceed\nPlanning looks acceptable."
      },
      {
        requestId: "req_middle_234",
        processingMs: "233",
        remainingRequests: "4997",
        remainingTokens: "197500",
        content: "DECISION: proceed\nProposal looks acceptable."
      },
      {
        requestId: "req_middle_234",
        processingMs: "237",
        remainingRequests: "4997",
        remainingTokens: "197000",
        content: "DECISION: proceed\nReview looks acceptable."
      },
      {
        requestId: "req_approval_456",
        processingMs: "433",
        remainingRequests: "4996",
        remainingTokens: "196500",
        content: "DECISION: approve\nVETO: no\nApproval looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "255",
        remainingRequests: "4995",
        remainingTokens: "196000",
        content: "DECISION: proceed\nSignal resume proposal looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "256",
        remainingRequests: "4995",
        remainingTokens: "195900",
        content: "DECISION: proceed\nSignal resume proposal looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "257",
        remainingRequests: "4995",
        remainingTokens: "195800",
        content: "DECISION: proceed\nSignal resume proposal looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "259",
        remainingRequests: "4995",
        remainingTokens: "195500",
        content: "DECISION: proceed\nSignal resume review looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "260",
        remainingRequests: "4995",
        remainingTokens: "195400",
        content: "DECISION: proceed\nSignal resume review looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "261",
        remainingRequests: "4995",
        remainingTokens: "195300",
        content: "DECISION: proceed\nSignal resume review looks acceptable."
      },
      {
        requestId: "req_escalation_678",
        processingMs: "477",
        remainingRequests: "4994",
        remainingTokens: "195000",
        content: "DECISION: reject\nVETO: yes\nEscalation branch requires human review."
      },
      {
        requestId: "req_escalation_resume_789",
        processingMs: "281",
        remainingRequests: "4993",
        remainingTokens: "194500",
        content: "DECISION: proceed\nEscalation resume proposal looks acceptable."
      },
      {
        requestId: "req_escalation_resume_789",
        processingMs: "286",
        remainingRequests: "4993",
        remainingTokens: "194000",
        content: "DECISION: proceed\nEscalation resume review looks acceptable."
      },
      {
        requestId: "req_escalation_approve_901",
        processingMs: "488",
        remainingRequests: "4992",
        remainingTokens: "193500",
        content: "DECISION: reject\nVETO: yes\nEscalation approve branch requires human review."
      },
      {
        requestId: "req_escalation_stop_902",
        processingMs: "489",
        remainingRequests: "4991",
        remainingTokens: "193000",
        content: "DECISION: reject\nVETO: yes\nEscalation stop branch requires human review."
      }
    ];
    const current = responseMatrix[chatCompletionCount - 1];
    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          const values = {
            "x-request-id": current.requestId,
            "openai-processing-ms": current.processingMs,
            "x-ratelimit-remaining-requests": current.remainingRequests,
            "x-ratelimit-remaining-tokens": current.remainingTokens
          };
          return values[name] ?? null;
        }
      },
      json: async () => ({
        choices: [
          {
            message: {
              content: current.content
            }
          }
        ]
      })
    };
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: "fast-track",
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678",
    apiKeyEnv: "",
    temperature: undefined,
    ping: true,
    artifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: true,
    includeEscalationTerminal: true,
    signalPath,
    timeoutMs: 30000,
    maxRetries: 0
  });

  assert.equal(result.ok, true);
  const bundleArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "verification-bundle.json"), "utf8")
  );
  const reportArtifact = await fs.readFile(path.join(artifactDir, "verification-report.md"), "utf8");

  assert.equal(bundleArtifact.verification_context.organization.language, "ja");
  assert.equal(bundleArtifact.verification_context.workflow.name, "AIDLC");
  assert.equal(bundleArtifact.verification_context.governance.escalation_target, "human-maintainer");
  assert.deepEqual(bundleArtifact.verification_context.policies.default_priority_order, [
    "value",
    "quality",
    "safety",
    "speed",
    "cost"
  ]);
  assert.equal(bundleArtifact.branch_policies.happy_path.routing_mode, "fast-track");
  assert.equal(bundleArtifact.branch_policies.happy_path.provider, "openai-compatible");
  assert.equal(bundleArtifact.branch_policies.happy_path.model, "gpt-4.1-mini");
  assert.equal(bundleArtifact.branch_policies.signal_reopen.routing_escalated, true);
  assert.equal(bundleArtifact.branch_policies.escalation_reopen.resolution_note, "Need broader clarification after approval rejection");
  assert.equal(bundleArtifact.branch_policies.escalation_approve.resolution_note, "Human approver accepted the exception");
  assert.equal(bundleArtifact.branch_policies.escalation_stop.resolution_note, "Human approver chose to stop the work");
  assert.equal(bundleArtifact.provider_observability.planning.stage, "planning");
  assert.equal(bundleArtifact.provider_observability.planning.observed_step_count, 1);
  assert.deepEqual(bundleArtifact.provider_observability.planning.steps[0], {
    role: "Builder",
    response_status: 200,
    request_id: "req_planning_123",
    processing_ms: "211",
    remaining_requests: "4998",
    remaining_tokens: "198000",
    retry_after: null
  });

  assert.equal(bundleArtifact.provider_observability.proposal.stage, "proposal");
  assert.equal(
    bundleArtifact.provider_observability.proposal.observed_step_count,
    result.proposalExecution.execution.steps.length
  );
  assert.deepEqual(
    bundleArtifact.provider_observability.proposal.steps.map((step) => step.request_id),
    result.proposalExecution.execution.steps.map(() => "req_middle_234")
  );

  assert.equal(bundleArtifact.provider_observability.review.stage, "review");
  assert.equal(
    bundleArtifact.provider_observability.review.observed_step_count,
    result.reviewExecution.execution.steps.length
  );
  assert.deepEqual(
    bundleArtifact.provider_observability.review.steps.map((step) => step.request_id),
    result.reviewExecution.execution.steps.map(() => "req_middle_234")
  );

  assert.equal(bundleArtifact.provider_observability.approval.stage, "approval");
  assert.equal(
    bundleArtifact.provider_observability.approval.observed_step_count,
    result.approvalExecution.execution.steps.length
  );
  assert.deepEqual(
    bundleArtifact.provider_observability.approval.steps.map((step) => step.request_id),
    result.approvalExecution.execution.steps.map(() => "req_approval_456")
  );

  assert.equal(bundleArtifact.provider_observability.signal_resume_proposal.stage, "proposal");
  assert.deepEqual(
    bundleArtifact.provider_observability.signal_resume_proposal.steps.map((step) => step.request_id),
    result.signalResumeProposalExecution.execution.steps.map(() => "req_signal_567")
  );

  assert.equal(bundleArtifact.provider_observability.signal_resume_review.stage, "review");
  assert.deepEqual(
    bundleArtifact.provider_observability.signal_resume_review.steps.map((step) => step.request_id),
    result.signalResumeReviewExecution.execution.steps.map(() => "req_signal_567")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_approval.stage, "approval");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_approval.steps.map((step) => step.request_id),
    result.escalationApprovalExecution.execution.steps.map(() => "req_escalation_678")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_resume_proposal.stage, "proposal");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_resume_proposal.steps.map((step) => step.request_id),
    result.escalationResumeProposalExecution.execution.steps.map(() => "req_escalation_resume_789")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_resume_review.stage, "review");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_resume_review.steps.map((step) => step.request_id),
    result.escalationResumeReviewExecution.execution.steps.map(() => "req_escalation_resume_789")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_approve_approval.stage, "approval");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_approve_approval.steps.map((step) => step.request_id),
    result.escalationApproveApprovalExecution.execution.steps.map(() => "req_escalation_approve_901")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_stop_approval.stage, "approval");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_stop_approval.steps.map((step) => step.request_id),
    result.escalationStopApprovalExecution.execution.steps.map(() => "req_escalation_stop_902")
  );
  assert.equal(bundleArtifact.branch_outcomes.happy_path.proposal_status, "completed");
  assert.equal(bundleArtifact.branch_outcomes.happy_path.review_status, "completed");
  assert.equal(bundleArtifact.branch_outcomes.happy_path.approval_status, "approved");
  assert.equal(bundleArtifact.branch_outcomes.signal_reopen.routing_mode, "deep-path");
  assert.equal(bundleArtifact.branch_outcomes.escalation_reopen.guardian_veto_used, true);
  assert.equal(bundleArtifact.branch_outcomes.escalation_approve.approval_status, "rejected");
  assert.equal(bundleArtifact.branch_outcomes.escalation_stop.approval_status, "rejected");
  assert.equal(bundleArtifact.verification_recommendation.action, "investigate-drift");
  assert.equal(bundleArtifact.verification_recommendation.urgency, "warning");
  assert.match(reportArtifact, /provider: openai-compatible/);
  assert.match(reportArtifact, /model: gpt-4\.1-mini/);
  assert.match(reportArtifact, /remaining_requests=4998/);
  assert.match(reportArtifact, /escalation approve note: Human approver accepted the exception/);
});

test("liveVerifyCommand can archive its own verification run into the project-local archive", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const artifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verification-archived");

  const result = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath,
    archiveVerification: true,
    archiveDir: "",
    archiveMaxRuns: 1
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "completed");
  assert.equal(result.archiveResult?.ok, true);
  assert.equal(result.archiveResult?.importedCount, 1);
  assert.equal(result.archiveResult?.skippedCount, 0);
  assert.equal(result.archiveResult?.overallRecommendedAction, "investigate-lineage-drift");
  assert.equal(result.archiveResult?.dashboardIndexRecommendedAction, "human-review-recommended");

  const manifestJson = JSON.parse(await fs.readFile(result.archiveResult.manifestJsonPath, "utf8"));
  const archiveIndexJson = JSON.parse(await fs.readFile(result.archiveResult.archiveIndexJsonPath, "utf8"));
  const dashboardIndexJson = JSON.parse(await fs.readFile(result.archiveResult.dashboardIndexJsonPath, "utf8"));

  assert.equal(manifestJson.artifact_type, "verification-archive-manifest");
  assert.equal(manifestJson.run_count, 1);
  assert.equal(manifestJson.entries.length, 1);
  assert.equal(manifestJson.retention_policy.max_runs, 1);
  assert.equal(manifestJson.entries[0].source_bundle_path, result.bundlePath);
  assert.ok(manifestJson.entries[0].archived_bundle_path.endsWith("verification-bundle.json"));
  assert.equal(archiveIndexJson.artifact_type, "verification-archive-index");
  assert.equal(archiveIndexJson.retained_count, 1);
  assert.equal(archiveIndexJson.retention_policy.max_runs, 1);
  assert.equal(archiveIndexJson.retention_reached, true);
  assert.equal(archiveIndexJson.health_status, "critical");
  assert.equal(archiveIndexJson.threshold_status, "breached");
  assert.equal(archiveIndexJson.operator_recommendation.action, "human-review-recommended");
  assert.ok(archiveIndexJson.alerts.some((item) => item.code === "archive-retention-capacity-reached"));
  assert.ok(archiveIndexJson.threshold_breaches.some((item) => item.code === "archive-dashboard-threshold-required-within"));
  assert.equal(archiveIndexJson.latest_archived_run.source_bundle_path, result.bundlePath);
  assert.equal(archiveIndexJson.overall_operator_recommendation, "investigate-lineage-drift");
  assert.equal(archiveIndexJson.dashboard_index_recommendation, "human-review-recommended");

  assert.equal(dashboardIndexJson.artifact_type, "verification-dashboard-index");
  assert.equal(dashboardIndexJson.health_status, "warning");
  assert.equal(dashboardIndexJson.threshold_status, "breached");
  assert.equal(dashboardIndexJson.operator_recommendation.action, "human-review-recommended");
});

test("verifyHistoryCommand aggregates multiple verification bundles into JSON and Markdown history artifacts", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const firstArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-history-a");
  const secondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-history-b");
  const historyArtifactDir = path.join(projectRoot, ".aof", "artifacts", "verification-history");

  const firstResult = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const secondResult = await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const result = await verifyHistoryCommand({
    inputs: [
      firstArtifactDir,
      path.join(secondArtifactDir, "verification-bundle.json")
    ],
    artifactDir: historyArtifactDir
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "completed");
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.providers, ["mock"]);
  assert.deepEqual(result.workflows, ["aidlc"]);
  assert.equal(result.historyJsonPath.endsWith("verification-history.json"), true);
  assert.equal(result.historyReportPath.endsWith("verification-history.md"), true);

  const historyJson = JSON.parse(await fs.readFile(result.historyJsonPath, "utf8"));
  const historyReport = await fs.readFile(result.historyReportPath, "utf8");

  assert.equal(historyJson.artifact_type, "verification-history");
  assert.equal(historyJson.entry_count, 2);
  assert.deepEqual(historyJson.summary.providers, ["mock"]);
  assert.deepEqual(historyJson.summary.workflows, ["aidlc"]);
  assert.equal(historyJson.summary.statuses.completed, 2);
  assert.equal(historyJson.summary.drift.has_drift, true);
  assert.equal(historyJson.summary.recommendation.first_action, "investigate-drift");
  assert.equal(historyJson.summary.recommendation.first_urgency, "warning");
  assert.equal(historyJson.summary.recommendation.latest_action, "continue-monitoring");
  assert.equal(historyJson.summary.recommendation.latest_urgency, "healthy");
  assert.equal(historyJson.summary.recommendation.previous_action, "investigate-drift");
  assert.equal(historyJson.summary.recommendation.previous_urgency, "warning");
  assert.equal(historyJson.summary.recommendation.latest_transition, "de-escalated");
  assert.deepEqual(historyJson.summary.recommendation.distinct_actions, [
    "investigate-drift",
    "continue-monitoring"
  ]);
  assert.deepEqual(historyJson.summary.recommendation.distinct_urgencies, [
    "warning",
    "healthy"
  ]);
  assert.deepEqual(
    historyJson.summary.recommendation.timeline.map((item) => [item.entry_index, item.action, item.urgency]),
    [
      [0, "investigate-drift", "warning"],
      [1, "continue-monitoring", "healthy"]
    ]
  );
  assert.deepEqual(historyJson.summary.drift.fields_with_drift, [
    "routing_mode",
    "verification_recommendation_action",
    "verification_recommendation_urgency",
    "signal_reopen_status"
  ]);
  assert.deepEqual(historyJson.summary.latest_comparison.changed_fields, [
    "routing_mode",
    "verification_recommendation_action",
    "verification_recommendation_urgency",
    "signal_reopen_status"
  ]);
  assert.equal(historyJson.summary.latest_comparison.fields.find((field) => field.field === "routing_mode")?.from, "deep-path");
  assert.equal(historyJson.summary.latest_comparison.fields.find((field) => field.field === "routing_mode")?.to, "fast-track");
  assert.equal(historyJson.summary.latest_comparison.fields.find((field) => field.field === "verification_recommendation_action")?.from, "investigate-drift");
  assert.equal(historyJson.summary.latest_comparison.fields.find((field) => field.field === "verification_recommendation_action")?.to, "continue-monitoring");
  assert.equal(historyJson.entries[0].workflow.workflow_id, "aidlc");
  assert.equal(historyJson.entries[0].provider, "mock");
  assert.equal(historyJson.entries[0].verification_recommendation.action, "investigate-drift");
  assert.equal(historyJson.entries[0].branch_outcomes.happy_path.approval_status, "approved");
  assert.equal(historyJson.entries[1].routing_mode, "fast-track");
  assert.equal(historyJson.entries[1].verification_recommendation.action, "continue-monitoring");
  assert.equal(historyJson.entries[1].branch_policies.happy_path.routing_mode, "fast-track");
  assert.equal(historyJson.entries[1].provider_observability.observed_stage_count, 0);
  assert.deepEqual(historyJson.sources, [
    path.resolve(firstArtifactDir),
    path.resolve(path.join(secondArtifactDir, "verification-bundle.json"))
  ]);

  assert.match(historyReport, /^# Verification History Report/m);
  assert.match(historyReport, /entry count: 2/);
  assert.match(historyReport, /providers: mock/);
  assert.match(historyReport, /workflows: aidlc/);
  assert.match(historyReport, /## Drift Summary/);
  assert.match(historyReport, /fields with drift: routing_mode, verification_recommendation_action, verification_recommendation_urgency, signal_reopen_status/);
  assert.match(historyReport, /routing_mode: has_drift=true, distinct=deep-path, fast-track/);
  assert.match(historyReport, /verification_recommendation_action: has_drift=true, distinct=investigate-drift, continue-monitoring/);
  assert.match(historyReport, /## Latest Comparison/);
  assert.match(historyReport, /changed fields: routing_mode, verification_recommendation_action, verification_recommendation_urgency, signal_reopen_status/);
  assert.match(historyReport, /routing_mode: from=deep-path, to=fast-track, changed=true/);
  assert.match(historyReport, /verification_recommendation_action: from=investigate-drift, to=continue-monitoring, changed=true/);
  assert.match(historyReport, /## Recommendation Summary/);
  assert.match(historyReport, /first action: investigate-drift/);
  assert.match(historyReport, /latest action: continue-monitoring/);
  assert.match(historyReport, /latest transition: de-escalated/);
  assert.match(historyReport, /distinct actions: investigate-drift, continue-monitoring/);
  assert.match(historyReport, /\[0\] generated_at=.*action=investigate-drift, urgency=warning/);
  assert.match(historyReport, /\[1\] generated_at=.*action=continue-monitoring, urgency=healthy/);
  assert.match(historyReport, /## Entries/);
  assert.match(historyReport, /verification recommendation: investigate-drift \/ urgency=warning/);
  assert.match(historyReport, /happy path approval: approved/);
  assert.match(historyReport, /routing mode: fast-track/);

  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, true);
});

test("verifyLogCommand appends verification entries and deduplicates by bundle path", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const firstArtifactDir = path.join(projectRoot, ".aof", "artifacts", "log-a");
  const secondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "log-b");
  const logArtifactDir = path.join(projectRoot, ".aof", "artifacts", "verification-log");

  const firstResult = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const secondResult = await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const firstAppend = await verifyLogCommand({
    inputs: [firstArtifactDir],
    artifactDir: logArtifactDir
  });
  const secondAppend = await verifyLogCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: logArtifactDir
  });

  assert.equal(firstAppend.ok, true);
  assert.equal(firstAppend.entryCount, 1);
  assert.equal(secondAppend.ok, true);
  assert.equal(secondAppend.entryCount, 2);

  const logJson = JSON.parse(await fs.readFile(secondAppend.logJsonPath, "utf8"));
  const logReport = await fs.readFile(secondAppend.logReportPath, "utf8");
  const indexJson = JSON.parse(await fs.readFile(secondAppend.indexJsonPath, "utf8"));
  const indexReport = await fs.readFile(secondAppend.indexReportPath, "utf8");

  assert.equal(logJson.artifact_type, "verification-log");
  assert.equal(logJson.entry_count, 2);
  assert.equal(logJson.summary.statuses.completed, 2);
  assert.deepEqual(logJson.summary.providers, ["mock"]);
  assert.deepEqual(logJson.summary.workflows, ["aidlc"]);
  assert.equal(logJson.threshold_trend.first_breach_generated_at, logJson.entries[1].generated_at);
  assert.equal(logJson.threshold_trend.latest_breach_generated_at, logJson.entries[1].generated_at);
  assert.equal(logJson.threshold_trend.consecutive_breached_run_count, 1);
  assert.equal(logJson.threshold_trend.latest_trend, "worsened");
  assert.equal(logJson.operator_recommendation.action, "investigate-drift");
  assert.equal(logJson.operator_recommendation.urgency, "warning");
  assert.ok(logJson.operator_recommendation.source_signals.includes("warning-alert-threshold-exceeded"));
  assert.equal(logJson.recommendation_trend.first_non_monitoring_generated_at, logJson.entries[1].generated_at);
  assert.equal(logJson.recommendation_trend.latest_action, "investigate-drift");
  assert.equal(logJson.recommendation_trend.latest_urgency, "warning");
  assert.equal(logJson.recommendation_trend.latest_transition, "escalated");
  assert.equal(logJson.recommendation_trend.consecutive_identical_recommendation_count, 1);
  assert.deepEqual(
    logJson.threshold_trend.timeline.map((item) => [item.entry_index, item.threshold_status, item.threshold_breach_count]),
    [
      [0, "within-threshold", 0],
      [1, "breached", 1]
    ]
  );
  assert.deepEqual(
    logJson.recommendation_trend.timeline.map((item) => [item.entry_index, item.action, item.urgency]),
    [
      [0, "continue-monitoring", "healthy"],
      [1, "investigate-drift", "warning"]
    ]
  );
  assert.equal(logJson.entries.length, 2);
  assert.equal(logJson.entries[0].bundle_path, path.join(firstArtifactDir, "verification-bundle.json"));
  assert.equal(logJson.entries[1].bundle_path, path.join(secondArtifactDir, "verification-bundle.json"));
  assert.equal(logJson.summary.latest_comparison.fields.find((field) => field.field === "routing_mode")?.to, "fast-track");
  assert.match(logReport, /^# Verification Log Report/m);
  assert.match(logReport, /entry count: 2/);
  assert.match(logReport, /changed fields: routing_mode/);
  assert.match(logReport, /routing_mode: from=deep-path, to=fast-track, changed=true/);
  assert.match(logReport, /## Operator Recommendation/);
  assert.match(logReport, /action: investigate-drift/);
  assert.match(logReport, /urgency: warning/);
  assert.match(logReport, /## Recommendation Trend/);
  assert.match(logReport, /first non-monitoring generated at:/);
  assert.match(logReport, /latest transition: escalated/);
  assert.match(logReport, /\[0\] generated_at=.*action=continue-monitoring, urgency=healthy/);
  assert.match(logReport, /\[1\] generated_at=.*action=investigate-drift, urgency=warning/);
  assert.match(logReport, /## Threshold Trend/);
  assert.match(logReport, /first breach generated at:/);
  assert.match(logReport, /consecutive breached run count: 1/);
  assert.match(logReport, /latest trend: worsened/);
  assert.match(logReport, /\[0\] generated_at=.*threshold_status=within-threshold, threshold_breach_count=0/);
  assert.match(logReport, /\[1\] generated_at=.*threshold_status=breached, threshold_breach_count=1/);
  assert.equal(indexJson.artifact_type, "verification-index");
  assert.equal(indexJson.entry_count, 2);
  assert.equal(indexJson.health_status, "warning");
  assert.equal(indexJson.threshold_status, "breached");
  assert.equal(indexJson.operator_recommendation.action, "investigate-drift");
  assert.equal(indexJson.operator_recommendation.urgency, "warning");
  assert.equal(indexJson.recommendation_summary.first_non_monitoring_generated_at, logJson.entries[1].generated_at);
  assert.equal(indexJson.recommendation_summary.latest_action, "investigate-drift");
  assert.equal(indexJson.recommendation_summary.latest_urgency, "warning");
  assert.equal(indexJson.recommendation_summary.latest_transition, "escalated");
  assert.equal(indexJson.recommendation_summary.previous_action, "continue-monitoring");
  assert.equal(indexJson.recommendation_summary.previous_urgency, "healthy");
  assert.equal(indexJson.recommendation_summary.latest_generated_at, logJson.entries[1].generated_at);
  assert.equal(indexJson.recommendation_summary.consecutive_identical_recommendation_count, 1);
  assert.equal(indexJson.summary.alert_count, 2);
  assert.deepEqual(indexJson.monitoring_policy.field_severity.critical, [
    "provider",
    "model",
    "workflow_id",
    "happy_path_approval_status"
  ]);
  assert.deepEqual(indexJson.monitoring_policy.field_severity.warning, [
    "routing_mode",
    "verification_recommendation_action",
    "verification_recommendation_urgency",
    "signal_reopen_status",
    "escalation_reopen_status",
    "escalation_approve_status",
    "escalation_stop_status"
  ]);
  assert.deepEqual(indexJson.summary.alert_severity_counts, {
    critical: 0,
    warning: 2,
    info: 0
  });
  assert.deepEqual(indexJson.monitoring_policy.thresholds, {
    max_critical_alerts: 0,
    max_warning_alerts: 1,
    require_latest_run_completed: true,
    require_latest_happy_path_approved: true,
    min_observed_provider_stages_non_mock: 1
  });
  assert.deepEqual(indexJson.summary.threshold_breach_severity_counts, {
    critical: 0,
    warning: 1,
    info: 0
  });
  assert.equal(indexJson.summary.threshold_breach_count, 1);
  assert.deepEqual(indexJson.summary.drift_fields, [
    "routing_mode"
  ]);
  assert.deepEqual(indexJson.summary.latest_changed_fields, [
    "routing_mode"
  ]);
  assert.deepEqual(
    indexJson.alerts.map((alert) => [alert.code, alert.severity]),
    [
      ["verification-drift-detected", "warning"],
      ["latest-comparison-changes-detected", "warning"]
    ]
  );
  assert.deepEqual(
    indexJson.threshold_breaches.map((breach) => [breach.code, breach.severity]),
    [
      ["warning-alert-threshold-exceeded", "warning"]
    ]
  );
  assert.equal(indexJson.latest_entry.status, "completed");
  assert.equal(indexJson.latest_entry.routing_mode, "fast-track");
  assert.equal(indexJson.latest_entry.provider, "mock");
  assert.equal(indexJson.latest_entry.workflow.workflow_id, "aidlc");
  assert.match(indexReport, /^# Verification Index Report/m);
  assert.match(indexReport, /health status: warning/);
  assert.match(indexReport, /threshold status: breached/);
  assert.match(indexReport, /action: investigate-drift/);
  assert.match(indexReport, /urgency: warning/);
  assert.match(indexReport, /## Recommendation Summary/);
  assert.match(indexReport, /latest transition: escalated/);
  assert.match(indexReport, /previous action: continue-monitoring/);
  assert.match(indexReport, /consecutive identical recommendation count: 1/);
  assert.match(indexReport, /alert count: 2/);
  assert.match(indexReport, /alert severity counts: critical=0, warning=2, info=0/);
  assert.match(indexReport, /threshold breach count: 1/);
  assert.match(indexReport, /threshold breach severity counts: critical=0, warning=1, info=0/);
  assert.match(indexReport, /critical fields: provider, model, workflow_id, happy_path_approval_status/);
  assert.match(indexReport, /warning fields: routing_mode, verification_recommendation_action, verification_recommendation_urgency, signal_reopen_status, escalation_reopen_status, escalation_approve_status, escalation_stop_status/);
  assert.match(indexReport, /max warning alerts: 1/);
  assert.match(indexReport, /\[warning\] verification-drift-detected:/);
  assert.match(indexReport, /\[warning\] latest-comparison-changes-detected:/);
  assert.match(indexReport, /\[warning\] warning-alert-threshold-exceeded:/);
  assert.match(indexReport, /status: completed/);
  assert.match(indexReport, /latest changed fields: routing_mode/);
  assert.match(indexReport, /routing mode: fast-track/);

  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, true);
});

