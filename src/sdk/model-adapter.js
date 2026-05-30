function nowIso() {
  return new Date().toISOString();
}

function firstSentence(text) {
  if (!text) {
    return "";
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  const boundary = normalized.search(/[.!?。！？]/);
  return boundary === -1 ? normalized : normalized.slice(0, boundary + 1);
}

function parseStructuredSignal(outputText) {
  const normalized = outputText.replace(/\r/g, "");
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const signal = {
    recommendation: "unknown",
    veto: false
  };

  for (const line of lines) {
    if (line.startsWith("DECISION:")) {
      signal.recommendation = line.slice("DECISION:".length).trim().toLowerCase();
    }
    if (line.startsWith("VETO:")) {
      signal.veto = line.slice("VETO:".length).trim().toLowerCase() === "yes";
    }
  }

  return signal;
}

function buildSystemPrompt(packet) {
  return [
    `You are acting as ${packet.actor.active_role} in an AI Organization Framework runtime.`,
    `Current stage: ${packet.metadata.stage}.`,
    `Call purpose: ${packet.metadata.call_purpose}.`,
    `Decision rule: ${packet.governance.decision_rule}.`,
    "Respond concisely and focus on the current seat responsibility."
  ].join("\n");
}

function buildUserPrompt(packet) {
  return [
    `Request: ${packet.task.request}`,
    `Need: ${packet.context.need}`,
    `Intent: ${packet.context.intent}`,
    `Active Context: ${packet.context.active_context}`,
    `Current Goal: ${packet.task.current_goal}`,
    `Expected Output Kind: ${packet.task.expected_output_kind}`,
    `Clarifications or Assumptions: ${packet.context.clarifications_or_assumptions}`
  ].join("\n");
}

function buildPromptBundle(packet) {
  return {
    system: buildSystemPrompt(packet),
    user: buildUserPrompt(packet)
  };
}

const RESPONSE_HEADER_ALLOWLIST = [
  "x-request-id",
  "request-id",
  "openai-processing-ms",
  "x-ratelimit-limit-requests",
  "x-ratelimit-limit-tokens",
  "x-ratelimit-remaining-requests",
  "x-ratelimit-remaining-tokens",
  "retry-after"
];

function toSnakeCaseHeaderName(name) {
  return name.replace(/-/g, "_");
}

function extractResponseHeaders(headersLike) {
  if (!headersLike || typeof headersLike.get !== "function") {
    return {};
  }

  const extracted = {};
  for (const headerName of RESPONSE_HEADER_ALLOWLIST) {
    const value = headersLike.get(headerName);
    if (typeof value === "string" && value.length > 0) {
      extracted[toSnakeCaseHeaderName(headerName)] = value;
    }
  }
  return extracted;
}

function normalizeProvider(provider) {
  if (!provider || provider === "mock") {
    return "mock";
  }
  if (provider === "openai-compatible" || provider === "openai-chat-completions") {
    return "openai-chat-completions";
  }
  throw new Error(`Unsupported model provider: ${provider}`);
}

function pickNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
}

function resolveApiKeyDetails(apiKey, apiKeyEnv) {
  if (apiKey) {
    return {
      value: apiKey,
      source: "explicit"
    };
  }
  if (apiKeyEnv) {
    return {
      value: process.env[apiKeyEnv] ?? "",
      source: `env:${apiKeyEnv}`
    };
  }
  return {
    value: process.env.AOF_MODEL_API_KEY ?? "",
    source: "env:AOF_MODEL_API_KEY"
  };
}

