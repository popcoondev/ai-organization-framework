import path from "node:path";
import fs from "node:fs/promises";
import { answerCommand } from "./answer.js";
import { councilExecCommand } from "./council-exec.js";
import { escalationResolveCommand } from "./escalation-resolve.js";
import { providerCheckCommand } from "./provider-check.js";
import { runCommand } from "./run.js";
import { signalCommand } from "./signal.js";
import { ensureDir, nowIso, writeJsonArtifact } from "../runtime/utils.js";

const DEFAULT_RESPONSES = [
  "新規登録導線全体",
  "登録完了率を 5% 改善する",
  "認証基盤は変更しない"
];

const DEFAULT_SIGNAL_RESPONSES = [
  "外部変化を踏まえて認証制約は維持したまま段階導入へ切り替える"
];

const DEFAULT_ESCALATION_RESUME_RESPONSES = [
  "Guardian 指摘を踏まえて認証制約を維持したまま段階導入へ切り替える"
];

const DEFAULT_ESCALATION_REOPEN_NOTE = "Need broader clarification after approval rejection";
const DEFAULT_ESCALATION_APPROVE_NOTE = "Human approver accepted the exception";
const DEFAULT_ESCALATION_STOP_NOTE = "Human approver chose to stop the work";

function resolveResponses(responses = []) {
  return responses.length > 0 ? responses : DEFAULT_RESPONSES;
}

function resolveSignalResponses(responses = []) {
  return responses.length > 0 ? responses : DEFAULT_SIGNAL_RESPONSES;
}

function resolveEscalationResumeResponses(responses = []) {
  return responses.length > 0 ? responses : DEFAULT_ESCALATION_RESUME_RESPONSES;
}

async function resolveSignalPath(projectRoot, requestedPath = "") {
  if (requestedPath) {
    return path.resolve(requestedPath);
  }

  const defaultPath = path.join(projectRoot, ".aof", "signals", "SIG-001.json");
  await fs.access(defaultPath);
  return defaultPath;
}

function buildExecutionPolicy(options, responses) {
  return {
    provider: options.provider,
    model: options.model || "provider-default",
    base_url: options.baseUrl || "env-or-provider-default",
    api_key_source: options.apiKey
      ? "explicit"
      : options.apiKeyEnv
        ? `env:${options.apiKeyEnv}`
        : "env:AOF_MODEL_API_KEY",
    ping_requested: Boolean(options.ping),
    include_middle_stages: Boolean(options.includeMiddleStages),
    include_approval: Boolean(options.includeApproval),
    include_signal_reopen: Boolean(options.includeSignalReopen),
    include_escalation_reopen: Boolean(options.includeEscalationReopen),
    include_escalation_terminal: Boolean(options.includeEscalationTerminal),
    routing_mode: options.routingMode || "workflow-default",
    timeout_ms: Number.isFinite(options.timeoutMs) ? options.timeoutMs : 30000,
    max_retries: Number.isInteger(options.maxRetries) ? options.maxRetries : 0,
    response_count: responses.length,
    signal_response_count: options.includeSignalReopen ? resolveSignalResponses(options.signalResponses).length : 0,
    escalation_resume_response_count: options.includeEscalationReopen ? resolveEscalationResumeResponses(options.escalationResumeResponses).length : 0,
    used_default_responses: responses === DEFAULT_RESPONSES
  };
}

