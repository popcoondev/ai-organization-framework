import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { invokeModel, preflightModelProvider } from "../src/sdk/model-adapter.js";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function shouldRetryCliResult(result) {
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
  return /SyntaxError:/.test(combined) || result.error?.code === "ETIMEDOUT";
}

function spawnCliWithRetry(args) {
  let lastResult = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = spawnSync(process.execPath, args, {
      encoding: "utf8",
      timeout: 15000
    });
    lastResult = result;
    if (result.status === 0 || !shouldRetryCliResult(result)) {
      return result;
    }
  }
  return lastResult;
}

test("preflightModelProvider reports mock provider as ready without ping", async () => {
  const result = await preflightModelProvider({
    provider: "mock",
    model: "aof-mock-model"
  });

  assert.equal(result.provider, "mock");
  assert.equal(result.readiness.canInvoke, true);
  assert.deepEqual(result.readiness.missing, []);
  assert.equal(result.ping.attempted, false);
});

test("preflightModelProvider reports missing config for openai-compatible provider", async () => {
  const result = await preflightModelProvider({
    provider: "openai-compatible",
    model: "gpt-4.1-mini"
  });

  assert.equal(result.provider, "openai-chat-completions");
  assert.equal(result.readiness.canInvoke, false);
  assert.deepEqual(result.readiness.missing, ["baseUrl", "apiKey"]);
  assert.equal(result.ping.attempted, false);
});

test("preflightModelProvider can ping an openai-compatible provider", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: [
        { id: "gpt-4.1-mini" },
        { id: "gpt-4.1" }
      ]
    })
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await preflightModelProvider({
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678"
  }, {
    ping: true
  });

  assert.equal(result.readiness.canInvoke, true);
  assert.equal(result.ping.attempted, true);
  assert.equal(result.ping.ok, true);
  assert.equal(result.ping.model_count, 2);
  assert.deepEqual(result.ping.sample_models, ["gpt-4.1-mini", "gpt-4.1"]);
});

test("preflightModelProvider reports ping failure for openai-compatible provider", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    text: async () => "bad key"
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await preflightModelProvider({
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678"
  }, {
    ping: true
  });

  assert.equal(result.readiness.canInvoke, true);
  assert.equal(result.ping.attempted, true);
  assert.equal(result.ping.ok, false);
  assert.equal(result.ping.status_code, 401);
  assert.equal(result.ping.status_text, "Unauthorized");
  assert.equal(result.ping.error, "bad key");
});

test("preflightModelProvider reports transport failure for openai-compatible provider ping", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("connect ECONNREFUSED");
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await preflightModelProvider({
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678"
  }, {
    ping: true
  });

  assert.equal(result.readiness.canInvoke, true);
  assert.equal(result.ping.attempted, true);
  assert.equal(result.ping.ok, false);
  assert.match(result.ping.error, /ECONNREFUSED/);
});

test("preflightModelProvider reports invalid JSON for openai-compatible provider ping", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON");
    }
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await preflightModelProvider({
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678"
  }, {
    ping: true
  });

  assert.equal(result.readiness.canInvoke, true);
  assert.equal(result.ping.attempted, true);
  assert.equal(result.ping.ok, false);
  assert.match(result.ping.error, /Invalid JSON response: Unexpected token </);
});

test("invokeModel rejects transport failures from openai-compatible providers", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("request timed out");
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    invokeModel({
      metadata: { stage: "planning", call_purpose: "generate-plan" },
      actor: { active_role: "Builder" },
      governance: { decision_rule: "majority" },
      task: {
        request: "Improve onboarding",
        current_goal: "Draft a plan",
        expected_output_kind: "proposal"
      },
      context: {
        need: "reduce onboarding drop-off",
        intent: "improve first-run completion",
        active_context: "auth constraints still apply",
        clarifications_or_assumptions: "none"
      }
    }, {
      provider: "openai-compatible",
      model: "gpt-4.1-mini",
      baseUrl: "https://example.test/v1",
      apiKey: "sk-test-12345678"
    }),
    /Model provider transport failed: request timed out/
  );
});

