import path from "node:path";
import fs from "node:fs/promises";
import { answerCommand } from "./answer.js";
import { councilExecCommand } from "./council-exec.js";
import { escalationResolveCommand } from "./escalation-resolve.js";
import { providerCheckCommand } from "./provider-check.js";
import { runCommand } from "./run.js";
import { signalCommand } from "./signal.js";
import { verifyArchiveCommand } from "./verify-archive.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { ensureDir, nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";

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

async function maybeArchiveVerification(options, artifactDir) {
  if (!options.archiveVerification) {
    return null;
  }

  return verifyArchiveCommand({
    project: options.project,
    inputs: [artifactDir],
    archiveDir: options.archiveDir || "",
    maxRuns: options.archiveMaxRuns
  });
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

function buildBranchOutcomes({
  planningExecution,
  proposalExecution,
  reviewExecution,
  approvalExecution,
  signalReopen,
  signalResumeAnswer,
  signalResumeProposalExecution,
  signalResumeReviewExecution,
  escalationApprovalExecution,
  escalationReopen,
  escalationResumeAnswer,
  escalationResumeProposalExecution,
  escalationResumeReviewExecution,
  escalationApproveApprovalExecution,
  escalationApproveResolution,
  escalationStopApprovalExecution,
  escalationStopResolution
}) {
  return {
    happy_path: {
      planning_status: planningExecution?.executionStatus ?? null,
      proposal_status: proposalExecution?.executionStatus ?? null,
      review_status: reviewExecution?.executionStatus ?? null,
      approval_status: approvalExecution?.execution?.approval_outcome?.status ?? null,
      guardian_veto_used: approvalExecution?.execution?.approval_outcome?.guardian_veto_used ?? null
    },
    signal_reopen: signalReopen
      ? {
          reopen_status: signalReopen.status,
          routing_mode: signalReopen.routingMode ?? null,
          resume_answer_status: signalResumeAnswer?.status ?? null,
          resume_proposal_status: signalResumeProposalExecution?.executionStatus ?? null,
          resume_review_status: signalResumeReviewExecution?.executionStatus ?? null
        }
      : null,
    escalation_reopen: escalationReopen
      ? {
          approval_status: escalationApprovalExecution?.execution?.approval_outcome?.status ?? null,
          guardian_veto_used: escalationApprovalExecution?.execution?.approval_outcome?.guardian_veto_used ?? null,
          resolution_status: escalationReopen.status,
          resume_answer_status: escalationResumeAnswer?.status ?? null,
          resume_proposal_status: escalationResumeProposalExecution?.executionStatus ?? null,
          resume_review_status: escalationResumeReviewExecution?.executionStatus ?? null
        }
      : null,
    escalation_approve: escalationApproveResolution
      ? {
          approval_status: escalationApproveApprovalExecution?.execution?.approval_outcome?.status ?? null,
          guardian_veto_used: escalationApproveApprovalExecution?.execution?.approval_outcome?.guardian_veto_used ?? null,
          resolution_status: escalationApproveResolution.status
        }
      : null,
    escalation_stop: escalationStopResolution
      ? {
          approval_status: escalationStopApprovalExecution?.execution?.approval_outcome?.status ?? null,
          guardian_veto_used: escalationStopApprovalExecution?.execution?.approval_outcome?.guardian_veto_used ?? null,
          resolution_status: escalationStopResolution.status
        }
      : null
  };
}

function buildBranchPolicies({
  executionPolicy,
  runResult,
  signalReopen,
  escalationRunResult,
  escalationReopen,
  escalationApproveRunResult,
  escalationApproveResolution,
  escalationStopRunResult,
  escalationStopResolution,
  options
}) {
  return {
    happy_path: {
      routing_mode: runResult?.routingMode ?? executionPolicy.routing_mode,
      include_middle_stages: executionPolicy.include_middle_stages,
      include_approval: executionPolicy.include_approval,
      provider: executionPolicy.provider,
      model: executionPolicy.model,
      timeout_ms: executionPolicy.timeout_ms,
      max_retries: executionPolicy.max_retries
    },
    signal_reopen: signalReopen
      ? {
          pre_reopen_routing_mode: runResult?.routingMode ?? executionPolicy.routing_mode,
          post_reopen_routing_mode: signalReopen.routingMode ?? null,
          routing_escalated: signalReopen.reopenContext?.routing_escalated ?? null,
          include_middle_stages: executionPolicy.include_middle_stages
        }
      : null,
    escalation_reopen: escalationReopen
      ? {
          routing_mode: escalationRunResult?.routingMode ?? executionPolicy.routing_mode,
          resolution: "reopen",
          resolution_note: options.escalationReopenNote || DEFAULT_ESCALATION_REOPEN_NOTE,
          include_middle_stages: executionPolicy.include_middle_stages
        }
      : null,
    escalation_approve: escalationApproveResolution
      ? {
          routing_mode: escalationApproveRunResult?.routingMode ?? executionPolicy.routing_mode,
          resolution: "approve",
          resolution_note: options.escalationApproveNote || DEFAULT_ESCALATION_APPROVE_NOTE
        }
      : null,
    escalation_stop: escalationStopResolution
      ? {
          routing_mode: escalationStopRunResult?.routingMode ?? executionPolicy.routing_mode,
          resolution: "stop",
          resolution_note: options.escalationStopNote || DEFAULT_ESCALATION_STOP_NOTE
        }
      : null
  };
}

function buildVerificationRecommendation(branchOutcomes) {
  const sourceSignals = [];
  if (branchOutcomes?.signal_reopen?.reopen_status) {
    sourceSignals.push("signal-reopen-observed");
  }
  if (branchOutcomes?.escalation_reopen?.resolution_status) {
    sourceSignals.push("escalation-reopen-observed");
  }
  if (branchOutcomes?.escalation_approve?.resolution_status) {
    sourceSignals.push("escalation-approve-observed");
  }
  if (branchOutcomes?.escalation_stop?.resolution_status) {
    sourceSignals.push("escalation-stop-observed");
  }

  if (sourceSignals.length > 0) {
    return {
      action: "investigate-drift",
      urgency: "warning",
      rationale: "Verification included reopen or escalation branches, so branch-specific drift should be reviewed alongside the happy path.",
      source_signals: sourceSignals
    };
  }

  return {
    action: "continue-monitoring",
    urgency: "healthy",
    rationale: "Verification completed on the happy path without reopen or escalation branches.",
    source_signals: ["happy-path-only"]
  };
}

function buildVerificationContext(template, projectRoot) {
  return {
    project_root: projectRoot,
    organization: {
      organization_id: template.organization.organization_id,
      name: template.organization.name,
      language: template.organization.language ?? "ja"
    },
    workflow: {
      workflow_id: template.workflow.workflow_id,
      name: template.workflow.name,
      default_governance_scope: template.workflow.default_governance_scope,
      default_routing_mode: template.workflow.default_routing_mode ?? "deep-path",
      stages: template.workflow.stages
    },
    governance: {
      model: template.governance.model,
      decision_rule_default: template.governance.decision_rules.default,
      escalation_target: template.governance.escalation.target,
      escalation_max_retries: template.governance.escalation.max_retries
    },
    policies: {
      policy_profile_id: template.policies.policy_profile_id,
      default_priority_order: template.policies.default_priority_order
    },
    template_assets: {
      decision_record_markdown_path: template.templatePaths.decisionRecordMarkdownPath,
      decision_record_schema_path: template.templatePaths.decisionRecordSchemaPath
    }
  };
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }
  return String(value);
}