async function runEscalationBranch({
  projectRoot,
  artifactDir,
  request,
  routingMode,
  responses,
  includeMiddleStages,
  resolution,
  resolutionNote,
  resolutionResponses,
  providerOptions,
  approvalArtifactName,
  resolutionArtifactName,
  resumeProposalArtifactName,
  resumeReviewArtifactName
}) {
  const runResult = await runCommand({
    project: projectRoot,
    request,
    routingMode
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses
  });

  const escalationMockSeatVetos = providerOptions.provider === "mock"
    ? (providerOptions.escalationMockSeatVetos?.length ? providerOptions.escalationMockSeatVetos : ["Guardian=yes"])
    : [];

  const approvalExecution = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: providerOptions.provider,
    model: providerOptions.model,
    baseUrl: providerOptions.baseUrl,
    apiKey: providerOptions.apiKey,
    apiKeyEnv: providerOptions.apiKeyEnv,
    timeoutMs: providerOptions.timeoutMs,
    maxRetries: providerOptions.maxRetries,
    mockSeatDecisions: [],
    mockSeatVetos: escalationMockSeatVetos,
    temperature: providerOptions.temperature,
    artifactPath: path.join(artifactDir, approvalArtifactName)
  });

  const resolutionResult = await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution,
    note: resolutionNote
  });

  await writeJsonArtifact(path.join(artifactDir, resolutionArtifactName), {
    artifact_type: `escalation-${resolution}`,
    generated_at: nowIso(),
    payload: resolutionResult
  });

  let resumeAnswer = null;
  let resumeProposalExecution = null;
  let resumeReviewExecution = null;

  if (resolution === "reopen") {
    resumeAnswer = await answerCommand({
      session: runResult.sessionPath,
      responses: resolutionResponses
    });

    if (includeMiddleStages) {
      resumeProposalExecution = await councilExecCommand({
        session: runResult.sessionPath,
        stage: "proposal",
        project: projectRoot,
        role: "",
        includeOptional: true,
        invokeModel: true,
        provider: providerOptions.provider,
        model: providerOptions.model,
        baseUrl: providerOptions.baseUrl,
        apiKey: providerOptions.apiKey,
        apiKeyEnv: providerOptions.apiKeyEnv,
        timeoutMs: providerOptions.timeoutMs,
        maxRetries: providerOptions.maxRetries,
        mockSeatDecisions: [],
        mockSeatVetos: [],
        temperature: providerOptions.temperature,
        artifactPath: path.join(artifactDir, resumeProposalArtifactName)
      });

      resumeReviewExecution = await councilExecCommand({
        session: runResult.sessionPath,
        stage: "review",
        project: projectRoot,
        role: "",
        includeOptional: true,
        invokeModel: true,
        provider: providerOptions.provider,
        model: providerOptions.model,
        baseUrl: providerOptions.baseUrl,
        apiKey: providerOptions.apiKey,
        apiKeyEnv: providerOptions.apiKeyEnv,
        timeoutMs: providerOptions.timeoutMs,
        maxRetries: providerOptions.maxRetries,
        mockSeatDecisions: [],
        mockSeatVetos: [],
        temperature: providerOptions.temperature,
        artifactPath: path.join(artifactDir, resumeReviewArtifactName)
      });
    }
  }

  return {
    runResult,
    answerResult,
    approvalExecution,
    resolutionResult,
    resumeAnswer,
    resumeProposalExecution,
    resumeReviewExecution
  };
}

function summarizeProviderObservability(executionResult) {
  if (!executionResult?.execution?.steps) {
    return null;
  }

  const steps = executionResult.execution.steps
    .map((step) => {
      const metadata = step?.result?.provider_metadata;
      const headers = metadata?.response_headers ?? {};
      const hasObservability = metadata?.response_status || Object.keys(headers).length > 0;
      if (!hasObservability) {
        return null;
      }

      return {
        role: step.role,
        response_status: metadata.response_status ?? null,
        request_id: headers.x_request_id ?? headers.request_id ?? null,
        processing_ms: headers.openai_processing_ms ?? null,
        remaining_requests: headers.x_ratelimit_remaining_requests ?? null,
        remaining_tokens: headers.x_ratelimit_remaining_tokens ?? null,
        retry_after: headers.retry_after ?? null
      };
    })
    .filter(Boolean);

  return {
    execution_id: executionResult.executionId,
    stage: executionResult.stage,
    step_count: executionResult.execution.steps.length,
    observed_step_count: steps.length,
    steps
  };
}

