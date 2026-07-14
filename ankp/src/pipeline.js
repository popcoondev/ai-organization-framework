// ANKP Phase 0 — 縦切り E2E パイプライン（要件 16.3「最初の一歩」）。
// リリースノート取得 → Claim 抽出 → 根拠付きミニ教材 + クイズ3問生成 →
// 独立検証 → 人間承認 → 公開 → 監査・トレーサビリティ確認、を一周する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, newId } from './store.js';
import { registerModel, evaluateModel, activateModel, createGateway } from './model-gateway.js';
import { addSource } from './source-registry.js';
import { ingestSnapshot } from './snapshot.js';
import { extractClaims, sourceMatchClaims, approveClaim } from './claims.js';
import { generateLesson, generateQuiz } from './generation.js';
import { verifyContent } from './verification.js';
import { approveContent } from './review.js';
import { publishContent } from './publish.js';
import { traceContent } from './trace.js';
import { searchAudit } from './audit.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'release-note.md');

export function runDemo(dataDir, { fixturePath } = {}) {
  const store = createStore(dataDir);
  const correlationId = newId('cor');
  const steps = [];
  const log = (step, detail) => steps.push({ step, detail });

  // 1. モデルガバナンス: 登録 → 固定評価 → 閾値合格 → 有効化（UAT-011）。
  registerModel(
    store,
    {
      modelId: 'gen-primary',
      provider: 'deterministic',
      tasks: ['claim-extraction', 'lesson-generation', 'quiz-generation'],
      qualityThreshold: 0.9,
      priority: 10,
    },
    { actor: 'admin', correlationId },
  );
  const evalRun = evaluateModel(store, 'gen-primary', { actor: 'admin', correlationId });
  activateModel(store, 'gen-primary', { actor: 'admin', correlationId });
  log('model-activated', { modelId: 'gen-primary', score: evalRun.score });

  // 2. Source Registry（Source Manager）。
  const source = addSource(
    store,
    {
      name: 'ExampleAI Platform Release Notes',
      url: 'https://releases.exampleai.invalid/v2.4.0',
      kind: 'official-release-notes',
      trustTier: 1,
      terms: { quote: 'allowed', fullCopy: 'internal-only', robots: 'allowed' },
    },
    { actor: 'source-manager', correlationId },
  );
  log('source-registered', { sourceId: source.id, trustTier: source.trustTier });

  // 3. Snapshot 取得（Collector ID）。UAT-001。
  const content = fs.readFileSync(fixturePath ?? FIXTURE, 'utf8');
  const snapshot = ingestSnapshot(
    store,
    { sourceId: source.id, content, contentDate: '2026-07-10' },
    { actor: 'collector-id', correlationId },
  );
  log('snapshot-ingested', { snapshotId: snapshot.id, hash: snapshot.hash.slice(0, 12) });

  // 4. Claim 抽出（Generator ID）。UAT-002。
  const gateway = createGateway(store);
  const claims = extractClaims(store, gateway, { snapshotId: snapshot.id }, { actor: 'generator-id', correlationId });
  log('claims-extracted', { count: claims.length });

  // 5. 出典照合（Verifier ID）。
  sourceMatchClaims(store, { claimIds: claims.map((c) => c.id) }, { actor: 'verifier-id', correlationId });

  // 6. 人間承認（Reviewer）: 低リスクの Claim 3件を承認。
  const picked = store
    .list('claims', (c) => c.verificationStatus === 'source_matched' && c.claimType !== 'security')
    .slice(0, 3);
  for (const claim of picked) {
    approveClaim(store, claim.id, { actor: 'reviewer', reason: '出典スナップショットとの一致を確認', correlationId });
  }
  log('claims-approved', { claimIds: picked.map((c) => c.id) });

  // 7. 生成（Generator ID）: ミニ教材 1件 + クイズ 3問。UAT-003。
  const claimIds = picked.map((c) => c.id);
  const lesson = generateLesson(
    store,
    gateway,
    { title: 'モデルルーティングと構造化出力の基礎', claimIds },
    { actor: 'generator-id', correlationId },
  );
  const quiz = generateQuiz(store, gateway, { claimIds }, { actor: 'generator-id', correlationId });
  log('content-generated', { lessonId: lesson.id, quizId: quiz.id });

  // 8. 独立検証（Verifier ID）→ 公開ゲート分類。UAT-004/005。
  const lessonVerdict = verifyContent(store, lesson.id, { actor: 'verifier-id', correlationId });
  const quizVerdict = verifyContent(store, quiz.id, { actor: 'verifier-id', correlationId });
  if (!lessonVerdict.passed || !quizVerdict.passed) {
    throw new Error('demo verification failed unexpectedly');
  }
  log('content-verified', {
    lesson: { gate: lessonVerdict.gate.level },
    quiz: { gate: quizVerdict.gate.level },
  });

  // 9. 人間レビュー承認（Reviewer）。
  approveContent(store, lesson.id, { actor: 'reviewer', reason: '根拠・ラベル・表示を確認', correlationId });
  approveContent(store, quiz.id, { actor: 'reviewer', reason: '正解の一意性と根拠追跡を確認', correlationId });

  // 10. 公開（Publisher Service）。
  const lessonPub = publishContent(store, lesson.id, { actor: 'publisher-service', correlationId });
  const quizPub = publishContent(store, quiz.id, { actor: 'publisher-service', correlationId });
  log('published', { lessonPublication: lessonPub.id, quizPublication: quizPub.id });

  // 11. トレーサビリティと監査の確認。UAT-012。
  const lessonTrace = traceContent(store, lesson.id);
  const quizTrace = traceContent(store, quiz.id);
  const auditTrail = searchAudit(store, { correlationId });
  log('traceability-verified', {
    lessonChains: lessonTrace.chains.length,
    quizChains: quizTrace.chains.length,
    auditRecords: auditTrail.length,
  });

  return {
    correlationId,
    steps,
    sourceId: source.id,
    snapshotId: snapshot.id,
    claimIds,
    lessonId: lesson.id,
    quizId: quiz.id,
    publications: [lessonPub.id, quizPub.id],
    lessonTrace,
    quizTrace,
    auditCount: auditTrail.length,
    store,
  };
}
