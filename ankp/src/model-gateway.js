// ANKP Phase 0 — Model Registry / Model Gateway。
// 要件 AIQ-MDL-001: モデル名・版・用途・所有者を Registry で管理し、コードへ直書きしない。
// 要件 AIQ-MDL-003 / UAT-011: モデル変更前に固定評価セットで回帰評価し、閾値未達は本番化不可。
// 要件 AIQ-MDL-005 / AIQ-007: フォールバック不能時は安全な拒否を返し、根拠なし出力をしない。
import { newId, nowIso } from './store.js';
import { assertPermission } from './identities.js';
import { recordAudit } from './audit.js';
import { createDeterministicProvider } from './providers/deterministic.js';

const PROVIDER_FACTORIES = {
  deterministic: createDeterministicProvider,
};

export const TASKS = ['claim-extraction', 'lesson-generation', 'quiz-generation'];

// 固定評価セット（Golden Dataset の最小形）。モデル差し替え時の回帰ゲートに使う。
const EVAL_CLAIMS = [
  { claimId: 'eval-clm-1', statement: 'Sample platform v1.0 adds feature X.', },
  { claimId: 'eval-clm-2', statement: 'Sample platform v1.0 deprecates endpoint Y.' },
  { claimId: 'eval-clm-3', statement: 'Sample platform v1.0 introduces routing budgets.' },
];

const EVAL_SETS = {
  'claim-extraction': {
    input: {
      content:
        '# Sample v1.0\n\n## Changes\n\n- Sample platform v1.0 adds feature X.\n- Sample platform v1.0 deprecates endpoint Y.\n',
      contentDate: '2026-01-01',
    },
    checks: [
      { id: 'returns-claims', test: (out) => Array.isArray(out.claims) && out.claims.length >= 2 },
      { id: 'claims-have-location', test: (out) => out.claims.every((c) => Boolean(c.sourceLocation)) },
      { id: 'claims-have-statement', test: (out) => out.claims.every((c) => Boolean(c.statement?.trim())) },
    ],
  },
  'lesson-generation': {
    input: { title: 'Eval lesson', claims: EVAL_CLAIMS },
    checks: [
      {
        id: 'confirmed-blocks-have-claims',
        test: (out) =>
          out.blocks
            .filter((b) => b.label === 'Confirmed')
            .every((b) => Array.isArray(b.claimIds) && b.claimIds.length > 0),
      },
      { id: 'has-practical-check', test: (out) => out.blocks.some((b) => b.kind === 'practical-check') },
      { id: 'all-blocks-labeled', test: (out) => out.blocks.every((b) => Boolean(b.label)) },
    ],
  },
  'quiz-generation': {
    input: { claims: EVAL_CLAIMS, sourceName: 'Eval source', contentDate: '2026-01-01' },
    checks: [
      { id: 'three-questions', test: (out) => out.questions.length === 3 },
      {
        id: 'options-distinct',
        test: (out) => out.questions.every((q) => new Set(q.options).size === q.options.length),
      },
      {
        id: 'correct-index-valid',
        test: (out) => out.questions.every((q) => q.options[q.correctIndex] != null),
      },
      {
        id: 'questions-have-claims',
        test: (out) => out.questions.every((q) => q.claimIds.length > 0),
      },
    ],
  },
};

export function registerModel(store, spec, { actor, correlationId } = {}) {
  assertPermission(actor, 'model.manage');
  const { modelId, provider, providerConfig, tasks, owner, qualityThreshold, priority } = spec;
  if (!modelId) throw new Error('modelId is required');
  if (!PROVIDER_FACTORIES[provider]) throw new Error(`unknown provider: ${provider}`);
  for (const task of tasks ?? []) {
    if (!TASKS.includes(task)) throw new Error(`unknown task: ${task}`);
  }
  const model = store.put('models', {
    id: modelId,
    provider,
    providerConfig: providerConfig ?? {},
    tasks: tasks ?? [],
    owner: owner ?? actor,
    priority: priority ?? 100,
    status: 'candidate',
    qualityThreshold: qualityThreshold ?? 0.9,
    lastEvaluation: null,
  });
  recordAudit(store, {
    actor,
    operation: 'model.register',
    target: modelId,
    after: { provider, tasks: model.tasks, qualityThreshold: model.qualityThreshold },
    correlationId,
  });
  return model;
}

function resolveProvider(model) {
  return PROVIDER_FACTORIES[model.provider](model.providerConfig);
}