export async function liveVerifyCommand(options) {
  const projectRoot = path.resolve(options.project);
  const artifactDir = path.resolve(options.artifactDir);
  const responses = resolveResponses(options.responses);
  const signalResponses = resolveSignalResponses(options.signalResponses);
  const escalationResumeResponses = resolveEscalationResumeResponses(options.escalationResumeResponses);
  const executionPolicy = buildExecutionPolicy(options, responses);
  await ensureDir(artifactDir);

  const providerCheck = await providerCheckCommand({
    provider: options.provider,
    model: options.model,
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    apiKeyEnv: options.apiKeyEnv,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    temperature: options.temperature,
    ping: options.ping,
    artifactPath: path.join(artifactDir, "provider-check.json")
  });

  if (!providerCheck.ok) {
    const failureBundle = {
      artifact_type: "live-provider-verification",
      generated_at: nowIso(),
      status: "preflight_failed",
      projectRoot,
      artifactDir,
      request: options.request,
      execution_policy: executionPolicy,
      providerCheck
    };
    const bundlePath = await writeJsonArtifact(path.join(artifactDir, "verification-bundle.json"), failureBundle);
    return {
      ok: false,
      status: "preflight_failed",
      projectRoot,
      artifactDir,
      bundlePath,
      providerCheck
    };
  }

  const runResult = await runCommand({
    project: projectRoot,
    request: options.request,
    routingMode: options.routingMode
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses
  });

  const planningExecution = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "planning",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: options.provider,
    model: options.model,
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    apiKeyEnv: options.apiKeyEnv,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: options.temperature,
    artifactPath: path.join(artifactDir, "planning-exec.json")
  });

  const proposalExecution = options.includeMiddleStages
    ? await councilExecCommand({
        session: runResult.sessionPath,
        stage: "proposal",
        project: projectRoot,
        role: "",
        includeOptional: true,
        invokeModel: true,
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        apiKeyEnv: options.apiKeyEnv,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        mockSeatDecisions: [],
        mockSeatVetos: [],
        temperature: options.temperature,
        artifactPath: path.join(artifactDir, "proposal-exec.json")
      })
    : null;

  const reviewExecution = options.includeMiddleStages
    ? await councilExecCommand({
        session: runResult.sessionPath,
        stage: "review",
        project: projectRoot,
        role: "",
        includeOptional: true,
        invokeModel: true,
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        apiKeyEnv: options.apiKeyEnv,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        mockSeatDecisions: [],
        mockSeatVetos: [],
        temperature: options.temperature,
        artifactPath: path.join(artifactDir, "review-exec.json")
      })
    : null;

  const approvalExecution = options.includeApproval
    ? await councilExecCommand({
        session: runResult.sessionPath,
        stage: "approval",
        project: projectRoot,
        role: "",
        includeOptional: false,
        invokeModel: true,
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        apiKeyEnv: options.apiKeyEnv,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        mockSeatDecisions: [],
        mockSeatVetos: [],
        temperature: options.temperature,
        artifactPath: path.join(artifactDir, "approval-exec.json")
      })
    : null;

  const signalReopen = options.includeSignalReopen
    ? await signalCommand({
        session: runResult.sessionPath,
        signal: await resolveSignalPath(projectRoot, options.signalPath)
      })
    : null;

  let signalResumeAnswer = null;
  let signalResumeProposalExecution = null;
  let signalResumeReviewExecution = null;
  let escalationRunResult = null;
  let escalationAnswerResult = null;
  let escalationApprovalExecution = null;
  let escalationReopen = null;
  let escalationResumeAnswer = null;
  let escalationResumeProposalExecution = null;
  let escalationResumeReviewExecution = null;
  let escalationApproveRunResult = null;
  let escalationApproveAnswerResult = null;
  let escalationApproveApprovalExecution = null;
  let escalationApproveResolution = null;
  let escalationStopRunResult = null;
  let escalationStopAnswerResult = null;
  let escalationStopApprovalExecution = null;
  let escalationStopResolution = null;

  if (signalReopen) {
    signalResumeAnswer = await answerCommand({
      session: runResult.sessionPath,
      responses: signalResponses
    });

    if (options.includeMiddleStages) {
      signalResumeProposalExecution = await councilExecCommand({
        session: runResult.sessionPath,
        stage: "proposal",
        project: projectRoot,
        role: "",
        includeOptional: true,
        invokeModel: true,
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        apiKeyEnv: options.apiKeyEnv,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        mockSeatDecisions: [],
        mockSeatVetos: [],
        temperature: options.temperature,
        artifactPath: path.join(artifactDir, "signal-resume-proposal-exec.json")
      });

      signalResumeReviewExecution = await councilExecCommand({
        session: runResult.sessionPath,
        stage: "review",
        project: projectRoot,
        role: "",
        includeOptional: true,
        invokeModel: true,
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        apiKeyEnv: options.apiKeyEnv,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        mockSeatDecisions: [],
        mockSeatVetos: [],
        temperature: options.temperature,
        artifactPath: path.join(artifactDir, "signal-resume-review-exec.json")
      });
    }
  }

  if (options.includeEscalationReopen) {
    const escalationBranch = await runEscalationBranch({
      projectRoot,
      artifactDir,
      request: options.request,
      routingMode: options.routingMode,
      responses,
      includeMiddleStages: options.includeMiddleStages,
      resolution: "reopen",
      resolutionNote: options.escalationReopenNote || DEFAULT_ESCALATION_REOPEN_NOTE,
      resolutionResponses: escalationResumeResponses,
      providerOptions: {
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        apiKeyEnv: options.apiKeyEnv,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        temperature: options.temperature,
        escalationMockSeatVetos: options.escalationMockSeatVetos
      },
      approvalArtifactName: "escalation-approval-exec.json",
      resolutionArtifactName: "escalation-reopen.json",
      resumeProposalArtifactName: "escalation-resume-proposal-exec.json",
      resumeReviewArtifactName: "escalation-resume-review-exec.json"
    });

    escalationRunResult = escalationBranch.runResult;
    escalationAnswerResult = escalationBranch.answerResult;
    escalationApprovalExecution = escalationBranch.approvalExecution;
    escalationReopen = escalationBranch.resolutionResult;
    escalationResumeAnswer = escalationBranch.resumeAnswer;
    escalationResumeProposalExecution = escalationBranch.resumeProposalExecution;
    escalationResumeReviewExecution = escalationBranch.resumeReviewExecution;
  }

  if (options.includeEscalationTerminal) {
    const escalationApproveBranch = await runEscalationBranch({
      projectRoot,
      artifactDir,
      request: options.request,
      routingMode: options.routingMode,
      responses,
      includeMiddleStages: false,
      resolution: "approve",
      resolutionNote: options.escalationApproveNote || DEFAULT_ESCALATION_APPROVE_NOTE,
      resolutionResponses: [],
      providerOptions: {
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        apiKeyEnv: options.apiKeyEnv,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        temperature: options.temperature,
        escalationMockSeatVetos: options.escalationMockSeatVetos
      },
      approvalArtifactName: "escalation-approve-approval-exec.json",
      resolutionArtifactName: "escalation-approve-resolution.json",
      resumeProposalArtifactName: "",
      resumeReviewArtifactName: ""
    });

    escalationApproveRunResult = escalationApproveBranch.runResult;
    escalationApproveAnswerResult = escalationApproveBranch.answerResult;
    escalationApproveApprovalExecution = escalationApproveBranch.approvalExecution;
    escalationApproveResolution = escalationApproveBranch.resolutionResult;

    const escalationStopBranch = await runEscalationBranch({
      projectRoot,
      artifactDir,
      request: options.request,
      routingMode: options.routingMode,
      responses,
      includeMiddleStages: false,
      resolution: "stop",
      resolutionNote: options.escalationStopNote || DEFAULT_ESCALATION_STOP_NOTE,
      resolutionResponses: [],
      providerOptions: {
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        apiKeyEnv: options.apiKeyEnv,
        timeoutMs: options.timeoutMs,
        maxRetries: options.maxRetries,
        temperature: options.temperature,
        escalationMockSeatVetos: options.escalationMockSeatVetos
      },
      approvalArtifactName: "escalation-stop-approval-exec.json",
      resolutionArtifactName: "escalation-stop-resolution.json",
      resumeProposalArtifactName: "",
      resumeReviewArtifactName: ""
    });

    escalationStopRunResult = escalationStopBranch.runResult;
    escalationStopAnswerResult = escalationStopBranch.answerResult;
    escalationStopApprovalExecution = escalationStopBranch.approvalExecution;
    escalationStopResolution = escalationStopBranch.resolutionResult;
  }

  const providerObservability = {
    planning: summarizeProviderObservability(planningExecution),
    proposal: proposalExecution ? summarizeProviderObservability(proposalExecution) : null,
    review: reviewExecution ? summarizeProviderObservability(reviewExecution) : null,
    approval: approvalExecution ? summarizeProviderObservability(approvalExecution) : null,
    signal_resume_proposal: signalResumeProposalExecution ? summarizeProviderObservability(signalResumeProposalExecution) : null,
    signal_resume_review: signalResumeReviewExecution ? summarizeProviderObservability(signalResumeReviewExecution) : null,
    escalation_approval: escalationApprovalExecution ? summarizeProviderObservability(escalationApprovalExecution) : null,
    escalation_resume_proposal: escalationResumeProposalExecution ? summarizeProviderObservability(escalationResumeProposalExecution) : null,
    escalation_resume_review: escalationResumeReviewExecution ? summarizeProviderObservability(escalationResumeReviewExecution) : null,
    escalation_approve_approval: escalationApproveApprovalExecution ? summarizeProviderObservability(escalationApproveApprovalExecution) : null,
    escalation_stop_approval: escalationStopApprovalExecution ? summarizeProviderObservability(escalationStopApprovalExecution) : null
  };

  const bundle = {
    artifact_type: "live-provider-verification",
    generated_at: nowIso(),
    status: "completed",
    projectRoot,
    artifactDir,
    request: options.request,
    responses,
    execution_policy: executionPolicy,
    artifacts: {
      provider_check: path.join(artifactDir, "provider-check.json"),
      planning_execution: path.join(artifactDir, "planning-exec.json"),
      proposal_execution: options.includeMiddleStages ? path.join(artifactDir, "proposal-exec.json") : null,
      review_execution: options.includeMiddleStages ? path.join(artifactDir, "review-exec.json") : null,
      approval_execution: options.includeApproval ? path.join(artifactDir, "approval-exec.json") : null,
      signal_reopen: options.includeSignalReopen ? path.join(artifactDir, "signal-reopen.json") : null,
      signal_resume_proposal_execution: options.includeSignalReopen && options.includeMiddleStages
        ? path.join(artifactDir, "signal-resume-proposal-exec.json")
        : null,
      signal_resume_review_execution: options.includeSignalReopen && options.includeMiddleStages
        ? path.join(artifactDir, "signal-resume-review-exec.json")
        : null,
      escalation_approval_execution: options.includeEscalationReopen ? path.join(artifactDir, "escalation-approval-exec.json") : null,
      escalation_reopen: options.includeEscalationReopen ? path.join(artifactDir, "escalation-reopen.json") : null,
      escalation_resume_proposal_execution: options.includeEscalationReopen && options.includeMiddleStages
        ? path.join(artifactDir, "escalation-resume-proposal-exec.json")
        : null,
      escalation_resume_review_execution: options.includeEscalationReopen && options.includeMiddleStages
        ? path.join(artifactDir, "escalation-resume-review-exec.json")
        : null,
      escalation_approve_approval_execution: options.includeEscalationTerminal
        ? path.join(artifactDir, "escalation-approve-approval-exec.json")
        : null,
      escalation_approve_resolution: options.includeEscalationTerminal
        ? path.join(artifactDir, "escalation-approve-resolution.json")
        : null,
      escalation_stop_approval_execution: options.includeEscalationTerminal
        ? path.join(artifactDir, "escalation-stop-approval-exec.json")
        : null,
      escalation_stop_resolution: options.includeEscalationTerminal
        ? path.join(artifactDir, "escalation-stop-resolution.json")
        : null
    },
    provider_observability: providerObservability,
    providerCheck,
    runResult,
    answerResult,
    planningExecution,
    proposalExecution,
    reviewExecution,
    approvalExecution,
    signalReopen,
    signalResumeAnswer,
    signalResumeProposalExecution,
    signalResumeReviewExecution,
    escalationRunResult,
    escalationAnswerResult,
    escalationApprovalExecution,
    escalationReopen,
    escalationResumeAnswer,
    escalationResumeProposalExecution,
    escalationResumeReviewExecution,
    escalationApproveRunResult,
    escalationApproveAnswerResult,
    escalationApproveApprovalExecution,
    escalationApproveResolution,
    escalationStopRunResult,
    escalationStopAnswerResult,
    escalationStopApprovalExecution,
    escalationStopResolution
  };
  const bundlePath = await writeJsonArtifact(path.join(artifactDir, "verification-bundle.json"), bundle);

  if (signalReopen) {
    await writeJsonArtifact(path.join(artifactDir, "signal-reopen.json"), {
      artifact_type: "signal-reopen",
      generated_at: nowIso(),
      payload: signalReopen
    });
  }

  if (escalationReopen) {
    await writeJsonArtifact(path.join(artifactDir, "escalation-reopen.json"), {
      artifact_type: "escalation-reopen",
      generated_at: nowIso(),
      payload: escalationReopen
    });
  }

  return {
    ok: true,
    status: "completed",
    projectRoot,
    artifactDir,
    bundlePath,
    providerCheck,
    runResult,
    answerResult,
    planningExecution,
    proposalExecution,
    reviewExecution,
    approvalExecution,
    signalReopen,
    signalResumeAnswer,
    signalResumeProposalExecution,
    signalResumeReviewExecution,
    escalationRunResult,
    escalationAnswerResult,
    escalationApprovalExecution,
    escalationReopen,
    escalationResumeAnswer,
    escalationResumeProposalExecution,
    escalationResumeReviewExecution,
    escalationApproveRunResult,
    escalationApproveAnswerResult,
    escalationApproveApprovalExecution,
    escalationApproveResolution,
    escalationStopRunResult,
    escalationStopAnswerResult,
    escalationStopApprovalExecution,
    escalationStopResolution
  };
}