test("invokeModel retries retryable transport failures for openai-compatible providers", async (t) => {
  const originalFetch = global.fetch;
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("connect ECONNRESET");
    }
    return {
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: "DECISION: proceed\nBuilder recovered response." } }
        ]
      })
    };
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await invokeModel({
    metadata: { stage: "planning", call_purpose: "generate-plan" },
    actor: { active_role: "Builder" },
    governance: { decision_rule: "majority" },
    task: {
      request: "Improve onboarding",
      current_goal: "Draft a plan",
      expected_output_kind: "proposal"
    },
    context: {
      need: "reduce onboarding drop-off",
      intent: "improve first-run completion",
      active_context: "auth constraints still apply",
      clarifications_or_assumptions: "none"
    }
  }, {
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678",
    maxRetries: 1
  });

  assert.equal(attempts, 2);
  assert.equal(result.invocation_policy.max_retries, 1);
  assert.equal(result.invocation_policy.attempt_count, 2);
});

test("invokeModel captures allowlisted provider response headers", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: {
      get(name) {
        const values = {
          "x-request-id": "req_123",
          "openai-processing-ms": "321",
          "x-ratelimit-remaining-requests": "4999",
          "x-ratelimit-remaining-tokens": "199999",
          "x-ignored-header": "ignored"
        };
        return values[name] ?? null;
      }
    },
    json: async () => ({
      choices: [
        { message: { content: "DECISION: proceed\nBuilder header-aware response." } }
      ]
    })
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await invokeModel({
    metadata: { stage: "planning", call_purpose: "generate-plan" },
    actor: { active_role: "Builder" },
    governance: { decision_rule: "majority" },
    task: {
      request: "Improve onboarding",
      current_goal: "Draft a plan",
      expected_output_kind: "proposal"
    },
    context: {
      need: "reduce onboarding drop-off",
      intent: "improve first-run completion",
      active_context: "auth constraints still apply",
      clarifications_or_assumptions: "none"
    }
  }, {
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678"
  });

  assert.equal(result.provider_metadata.response_status, 200);
  assert.deepEqual(result.provider_metadata.response_headers, {
    x_request_id: "req_123",
    openai_processing_ms: "321",
    x_ratelimit_remaining_requests: "4999",
    x_ratelimit_remaining_tokens: "199999"
  });
});

test("invokeModel infers approval recommendation from Japanese natural-language output", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            content: "承認推奨：\nこの改善提案は制約内で実行可能です。"
          }
        }
      ]
    })
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await invokeModel({
    metadata: { stage: "approval", call_purpose: "generate-approval-recommendation" },
    actor: { active_role: "Guardian" },
    governance: { decision_rule: "majority-with-guardian-veto" },
    task: {
      request: "Improve onboarding",
      current_goal: "Produce approval guidance",
      expected_output_kind: "approval-recommendation"
    },
    context: {
      need: "reduce onboarding drop-off",
      intent: "improve first-run completion",
      active_context: "auth constraints still apply",
      clarifications_or_assumptions: "none"
    }
  }, {
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678"
  });

  assert.equal(result.decision_signal.recommendation, "approve");
  assert.equal(result.decision_signal.veto, false);
});

test("invokeModel infers approval recommendation from longer Japanese approval guidance", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            content: "承認判断のためのガイダンス：\n以上の点を踏まえ、今回の改善提案は承認に値すると判断します。"
          }
        }
      ]
    })
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await invokeModel({
    metadata: { stage: "approval", call_purpose: "generate-approval-recommendation" },
    actor: { active_role: "Guardian" },
    governance: { decision_rule: "majority-with-guardian-veto" },
    task: {
      request: "Improve onboarding",
      current_goal: "Produce approval guidance",
      expected_output_kind: "approval-recommendation"
    },
    context: {
      need: "reduce onboarding drop-off",
      intent: "improve first-run completion",
      active_context: "auth constraints still apply",
      clarifications_or_assumptions: "none"
    }
  }, {
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678"
  });

  assert.equal(result.decision_signal.recommendation, "approve");
  assert.equal(result.decision_signal.veto, false);
});

