import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

import { invokeModel, preflightModelProvider } from "../src/sdk/model-adapter.js";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

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
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "provider-check",
      "--provider",
      "openai-compatible",
      "--model",
      "gpt-4.1-mini"
    ],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.provider, "openai-chat-completions");
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.readiness.missing, ["baseUrl", "apiKey"]);
});
