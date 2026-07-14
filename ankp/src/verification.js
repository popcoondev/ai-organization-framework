// ANKP Phase 0 — 独立検証（Verifier ID）。
// 要件 AIQ-004: 生成と検証を論理的に分離する。本モジュールは生成モデルから独立した
//              ルールエンジンとして動作し、生成側の自己採点を公開根拠にしない。
// 要件 AIQ-001/005/006、7.4、UAT-004 の検査を実装する。
import { newId, nowIso, normalizeText } from './store.js';
import { assertPermission } from './identities.js';
import { recordAudit } from './audit.js';
import { transitionContent } from './workflow.js';
import { classifyGate } from './gates.js';

export const CONTENT_LABELS = ['Confirmed', 'Inferred', 'Suggested', 'Unknown'];

function loadClaims(store, claimIds) {
  const map = new Map();
  for (const id of claimIds ?? []) {
    const claim = store.get('claims', id);
    if (claim) map.set(id, claim);
  }
  return map;
}

function checkClaimRefs(addCheck, refClaimIds, claimMap, where) {
  addCheck(`AIQ-001:claim-coverage:${where}`, (refClaimIds ?? []).length > 0, `${where} に Claim 参照がない`);
  for (const claimId of refClaimIds ?? []) {
    const claim = claimMap.get(claimId);
    addCheck(`AIQ-001:claim-exists:${where}:${claimId}`, Boolean(claim), `${claimId} が存在しない`);
    if (claim) {
      addCheck(
        `AIQ-001:claim-verified:${where}:${claimId}`,
        claim.verificationStatus === 'human_verified',
        `${claimId} が human_verified でない (${claim.verificationStatus})`,
      );
      const notExpired = !claim.validUntil || claim.validUntil >= nowIso();
      addCheck(`AIQ-005:claim-not-expired:${where}:${claimId}`, notExpired, `${claimId} が有効期限切れ`);
    }
  }
}

function verifyLesson(content, claimMap, addCheck) {
  for (const [index, block] of content.blocks.entries()) {
    const where = `block[${index}]`;
    addCheck(
      `AIQ-006:label:${where}`,
      CONTENT_LABELS.includes(block.label),
      `${where} のラベルが不正: ${block.label}`,
    );
    if (block.label === 'Confirmed') {
      // Confirmed（確認済み事実）は Claim 裏付け必須。
      checkClaimRefs(addCheck, block.claimIds, claimMap, where);
      const supported = (block.claimIds ?? []).some((id) => {
        const claim = claimMap.get(id);
        return claim && normalizeText(block.text).includes(normalizeText(claim.statement));
      });
      addCheck(
        `AIQ-001:fact-supported:${where}`,
        (block.claimIds ?? []).length === 0 ? false : supported,
        `${where} の本文が参照 Claim の statement に対応しない`,
      );
    }
  }
}

function verifyQuiz(content, claimMap, addCheck) {
  addCheck('7.4:question-count', content.questions.length >= 1, '設問がない');
  for (const [index, q] of content.questions.entries()) {
    const where = `question[${index}]`;
    addCheck(
      `AIQ-006:label:${where}`,
      CONTENT_LABELS.includes(q.label),
      `${where} のラベルが不正: ${q.label}`,
    );
    const normalized = q.options.map((o) => normalizeText(o));
    addCheck(
      `7.4:options-distinct:${where}`,
      new Set(normalized).size === normalized.length,
      `${where} の選択肢に重複がある（正解の一意性違反）`,
    );
    const correct = q.options[q.correctIndex];
    addCheck(`7.4:correct-index:${where}`, correct != null, `${where} の correctIndex が不正`);
    checkClaimRefs(addCheck, q.claimIds, claimMap, where);
    const traceable = (q.claimIds ?? []).some((id) => {
      const claim = claimMap.get(id);
      return claim && normalizeText(correct ?? '') === normalizeText(claim.statement);
    });
    addCheck(
      `AIQ-001:correct-traceable:${where}`,
      traceable,
      `${where} の正解が Claim statement へ追跡できない`,
    );
    addCheck(
      `FR-LRN-004:wrong-explanations:${where}`,
      Array.isArray(q.wrongExplanations) &&
        q.options.every((_, i) => i === q.correctIndex || Boolean(q.wrongExplanations[i])),
      `${where} に誤答理由がない`,
    );
    addCheck(`FR-LRN-004:explanation:${where}`, Boolean(q.explanation), `${where} に解説がない`);
  }
}

export function verifyContent(store, contentId, { actor, correlationId } = {}) {
  assertPermission(actor, 'content.verify');
  const content = store.get('contents', contentId);
  if (!content) throw new Error(`unknown content: ${contentId}`);
  if (content.state !== 'generated') {
    throw new Error(`content ${contentId} is not in generated state (${content.state})`);
  }

  const checks = [];
  const addCheck = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail: pass ? null : detail });

  const claimMap = loadClaims(store, collectClaimIds(content));

  // AIQ-005: 出典スナップショットと日付整合。
  const snapshot = content.sourceSnapshotId ? store.get('snapshots', content.sourceSnapshotId) : null;
  addCheck('AIQ-002:snapshot-exists', Boolean(snapshot), '出典スナップショットが存在しない');
  if (snapshot) {
    addCheck(
      'AIQ-005:content-date-not-future',
      !snapshot.contentDate || snapshot.contentDate <= nowIso(),
      '出典の基準日が未来日',
    );
  }

  if (content.type === 'lesson') verifyLesson(content, claimMap, addCheck);
  else if (content.type === 'quiz') verifyQuiz(content, claimMap, addCheck);
  else addCheck('type-supported', false, `unsupported content type: ${content.type}`);

  const passed = checks.every((c) => c.pass);
  const evalRun = store.put('evaluation-runs', {
    id: newId('eval'),
    kind: 'content-verification',
    contentId,
    contentVersion: content._version,
    checks,
    verdict: passed ? 'pass' : 'fail',
    verifiedBy: actor,
    correlationId,
    at: nowIso(),
  });
  recordAudit(store, {
    actor,
    operation: 'content.verify',
    target: contentId,
    after: { verdict: evalRun.verdict, evalRunId: evalRun.id, failed: checks.filter((c) => !c.pass).map((c) => c.id) },
    correlationId,
  });

  if (!passed) {
    transitionContent(store, contentId, 'needs_review', {
      actor,
      reason: `verification failed: ${checks.filter((c) => !c.pass).map((c) => c.id).join(', ')}`,
      correlationId,
    });
    return { passed: false, evalRun, gate: null };
  }

  transitionContent(store, contentId, 'evaluated', { actor, reason: 'verification passed', correlationId });
  const gate = classifyGate(store, store.get('contents', contentId), [...claimMap.values()]);
  const withGate = store.put('contents', {
    ...store.get('contents', contentId),
    gateLevel: gate.level,
    gateReasons: gate.reasons,
    requiredApprovals: gate.requiredApprovals,
    lastEvalRunId: evalRun.id,
  });
  transitionContent(store, contentId, gate.state, {
    actor,
    reason: `gate level ${gate.level}: ${gate.reasons.join('; ')}`,
    correlationId,
  });
  return { passed: true, evalRun, gate, content: store.get('contents', contentId) };
}

export function collectClaimIds(content) {
  const ids = new Set(content.claimIds ?? []);
  if (content.type === 'lesson') {
    for (const block of content.blocks ?? []) for (const id of block.claimIds ?? []) ids.add(id);
  }
  if (content.type === 'quiz') {
    for (const q of content.questions ?? []) for (const id of q.claimIds ?? []) ids.add(id);
  }
  return [...ids];
}
