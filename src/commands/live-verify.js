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

export async function liveVerifyCommand(options) {
  const projectRoot = path.resolve(options.project);
  const artifactDir = path.resolve(options.artifactDir);
  await ensureDir(artifactDir);

  const providerCheck = await providerCheckCommand({
    provider: options.provider,
    model: options.model,
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    apiKeyEnv: options.apiKeyEnv,
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
    responses: resolveResponses(options.responses)
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
    responses: resolveResponses(options.responses),
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
