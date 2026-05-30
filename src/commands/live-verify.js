import path from "node:path";
import { answerCommand } from "./answer.js";
import { councilExecCommand } from "./council-exec.js";
import { providerCheckCommand } from "./provider-check.js";
import { runCommand } from "./run.js";
import { ensureDir, nowIso, writeJsonArtifact } from "../runtime/utils.js";

const DEFAULT_RESPONSES = [
  "新規登録導線全体",
  "登録完了率を 5% 改善する",
  "認証基盤は変更しない"
];

function resolveResponses(responses = []) {
  return responses.length > 0 ? responses : DEFAULT_RESPONSES;
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
    include_approval: Boolean(options.includeApproval),
    routing_mode: options.routingMode || "workflow-default",
    timeout_ms: Number.isFinite(options.timeoutMs) ? options.timeoutMs : 30000,
    max_retries: Number.isInteger(options.maxRetries) ? options.maxRetries : 0,
    response_count: responses.length,
    used_default_responses: responses === DEFAULT_RESPONSES
  };
}

export async function liveVerifyCommand(options) {
  const projectRoot = path.resolve(options.project);
  const artifactDir = path.resolve(options.artifactDir);
  const responses = resolveResponses(options.responses);
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
      approval_execution: options.includeApproval ? path.join(artifactDir, "approval-exec.json") : null
    },
    providerCheck,
    runResult,
    answerResult,
    planningExecution,
    approvalExecution
  };
  const bundlePath = await writeJsonArtifact(path.join(artifactDir, "verification-bundle.json"), bundle);

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
    approvalExecution
  };
}
