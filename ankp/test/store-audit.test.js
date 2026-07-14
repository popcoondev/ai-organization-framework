import test from 'node:test';
import assert from 'node:assert/strict';
import { tempStore } from './helpers.js';
import { recordAudit, searchAudit } from '../src/audit.js';

test('store keeps old versions when a document is updated (10.4)', (t) => {
  const store = tempStore(t);
  const v1 = store.put('contents', { id: 'c-1', title: 'first' });
  assert.equal(v1._version, 1);
  const v2 = store.put('contents', { ...v1, title: 'second' });
  assert.equal(v2._version, 2);
  assert.equal(store.get('contents', 'c-1').title, 'second');
  assert.equal(store.getVersion('contents', 'c-1', 1).title, 'first');
  assert.equal(store.getVersion('contents', 'c-1', 2).title, 'second');
});

test('audit log records who/what/when/why and is searchable (FR-ADM-012)', (t) => {
  const store = tempStore(t);
  recordAudit(store, {
    actor: 'reviewer',
    operation: 'content.approve',
    target: 'c-9',
    reason: 'looks good',
    correlationId: 'cor-1',
  });
  recordAudit(store, { actor: 'admin', operation: 'model.activate', target: 'gen-primary' });

  const byActor = searchAudit(store, { actor: 'reviewer' });
  assert.equal(byActor.length, 1);
  assert.equal(byActor[0].target, 'c-9');
  assert.equal(byActor[0].reason, 'looks good');
  assert.ok(byActor[0].at);

  assert.equal(searchAudit(store, { correlationId: 'cor-1' }).length, 1);
  assert.equal(searchAudit(store).length, 2);
});

test('audit entries require actor, operation, target', (t) => {
  const store = tempStore(t);
  assert.throws(() => recordAudit(store, { operation: 'x', target: 'y' }), /requires actor/);
});