test("invokeModel surfaces provider timeout errors for openai-compatible providers", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    const error = new Error("This operation was aborted");
    error.name = "AbortError";
    throw error;
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    invokeModel({
      metadata: { stage: "planning", call_purpose: "generate-plan" },
      actor: { active_role: "Builder" },
      governance: { decision_rule: "majority" },
      task: {
        request: "Improve onboarding",
        current_goal: "Draft a plan",
        expected_output_kind: "proposal"
      },
      context: {
        need: "reduce onboarding drop-off",
        intent: "improve first-run completion",
        active_context: "auth constraints still apply",
        clarifications_or_assumptions: "none"
      }
    }, {
      provider: "openai-compatible",
      model: "gpt-4.1-mini",
      baseUrl: "https://example.test/v1",
      apiKey: "sk-test-12345678",
      timeoutMs: 5
    }),
    /Model provider timed out after 5ms/
  );
});

test("invokeModel rejects invalid JSON from openai-compatible providers", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError("Unexpected end of JSON input");
    }
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    invokeModel({
      metadata: { stage: "planning", call_purpose: "generate-plan" },
      actor: { active_role: "Builder" },
      governance: { decision_rule: "majority" },
      task: {
        request: "Improve onboarding",
        current_goal: "Draft a plan",
        expected_output_kind: "proposal"
      },
      context: {
        need: "reduce onboarding drop-off",
        intent: "improve first-run completion",
        active_context: "auth constraints still apply",
        clarifications_or_assumptions: "none"
      }
    }, {
      provider: "openai-compatible",
      model: "gpt-4.1-mini",
      baseUrl: "https://example.test/v1",
      apiKey: "sk-test-12345678"
    }),
    /Model provider returned invalid JSON: Unexpected end of JSON input/
  );
});

test("invokeModel rejects malformed openai-compatible responses without usable text", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        { message: { content: "   " } }
      ]
    })
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    invokeModel({
      metadata: { stage: "planning", call_purpose: "generate-plan" },
      actor: { active_role: "Builder" },
      governance: { decision_rule: "majority" },
      task: {
        request: "Improve onboarding",
        current_goal: "Draft a plan",
        expected_output_kind: "proposal"
      },
      context: {
        need: "reduce onboarding drop-off",
        intent: "improve first-run completion",
        active_context: "auth constraints still apply",
        clarifications_or_assumptions: "none"
      }
    }, {
      provider: "openai-compatible",
      model: "gpt-4.1-mini",
      baseUrl: "https://example.test/v1",
      apiKey: "sk-test-12345678"
    }),
    /Model provider returned no usable text output\./
  );
});

test("CLI provider-check reports normalized provider readiness", () => {
  const cliPath = path.join(repoRoot, "src", "cli.js");
  const result = spawnCliWithRetry([
    cliPath,
    "provider-check",
    "--provider",
    "openai-compatible",
    "--model",
    "gpt-4.1-mini"
  ]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.provider, "openai-chat-completions");
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.readiness.missing, ["baseUrl", "apiKey"]);
});

test("CLI provider-check can write a verification artifact", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-provider-check-"));
  const artifactPath = path.join(tempRoot, "provider-check.json");
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const cliPath = path.join(repoRoot, "src", "cli.js");
  const result = spawnCliWithRetry([
    cliPath,
    "provider-check",
    "--provider",
    "mock",
    "--write-artifact",
    artifactPath
  ]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.artifactPath, artifactPath);

  const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  assert.equal(artifact.artifact_type, "provider-check");
  assert.equal(artifact.payload.provider, "mock");
  assert.equal(artifact.payload.ok, true);
});