function formatList(items) {
  if (!items || items.length === 0) {
    return ["- none"];
  }
  return items.map((item) => `- ${item}`);
}

function formatKeyValueSection(title, pairs) {
  return [
    `## ${title}`,
    ...pairs.map(([label, value]) => `- ${label}: ${formatValue(value)}`),
    ""
  ];
}

function formatProviderObservabilitySection(providerObservability = {}) {
  const sections = ["## Provider Observability"];
  const entries = Object.entries(providerObservability).filter(([, value]) => value);
  if (entries.length === 0) {
    sections.push("- none", "");
    return sections;
  }

  for (const [key, value] of entries) {
    sections.push(`### ${key}`);
    sections.push(`- execution id: ${formatValue(value.execution_id)}`);
    sections.push(`- stage: ${formatValue(value.stage)}`);
    sections.push(`- observed steps: ${formatValue(value.observed_step_count)} / ${formatValue(value.step_count)}`);
    if (Array.isArray(value.steps) && value.steps.length > 0) {
      for (const step of value.steps) {
        sections.push(
          `- ${step.role}: status=${formatValue(step.response_status)}, request_id=${formatValue(step.request_id)}, processing_ms=${formatValue(step.processing_ms)}, remaining_requests=${formatValue(step.remaining_requests)}, remaining_tokens=${formatValue(step.remaining_tokens)}, retry_after=${formatValue(step.retry_after)}`
        );
      }
    } else {
      sections.push("- step details: none");
    }
    sections.push("");
  }

  return sections;
}

