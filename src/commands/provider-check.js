import { preflightModelProvider } from "../sdk/model-adapter.js";
import { nowIso, writeJsonArtifact } from "../runtime/utils.js";

export async function providerCheckCommand(options) {
  const result = await preflightModelProvider({
    provider: options.provider,
    model: options.model,
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    apiKeyEnv: options.apiKeyEnv,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    temperature: options.temperature
  }, {
    ping: options.ping
  });

  const payload = {
    ok: result.readiness.canInvoke && (result.ping.attempted ? result.ping.ok !== false : true),
    ...result
  };

  if (options.artifactPath) {
    const artifact = {
      artifact_type: "provider-check",
      generated_at: nowIso(),
      payload
    };
    payload.artifactPath = await writeJsonArtifact(options.artifactPath, artifact);
  }

  return payload;
}
