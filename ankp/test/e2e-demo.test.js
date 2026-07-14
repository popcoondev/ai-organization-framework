import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runDemo } from '../src/pipeline.js';
import { searchAudit } from '../src/audit.js';

test('16.3 vertical slice: fetch -> claims -> generate -> verify -> approve -> publish -> audit', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ankp-demo-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const report = runDemo(dir);
  const { store } = report;

  // UAT-001: Snapshot と差分が保存される。
  const snapshot = store.get('snapshots', report.snapshotId);
  assert.ok(snapshot.hash);
  assert.equal(snapshot.untrusted, true);

  // UAT-002: Claim に出典箇所・日付・対象版がある。
  assert.equal(report.claimIds.length, 3);
  for (const claimId of report.claimIds) {
    const claim = store.get('claims', claimId);
    assert.equal(claim.verificationStatus, 'human_verified');
    assert.ok(claim.sourceLocation);
    assert.equal(claim.validFrom, '2026-07-10');
  }

  // UAT-003: 教材1件 + クイズ3問が公開され、全事実・正解が Claim へ追跡できる。
  const quiz = store.get('contents', report.quizId);
  assert.equal(quiz.questions.length, 3);
  assert.equal(quiz.state, 'published');
  assert.equal(store.get('contents', report.lessonId).state, 'published');
  assert.ok(report.lessonTrace.chains.length >= 3);
  for (const chain of report.quizTrace.chains) {
    assert.equal(chain.verificationStatus, 'human_verified');
    assert.equal(chain.trustTier, 1);
    assert.ok(chain.sourceLocation);
    assert.ok(chain.snapshotHash);
  }

  // UAT-012: 監査ログから生成・検証・承認・公開の主体と理由を追跡できる。
  const trail = searchAudit(store, { correlationId: report.correlationId });
  const operations = trail.map((r) => r.operation);
  for (const expected of [
    'model.activate',
    'source.add',
    'snapshot.ingest',
    'claim.extract',
    'claim.source-match',
    'claim.approve',
    'content.generate',
    'content.verify',
    'content.approve',
    'content.publish',
  ]) {
    assert.ok(operations.includes(expected), `audit trail missing ${expected}`);
  }
  const approvals = trail.filter((r) => r.operation === 'claim.approve');
  assert.ok(approvals.every((r) => r.actor === 'reviewer' && r.reason));
  const publishes = trail.filter((r) => r.operation === 'content.publish');
  assert.ok(publishes.every((r) => r.actor === 'publisher-service'));

  // 公開版の再現 (FR-ADM-006): publication から公開時点の内容を復元できる。
  const publication = store.list('publications', (p) => p.contentId === report.quizId)[0];
  assert.equal(publication.contentSnapshot.questions.length, 3);
});
