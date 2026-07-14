import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';
import { registerModel, evaluateModel, activateModel, createGateway } from '../src/model-gateway.js';
import { addSource } from '../src/source-registry.js';
import { ingestSnapshot } from '../src/snapshot.js';
import { extractClaims, sourceMatchClaims, approveClaim } from '../src/claims.js';

export const FIXTURE_CONTENT = fs.readFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'fixtures', 'release-note.md'),
  'utf8',
);

export function tempStore(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ankp-test-'));
  t?.after?.(() => fs.rmSync(dir, { recursive: true, force: true }));
  return createStore(dir);
}

export function seedModel(
  store,
  { modelId = 'gen-primary', mode, qualityThreshold = 0.9, priority = 10, tasks } = {},
) {
  registerModel(
    store,
    {
      modelId,
      provider: 'deterministic',
      providerConfig: mode ? { mode } : {},
      tasks: tasks ?? ['claim-extraction', 'lesson-generation', 'quiz-generation'],
      qualityThreshold,
      priority,
    },
    { actor: 'admin' },
  );
  evaluateModel(store, modelId, { actor: 'admin' });
  activateModel(store, modelId, { actor: 'admin' });
  return createGateway(store);
}

export function seedSourceAndSnapshot(store, { content = FIXTURE_CONTENT, trustTier = 1 } = {}) {
  const source = addSource(
    store,
    {
      name: 'ExampleAI Platform Release Notes',
      url: 'https://releases.exampleai.invalid/v2.4.0',
      trustTier,
    },
    { actor: 'source-manager' },
  );
  const snapshot = ingestSnapshot(
    store,
    { sourceId: source.id, content, contentDate: '2026-07-10' },
    { actor: 'collector-id' },
  );
  return { source, snapshot };
}

export function seedApprovedClaims(store, gateway, snapshot, { count = 3, excludeSecurity = true } = {}) {
  const claims = extractClaims(store, gateway, { snapshotId: snapshot.id }, { actor: 'generator-id' });
  sourceMatchClaims(store, { claimIds: claims.map((c) => c.id) }, { actor: 'verifier-id' });
  const eligible = store.list(
    'claims',
    (c) => c.verificationStatus === 'source_matched' && (!excludeSecurity || c.claimType !== 'security'),
  );
  const picked = eligible.slice(0, count);
  for (const claim of picked) {
    approveClaim(store, claim.id, { actor: 'reviewer', reason: 'test approval' });
  }
  return picked.map((c) => store.get('claims', c.id));
}
