import test from 'node:test';
import assert from 'node:assert/strict';
import { tempStore, seedModel, seedSourceAndSnapshot, seedApprovedClaims } from './helpers.js';
import { generateLesson, generateQuiz } from '../src/generation.js';
import { verifyContent } from '../src/verification.js';
import { approveContent, rejectContent, listReviewQueue } from '../src/review.js';
import { publishContent, withdrawContent, engageKillSwitch } from '../src/publish.js';

function makeVerifiedLesson(store, gateway, snapshot, claims, title = '基礎') {
  const lesson = generateLesson(
    store,
    gateway,
    { title, claimIds: claims.map((c) => c.id) },
    { actor: 'generator-id' },
  );
  verifyContent(store, lesson.id, { actor: 'verifier-id' });
  return store.get('contents', lesson.id);
}

test('unreviewed content cannot be published (UAT-005)', (t) => {
  const store = tempStore(t);
  const gateway = seedModel(store);
  const { snapshot } = seedSourceAndSnapshot(store);
  const claims = seedApprovedClaims(store, gateway, snapshot);
  const lesson = makeVerifiedLesson(store, gateway, snapshot, claims);
  assert.equal(lesson.state, 'review_required');
  assert.throws(
    () => publishContent(store, lesson.id, { actor: 'publisher-service' }),
    /not publishable/,
  );
});

test('review approval requires reason and passing evaluation, then publish succeeds', (t) => {
  const store = tempStore(t);
  const gateway = seedModel(store);
  const { snapshot } = seedSourceAndSnapshot(store);
  const claims = seedApprovedClaims(store, gateway, snapshot);
  const lesson = makeVerifiedLesson(store, gateway, snapshot, claims);

  assert.ok(listReviewQueue(store).some((c) => c.id === lesson.id));
  assert.throws(() => approveContent(store, lesson.id, { actor: 'reviewer' }), /requires a reason/);

  const { approved } = approveContent(store, lesson.id, { actor: 'reviewer', reason: 'ok' });
  assert.equal(approved, true);
  const publication = publishContent(store, lesson.id, { actor: 'publisher-service' });
  assert.equal(publication.status, 'published');
  // 公開時点の版が不変スナップショットとして保存される (FR-ADM-006)。
  assert.equal(publication.contentSnapshot.id, lesson.id);
  assert.equal(store.get('contents', lesson.id).state, 'published');
});

test('generator identity cannot approve or publish (9.7)', (t) => {
  const store = tempStore(t);
  const gateway = seedModel(store);
  const { snapshot } = seedSourceAndSnapshot(store);
  const claims = seedApprovedClaims(store, gateway, snapshot);
  const lesson = makeVerifiedLesson(store, gateway, snapshot, claims);
  assert.throws(
    () => approveContent(store, lesson.id, { actor: 'generator-id', reason: 'self approve' }),
    /permission denied/,
  );
  assert.throws(
    () => publishContent(store, lesson.id, { actor: 'generator-id' }),
    /permission denied/,
  );
});

test('Level C content needs two distinct approvers (9.4)', (t) => {
  const store = tempStore(t);
  const gateway = seedModel(store);
  const { snapshot } = seedSourceAndSnapshot(store);
  const claims = seedApprovedClaims(store, gateway, snapshot, { count: 4, excludeSecurity: false });
  const security = claims.filter((c) => c.claimType === 'security');
  const lesson = makeVerifiedLesson(store, gateway, snapshot, security, 'セキュリティ');
  assert.equal(lesson.gateLevel, 'C');

  const first = approveContent(store, lesson.id, { actor: 'reviewer', reason: '1人目確認' });
  assert.equal(first.approved, false);
  assert.equal(store.get('contents', lesson.id).state, 'review_required');
  // 同一人物の二重承認は不可。
  assert.throws(
    () => approveContent(store, lesson.id, { actor: 'reviewer', reason: 'again' }),
    /distinct approvers/,
  );
  const second = approveContent(store, lesson.id, { actor: 'knowledge-owner', reason: '2人目確認' });
  assert.equal(second.approved, true);
  assert.equal(store.get('contents', lesson.id).state, 'approved');
});

test('rejection stores the reason and sends content back (FR-ADM-004)', (t) => {
  const store = tempStore(t);
  const gateway = seedModel(store);
  const { snapshot } = seedSourceAndSnapshot(store);
  const claims = seedApprovedClaims(store, gateway, snapshot);
  const lesson = makeVerifiedLesson(store, gateway, snapshot, claims);
  const decision = rejectContent(store, lesson.id, { actor: 'reviewer', reason: '表現が曖昧' });
  assert.equal(decision.decision, 'rejected');
  assert.equal(store.get('contents', lesson.id).state, 'needs_review');
});

test('kill switch cascades to related published content via shared claims (FR-ADM-007 / UAT-010)', (t) => {
  const store = tempStore(t);
  const gateway = seedModel(store);
  const { snapshot } = seedSourceAndSnapshot(store);
  const claims = seedApprovedClaims(store, gateway, snapshot);
  const claimIds = claims.map((c) => c.id);

  const lesson = makeVerifiedLesson(store, gateway, snapshot, claims);
  const quiz = generateQuiz(store, gateway, { claimIds }, { actor: 'generator-id' });
  verifyContent(store, quiz.id, { actor: 'verifier-id' });
  for (const id of [lesson.id, quiz.id]) {
    approveContent(store, id, { actor: 'reviewer', reason: 'ok' });
    publishContent(store, id, { actor: 'publisher-service' });
  }

  // 出典訂正を想定し、Claim 起点で Kill Switch を発動する。
  const result = engageKillSwitch(
    store,
    { targetType: 'claim', targetId: claimIds[0], reason: '出典が訂正されたため' },
    { actor: 'admin' },
  );
  assert.ok(result.affectedContents.includes(lesson.id));
  assert.ok(result.affectedContents.includes(quiz.id));
  assert.equal(store.get('claims', claimIds[0]).verificationStatus, 'withdrawn');
  assert.equal(store.get('contents', lesson.id).state, 'withdrawn');
  assert.equal(store.get('contents', quiz.id).state, 'withdrawn');
  for (const pub of store.list('publications')) {
    assert.equal(pub.status, 'withdrawn');
  }
});

test('global kill switch suspends publication; withdraw requires reason', (t) => {
  const store = tempStore(t);
  const gateway = seedModel(store);
  const { snapshot } = seedSourceAndSnapshot(store);
  const claims = seedApprovedClaims(store, gateway, snapshot);
  const lesson = makeVerifiedLesson(store, gateway, snapshot, claims);
  approveContent(store, lesson.id, { actor: 'reviewer', reason: 'ok' });

  engageKillSwitch(store, { targetType: 'global', reason: '重大インシデント' }, { actor: 'admin' });
  assert.throws(
    () => publishContent(store, lesson.id, { actor: 'publisher-service' }),
    /kill switch engaged/,
  );
  assert.throws(
    () => withdrawContent(store, lesson.id, { actor: 'publisher-service' }),
    /requires a reason/,
  );
});
