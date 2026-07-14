import test from 'node:test';
import assert from 'node:assert/strict';
import { tempStore } from './helpers.js';
import {
  registerModel,
  evaluateModel,
  activateModel,
  retireModel,
  createGateway,
} from '../src/model-gateway.js';

test('regression gate blocks activation below quality threshold (UAT-011 / AIQ-MDL-003)', (t) => {
  const store = tempStore(t);
  registerModel(
    store,
    {
      modelId: 'degraded-model',
      provider: 'deterministic',
      providerConfig: { mode: 'degraded' },
      tasks: ['claim-extraction', 'lesson-generation', 'quiz-generation'],
      qualityThreshold: 0.9,
    },
    { actor: 'admin' },
  );
  // 評価前の有効化は不可。
  assert.throws(() => activateModel(store, 'degraded-model', { actor: 'admin' }), /no evaluation run/);

  const run = evaluateModel(store, 'degraded-model', { actor: 'admin' });
  assert.ok(run.score < 0.9, `degraded model should fail regression eval, got ${run.score}`);
  assert.throws(() => activateModel(store, 'degraded-model', { actor: 'admin' }), /regression gate/);
});

test('healthy model passes evaluation and activates', (t) => {
  const store = tempStore(t);
  registerModel(
    store,
    {
      modelId: 'gen-primary',
      provider: 'deterministic',
      tasks: ['claim-extraction', 'lesson-generation', 'quiz-generation'],
      qualityThreshold: 0.9,
    },
    { actor: 'admin' },
  );
  const run = evaluateModel(store, 'gen-primary', { actor: 'admin' });
  assert.equal(run.score, 1);
  const model = activateModel(store, 'gen-primary', { actor: 'admin' });
  assert.equal(model.status, 'active');
});

test('gateway refuses safely when no active model serves the task (AIQ-MDL-005 / AIQ-007)', (t) => {
  const store = tempStore(t);
  const gateway = createGateway(store);
  const result = gateway.run('lesson-generation', { title: 'x', claims: [] }, { actor: 'generator-id' });
  assert.equal(result.ok, false);
  assert.equal(result.refused, true);
  assert.match(result.reason, /no active model/);
  // 拒否も GenerationRun として記録される。
  const runs = store.list('generation-runs');
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, 'refused');
});

test('gateway falls back to next active model when primary is retired mid-flight', (t) => {
  const store = tempStore(t);
  for (const [modelId, priority] of [
    ['gen-primary', 10],
    ['gen-secondary', 20],
  ]) {
    registerModel(
      store,
      {
        modelId,
        provider: 'deterministic',
        tasks: ['quiz-generation'],
        qualityThreshold: 0.9,
        priority,
      },
      { actor: 'admin' },
    );
    evaluateModel(store, modelId, { actor: 'admin' });
    activateModel(store, modelId, { actor: 'admin' });
  }
  retireModel(store, 'gen-primary', { actor: 'admin', reason: 'test' });
  const gateway = createGateway(store);
  const result = gateway.run(
    'quiz-generation',
    { claims: [{ claimId: 'c1', statement: 'v1.0 adds X.' }], sourceName: 's', contentDate: '2026-01-01' },
    { actor: 'generator-id' },
  );
  assert.equal(result.ok, true);
  assert.equal(result.modelId, 'gen-secondary');
});

test('model management requires the admin permission (NFR-SEC-002)', (t) => {
  const store = tempStore(t);
  assert.throws(
    () =>
      registerModel(
        store,
        { modelId: 'm', provider: 'deterministic', tasks: [] },
        { actor: 'generator-id' },
      ),
    /permission denied/,
  );
});
