import { preflightModelProvider } from "../sdk/model-adapter.js";

export async function providerCheckCommand(options) {
  const result = await preflightModelProvider({
    provider: options.provider,
    model: options.model,
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    apiKeyEnv: options.apiKeyEnv,
    temperature: options.temperature
  }, {
    ping: options.ping
  });

  return {
    ok: result.readiness.canInvoke && (result.ping.attempted ? result.ping.ok !== false : true),
    ...result
  };
}