function formatVerificationReport(bundle) {
  const context = bundle.verification_context ?? {};
  const org = context.organization ?? {};
  const workflow = context.workflow ?? {};
  const governance = context.governance ?? {};
  const policies = context.policies ?? {};
  const templateAssets = context.template_assets ?? {};
  const executionPolicy = bundle.execution_policy ?? {};
  const branchOutcomes = bundle.branch_outcomes ?? {};
  const branchPolicies = bundle.branch_policies ?? {};
  const verificationRecommendation = bundle.verification_recommendation ?? {};
  const artifacts = bundle.artifacts ?? {};

  const lines = [
    "# Live Verification Report",
    "",
    `- generated at: ${formatValue(bundle.generated_at)}`,
    `- status: ${formatValue(bundle.status)}`,
    `- project root: ${formatValue(bundle.projectRoot)}`,
    `- artifact directory: ${formatValue(bundle.artifactDir)}`,
    `- request: ${formatValue(bundle.request)}`,
    ""
  ];

  lines.push(
    ...formatKeyValueSection("Verification Context", [
      ["organization", `${formatValue(org.organization_id)} (${formatValue(org.name)})`],
      ["language", org.language],
      ["workflow", `${formatValue(workflow.workflow_id)} (${formatValue(workflow.name)})`],
      ["workflow stages", workflow.stages],
      ["default governance scope", workflow.default_governance_scope],
      ["default routing mode", workflow.default_routing_mode],
      ["governance model", governance.model],
      ["decision rule", governance.decision_rule_default],
      ["escalation target", governance.escalation_target],
      ["escalation max retries", governance.escalation_max_retries],
      ["policy profile", policies.policy_profile_id],
      ["policy priority order", policies.default_priority_order],
      ["decision markdown template", templateAssets.decision_record_markdown_path],
      ["decision schema template", templateAssets.decision_record_schema_path]
    ])
  );

  lines.push(
    ...formatKeyValueSection("Execution Policy", [
      ["provider", executionPolicy.provider],
      ["model", executionPolicy.model],
      ["base URL", executionPolicy.base_url],
      ["API key source", executionPolicy.api_key_source],
      ["routing mode", executionPolicy.routing_mode],
      ["timeout ms", executionPolicy.timeout_ms],
      ["max retries", executionPolicy.max_retries],
      ["ping requested", executionPolicy.ping_requested],
      ["include middle stages", executionPolicy.include_middle_stages],
      ["include approval", executionPolicy.include_approval],
      ["include signal reopen", executionPolicy.include_signal_reopen],
      ["include escalation reopen", executionPolicy.include_escalation_reopen],
      ["include escalation terminal", executionPolicy.include_escalation_terminal],
      ["response count", executionPolicy.response_count],
      ["signal response count", executionPolicy.signal_response_count],
      ["escalation resume response count", executionPolicy.escalation_resume_response_count],
      ["used default responses", executionPolicy.used_default_responses]
    ])
  );

  lines.push(
    ...formatKeyValueSection("Branch Outcomes", [
      ["happy path planning", branchOutcomes.happy_path?.planning_status],
      ["happy path proposal", branchOutcomes.happy_path?.proposal_status],
      ["happy path review", branchOutcomes.happy_path?.review_status],
      ["happy path approval", branchOutcomes.happy_path?.approval_status],
      ["happy path guardian veto", branchOutcomes.happy_path?.guardian_veto_used],
      ["signal reopen status", branchOutcomes.signal_reopen?.reopen_status],
      ["signal reopen routing mode", branchOutcomes.signal_reopen?.routing_mode],
      ["signal resume answer", branchOutcomes.signal_reopen?.resume_answer_status],
      ["signal resume proposal", branchOutcomes.signal_reopen?.resume_proposal_status],
      ["signal resume review", branchOutcomes.signal_reopen?.resume_review_status],
      ["escalation reopen approval", branchOutcomes.escalation_reopen?.approval_status],
      ["escalation reopen status", branchOutcomes.escalation_reopen?.resolution_status],
      ["escalation reopen guardian veto", branchOutcomes.escalation_reopen?.guardian_veto_used],
      ["escalation resume answer", branchOutcomes.escalation_reopen?.resume_answer_status],
      ["escalation resume proposal", branchOutcomes.escalation_reopen?.resume_proposal_status],
      ["escalation resume review", branchOutcomes.escalation_reopen?.resume_review_status],
      ["escalation approve resolution", branchOutcomes.escalation_approve?.resolution_status],
      ["escalation stop resolution", branchOutcomes.escalation_stop?.resolution_status]
    ])
  );

  lines.push(
    ...formatKeyValueSection("Branch Policies", [
      ["happy path routing", branchPolicies.happy_path?.routing_mode],
      ["happy path include middle stages", branchPolicies.happy_path?.include_middle_stages],
      ["happy path include approval", branchPolicies.happy_path?.include_approval],
      ["signal reopen pre-routing", branchPolicies.signal_reopen?.pre_reopen_routing_mode],
      ["signal reopen post-routing", branchPolicies.signal_reopen?.post_reopen_routing_mode],
      ["signal reopen routing escalated", branchPolicies.signal_reopen?.routing_escalated],
      ["escalation reopen resolution", branchPolicies.escalation_reopen?.resolution],
      ["escalation reopen note", branchPolicies.escalation_reopen?.resolution_note],
      ["escalation approve resolution", branchPolicies.escalation_approve?.resolution],
      ["escalation approve note", branchPolicies.escalation_approve?.resolution_note],
      ["escalation stop resolution", branchPolicies.escalation_stop?.resolution],
      ["escalation stop note", branchPolicies.escalation_stop?.resolution_note]
    ])
  );

  lines.push(
    ...formatKeyValueSection("Verification Recommendation", [
      ["action", verificationRecommendation.action],
      ["urgency", verificationRecommendation.urgency],
      ["rationale", verificationRecommendation.rationale],
      ["source signals", verificationRecommendation.source_signals]
    ])
  );

  lines.push(...formatProviderObservabilitySection(bundle.provider_observability));

  lines.push("## Artifact Inventory");
  lines.push(...formatList(
    Object.entries(artifacts)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}: ${value}`)
  ));
  lines.push("");

  return lines.join("\n");
}

export async function liveVerifyCommand(options) {
  const projectRoot = path.resolve(options.project);
  const artifactDir = path.resolve(options.artifactDir);
  const template = await loadTemplate(projectRoot);
  const responses = resolveResponses(options.responses);
  const signalResponses = resolveSignalResponses(options.signalResponses);
  const escalationResumeResponses = resolveEscalationResumeResponses(options.escalationResumeResponses);
  const executionPolicy = buildExecutionPolicy(options, responses);
  const verificationContext = buildVerificationContext(template, projectRoot);
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
    verification_context: verificationContext,
    providerCheck
  };
    const bundlePath = await writeJsonArtifact(path.join(artifactDir, "verification-bundle.json"), failureBundle);
    const reportPath = await writeTextArtifact(
      path.join(artifactDir, "verification-report.md"),
      formatVerificationReport({
        ...failureBundle,
        artifacts: {
          provider_check: path.join(artifactDir, "provider-check.json"),
          verification_bundle: bundlePath
        },
        provider_observability: {}
      })
    );
    const archiveResult = await maybeArchiveVerification(options, artifactDir);
    return {
      ok: false,
      status: "preflight_failed",
      projectRoot,
      artifactDir,
      bundlePath,
      reportPath,
      archiveResult,
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

  const branchOutcomes = buildBranchOutcomes({
    planningExecution,
    proposalExecution,
    reviewExecution,
    approvalExecution,
    signalReopen,
    signalResumeAnswer,
    signalResumeProposalExecution,
    signalResumeReviewExecution,
    escalationApprovalExecution,
    escalationReopen,
    escalationResumeAnswer,
    escalationResumeProposalExecution,
    escalationResumeReviewExecution,
    escalationApproveApprovalExecution,
    escalationApproveResolution,
    escalationStopApprovalExecution,
    escalationStopResolution
  });
  const branchPolicies = buildBranchPolicies({
    executionPolicy,
    runResult,
    signalReopen,
    escalationRunResult,
    escalationReopen,
    escalationApproveRunResult,
    escalationApproveResolution,
    escalationStopRunResult,
    escalationStopResolution,
    options
  });
  const verificationRecommendation = buildVerificationRecommendation(branchOutcomes);

  const bundle = {
    artifact_type: "live-provider-verification",
    generated_at: nowIso(),
    status: "completed",
    projectRoot,
    artifactDir,
    request: options.request,
    responses,
    execution_policy: executionPolicy,
    verification_context: verificationContext,
    artifacts: {
      provider_check: path.join(artifactDir, "provider-check.json"),
      verification_report: path.join(artifactDir, "verification-report.md"),
      verification_bundle: path.join(artifactDir, "verification-bundle.json"),
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
    branch_outcomes: branchOutcomes,
    branch_policies: branchPolicies,
    verification_recommendation: verificationRecommendation,
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
  const reportPath = await writeTextArtifact(
    path.join(artifactDir, "verification-report.md"),
    formatVerificationReport(bundle)
  );

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

  const archiveResult = await maybeArchiveVerification(options, artifactDir);

  return {
    ok: true,
    status: "completed",
    projectRoot,
    artifactDir,
    bundlePath,
    reportPath,
    archiveResult,
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