export function evaluateModel(store, modelId, { actor, correlationId } = {}) {
  assertPermission(actor, 'model.manage');
  const model = store.get('models', modelId);
  if (!model) throw new Error(`unknown model: ${modelId}`);
  const provider = resolveProvider(model);
  const checks = [];
  for (const task of model.tasks) {
    const evalSet = EVAL_SETS[task];
    if (!evalSet) continue;
    let output = null;
    let error = null;
    try {
      output = provider.run(task, evalSet.input);
    } catch (err) {
      error = err.message;
    }
    for (const check of evalSet.checks) {
      let pass = false;
      try {
        pass = !error && Boolean(check.test(output));
      } catch {
        pass = false;
      }
      checks.push({ task, checkId: check.id, pass, error });
    }
  }
  const score = checks.length ? checks.filter((c) => c.pass).length / checks.length : 0;
  const run = store.put('evaluation-runs', {
    id: newId('eval'),
    kind: 'model-regression',
    modelId,
    checks,
    score,
    evaluatedBy: actor,
    at: nowIso(),
  });
  store.put('models', { ...model, lastEvaluation: { runId: run.id, score, at: run.at } });
  recordAudit(store, {
    actor,
    operation: 'model.evaluate',
    target: modelId,
    after: { score, runId: run.id },
    correlationId,
  });
  return run;
}

export function activateModel(store, modelId, { actor, correlationId } = {}) {
  assertPermission(actor, 'model.manage');
  const model = store.get('models', modelId);
  if (!model) throw new Error(`unknown model: ${modelId}`);
  if (!model.lastEvaluation) {
    throw new Error(`regression gate: model ${modelId} has no evaluation run (AIQ-MDL-003)`);
  }
  if (model.lastEvaluation.score < model.qualityThreshold) {
    throw new Error(
      `regression gate: model ${modelId} score ${model.lastEvaluation.score} < threshold ${model.qualityThreshold} (UAT-011)`,
    );
  }
  const updated = store.put('models', { ...model, status: 'active' });
  recordAudit(store, {
    actor,
    operation: 'model.activate',
    target: modelId,
    before: { status: model.status },
    after: { status: 'active', score: model.lastEvaluation.score },
    correlationId,
  });
  return updated;
}

export function retireModel(store, modelId, { actor, reason, correlationId } = {}) {
  assertPermission(actor, 'model.manage');
  const model = store.get('models', modelId);
  if (!model) throw new Error(`unknown model: ${modelId}`);
  const updated = store.put('models', { ...model, status: 'retired' });
  recordAudit(store, {
    actor,
    operation: 'model.retire',
    target: modelId,
    reason,
    correlationId,
  });
  return updated;
}

export function createGateway(store) {
  function run(task, input, { actor, correlationId } = {}) {
    const models = store
      .list('models', (m) => m.status === 'active' && m.tasks.includes(task))
      .sort((a, b) => a.priority - b.priority);
    const attempts = [];
    for (const model of models) {
      const provider = resolveProvider(model);
      try {
        const output = provider.run(task, input);
        const runDoc = store.put('generation-runs', {
          id: newId('run'),
          task,
          modelId: model.id,
          promptVersion: provider.promptVersion ?? null,
          inputSummary: summarizeInput(input),
          output,
          status: 'ok',
          attempts,
          actor,
          correlationId,
          at: nowIso(),
        });
        recordAudit(store, {
          actor: actor ?? 'unknown',
          operation: `gateway.${task}`,
          target: runDoc.id,
          after: { modelId: model.id, status: 'ok' },
          correlationId,
        });
        return { ok: true, runId: runDoc.id, modelId: model.id, output };
      } catch (err) {
        attempts.push({ modelId: model.id, error: err.message });
      }
    }
    // フォールバック尽きた場合：可用性のために根拠なし出力をせず、安全に拒否する。
    const reason = models.length
      ? `all models failed for task ${task}`
      : `no active model for task ${task}`;
    const runDoc = store.put('generation-runs', {
      id: newId('run'),
      task,
      modelId: null,
      inputSummary: summarizeInput(input),
      output: null,
      status: 'refused',
      reason,
      attempts,
      actor,
      correlationId,
      at: nowIso(),
    });
    recordAudit(store, {
      actor: actor ?? 'unknown',
      operation: `gateway.${task}`,
      target: runDoc.id,
      after: { status: 'refused', reason },
      correlationId,
    });
    return { ok: false, refused: true, reason, attempts, runId: runDoc.id };
  }
  return { run };
}

function summarizeInput(input) {
  const summary = {};
  if (input.content) summary.contentLength = String(input.content).length;
  if (input.claims) summary.claimIds = input.claims.map((c) => c.claimId ?? c.id);
  if (input.title) summary.title = input.title;
  if (input.untrusted) summary.untrusted = true;
  return summary;
}