function maskSecret(value) {
  if (!value) {
    return "";
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

export function resolveModelConfig(config = {}) {
  const apiKey = resolveApiKeyDetails(config.apiKey, config.apiKeyEnv);
  return {
    provider: normalizeProvider(pickNonEmpty(config.provider, process.env.AOF_MODEL_PROVIDER, "mock")),
    model: pickNonEmpty(config.model, process.env.AOF_MODEL_NAME, "aof-mock-model"),
    baseUrl: pickNonEmpty(config.baseUrl, process.env.AOF_MODEL_BASE_URL),
    apiKey: apiKey.value,
    apiKeySource: apiKey.value ? apiKey.source : "none",
    mockSeatDecisions: config.mockSeatDecisions ?? {},
    mockSeatVetos: config.mockSeatVetos ?? {},
    timeoutMs: Number.isFinite(config.timeoutMs)
      ? config.timeoutMs
      : process.env.AOF_MODEL_TIMEOUT_MS
        ? Number(process.env.AOF_MODEL_TIMEOUT_MS)
        : 30000,
    maxRetries: Number.isInteger(config.maxRetries)
      ? config.maxRetries
      : process.env.AOF_MODEL_MAX_RETRIES
        ? Number(process.env.AOF_MODEL_MAX_RETRIES)
        : 0,
    temperature: typeof config.temperature === "number"
      ? config.temperature
      : process.env.AOF_MODEL_TEMPERATURE
        ? Number(process.env.AOF_MODEL_TEMPERATURE)
        : 0.2
  };
}

function isAbortError(error) {
  return error && typeof error === "object" && error.name === "AbortError";
}

function isRetryableProviderError(message) {
  return message.startsWith("Model provider transport failed:")
    || message.startsWith("Model provider timed out after");
}

function mockOutputForPacket(packet) {
  const role = packet.actor.active_role;
  const stage = packet.metadata.stage;
  const need = packet.context.need;
  const intent = packet.context.intent;
  const config = packet.__mock_config ?? {};
  const decision = stage === "approval"
    ? config.mockSeatDecisions?.[role] ?? "approve"
    : "proceed";
  const veto = stage === "approval" && role === "Guardian"
    ? config.mockSeatVetos?.[role] ?? "no"
    : "no";
  return [
    `DECISION: ${decision}`,
    `VETO: ${veto}`,
    `${role} ${stage} response: focus on ${need} and align to ${intent}.`
  ].join("\n");
}

async function invokeMockProvider(packet, config) {
  const prompts = buildPromptBundle(packet);
  const outputText = mockOutputForPacket({
    ...packet,
    __mock_config: config
  });
  return {
    provider: config.provider,
    model: config.model,
    generated_at: nowIso(),
    output_text: outputText,
    output_summary: firstSentence(outputText),
    decision_signal: parseStructuredSignal(outputText),
    prompt_bundle: prompts
  };
}

async function invokeOpenAiCompatibleProvider(packet, config) {
  if (!config.baseUrl) {
    throw new Error("OpenAI-compatible provider requires a base URL.");
  }
  if (!config.apiKey) {
    throw new Error("OpenAI-compatible provider requires an API key.");
  }

  const prompts = buildPromptBundle(packet);
  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  let lastError = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          temperature: config.temperature,
          messages: [
            { role: "system", content: prompts.system },
            { role: "user", content: prompts.user }
          ]
        }),
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      if (isAbortError(error)) {
        lastError = new Error(`Model provider timed out after ${config.timeoutMs}ms`);
      } else {
        const detail = error instanceof Error ? error.message : String(error);
        lastError = new Error(`Model provider transport failed: ${detail}`);
      }
      if (attempt < config.maxRetries && isRetryableProviderError(lastError.message)) {
        continue;
      }
      throw lastError;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Model provider request failed: ${response.status} ${response.statusText} - ${body}`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Model provider returned invalid JSON: ${detail}`);
    }
    const outputText = payload?.choices?.[0]?.message?.content;
    if (typeof outputText !== "string" || outputText.trim().length === 0) {
      throw new Error("Model provider returned no usable text output.");
    }

    return {
      provider: config.provider,
      model: config.model,
      generated_at: nowIso(),
      output_text: outputText.trim(),
      output_summary: firstSentence(outputText),
      decision_signal: parseStructuredSignal(outputText),
      prompt_bundle: prompts,
      invocation_policy: {
        timeout_ms: config.timeoutMs,
        max_retries: config.maxRetries,
        attempt_count: attempt + 1
      },
      provider_metadata: {
        response_status: response.status,
        response_headers: extractResponseHeaders(response.headers)
      }
    };
  }

  throw lastError ?? new Error("Model provider invocation failed.");
}

async function pingOpenAiCompatibleProvider(config) {
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`
      }
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        attempted: true,
        ok: false,
        status_code: response.status,
        status_text: response.statusText,
        error: body
      };
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return {
        attempted: true,
        ok: false,
        status_code: response.status,
        error: `Invalid JSON response: ${detail}`
      };
    }
    const models = Array.isArray(payload?.data) ? payload.data : [];
    return {
      attempted: true,
      ok: true,
      status_code: response.status,
      model_count: models.length,
      sample_models: models
        .map((model) => model?.id)
        .filter((id) => typeof id === "string")
        .slice(0, 5)
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function preflightModelProvider(config = {}, options = {}) {
  const resolved = resolveModelConfig(config);
  const pingRequested = Boolean(options.ping);
  const missing = [];

  if (resolved.provider === "openai-chat-completions") {
    if (!resolved.baseUrl) {
      missing.push("baseUrl");
    }
    if (!resolved.apiKey) {
      missing.push("apiKey");
    }
  }

  const endpoint = resolved.provider === "openai-chat-completions" && resolved.baseUrl
    ? `${resolved.baseUrl.replace(/\/$/, "")}/chat/completions`
    : "";

  const summary = {
    provider: resolved.provider,
    model: resolved.model,
    baseUrl: resolved.baseUrl,
    endpoint,
    temperature: resolved.temperature,
    auth: {
      configured: Boolean(resolved.apiKey),
      source: resolved.apiKeySource,
      masked: maskSecret(resolved.apiKey)
    },
    readiness: {
      canInvoke: missing.length === 0,
      missing
    },
    ping: {
      requested: pingRequested,
      attempted: false
    }
  };

  if (resolved.provider === "mock") {
    summary.readiness.canInvoke = true;
    summary.ping = {
      requested: pingRequested,
      attempted: false,
      skipped_reason: "mock provider does not require network verification"
    };
    return summary;
  }

  if (!pingRequested || !summary.readiness.canInvoke) {
    summary.ping = {
      requested: pingRequested,
      attempted: false,
      skipped_reason: summary.readiness.canInvoke
        ? "ping not requested"
        : "provider is not fully configured"
    };
    return summary;
  }

  summary.ping = await pingOpenAiCompatibleProvider(resolved);
  return summary;
}

export async function invokeModel(packet, config = {}) {
  const resolved = resolveModelConfig(config);
  if (resolved.provider === "mock") {
    return invokeMockProvider(packet, resolved);
  }
  return invokeOpenAiCompatibleProvider(packet, resolved);
}
