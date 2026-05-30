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

function resolveApiKey(apiKey, apiKeyEnv) {
  if (apiKey) {
    return apiKey;
  }
  if (apiKeyEnv) {
    return process.env[apiKeyEnv] ?? "";
  }
  return process.env.AOF_MODEL_API_KEY ?? "";
}

function resolveModelConfig(config = {}) {
  return {
    provider: normalizeProvider(pickNonEmpty(config.provider, process.env.AOF_MODEL_PROVIDER, "mock")),
    model: pickNonEmpty(config.model, process.env.AOF_MODEL_NAME, "aof-mock-model"),
    baseUrl: pickNonEmpty(config.baseUrl, process.env.AOF_MODEL_BASE_URL),
    apiKey: resolveApiKey(config.apiKey, config.apiKeyEnv),
    temperature: typeof config.temperature === "number"
      ? config.temperature
      : process.env.AOF_MODEL_TEMPERATURE
        ? Number(process.env.AOF_MODEL_TEMPERATURE)
        : 0.2
  };
}

function mockOutputForPacket(packet) {
  const role = packet.actor.active_role;
  const stage = packet.metadata.stage;
  const need = packet.context.need;
  const intent = packet.context.intent;
  return `${role} ${stage} response: focus on ${need} and align to ${intent}.`;
}

async function invokeMockProvider(packet, config) {
  const prompts = buildPromptBundle(packet);
  const outputText = mockOutputForPacket(packet);
  return {
    provider: config.provider,
    model: config.model,
    generated_at: nowIso(),
    output_text: outputText,
    output_summary: firstSentence(outputText),
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
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Model provider request failed: ${response.status} ${response.statusText} - ${body}`);
  }

  const payload = await response.json();
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
    prompt_bundle: prompts
  };
}

export async function invokeModel(packet, config = {}) {
  const resolved = resolveModelConfig(config);
  if (resolved.provider === "mock") {
    return invokeMockProvider(packet, resolved);
  }
  return invokeOpenAiCompatibleProvider(packet, resolved);
}
