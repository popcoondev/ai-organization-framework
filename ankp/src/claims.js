// ANKP Phase 0 — Claim 管理。
// 要件 10.3: claimId / statement / sourceSnapshotId / sourceLocation / claimType /
//           applicability / validFrom / validUntil / verificationStatus / confidence。
import { newId, normalizeText } from './store.js';
import { assertPermission } from './identities.js';
import { recordAudit } from './audit.js';

export const CLAIM_TYPES = [
  'product_spec',
  'standard',
  'research',
  'report',
  'interpretation',
  'security',
  'legal',
];

export const VERIFICATION_STATUSES = [
  'unverified',
  'source_matched',
  'ai_verified',
  'human_verified',
  'withdrawn',
];

// confidence は出典信頼度と検証結果に基づく（モデルの自信度だけを使わない）。
const TIER_BASE_CONFIDENCE = { 1: 0.7, 2: 0.5, 3: 0.3 };
const VERIFICATION_BONUS = { source_matched: 0.15, human_verified: 0.3 };

export function computeConfidence(trustTier, verificationStatus) {
  const base = TIER_BASE_CONFIDENCE[trustTier] ?? 0.3;
  const bonus = VERIFICATION_BONUS[verificationStatus] ?? 0;
  return Math.min(1, Math.round((base + bonus) * 100) / 100);
}

export function validateClaim(claim) {
  const errors = [];
  if (!claim.statement || !claim.statement.trim()) errors.push('statement is required');
  if (claim.statement && /\n/.test(claim.statement)) {
    errors.push('statement must be a single assertion (no line breaks)');
  }
  if (!claim.sourceSnapshotId) errors.push('sourceSnapshotId is required');
  if (!claim.sourceLocation) errors.push('sourceLocation is required');
  if (!CLAIM_TYPES.includes(claim.claimType)) errors.push(`invalid claimType: ${claim.claimType}`);
  if (claim.applicability == null || typeof claim.applicability !== 'object') {
    errors.push('applicability is required');
  }
  if (!VERIFICATION_STATUSES.includes(claim.verificationStatus)) {
    errors.push(`invalid verificationStatus: ${claim.verificationStatus}`);
  }
  if (typeof claim.confidence !== 'number' || claim.confidence < 0 || claim.confidence > 1) {
    errors.push('confidence must be a number in [0,1]');
  }
  return errors;
}

// Claim 抽出（Generator ID）。出典スナップショットのみを入力とする。
export function extractClaims(store, gateway, { snapshotId }, { actor, correlationId } = {}) {
  assertPermission(actor, 'claim.extract');
  const snapshot = store.get('snapshots', snapshotId);
  if (!snapshot) throw new Error(`unknown snapshot: ${snapshotId}`);
  const source = store.get('sources', snapshot.sourceId);

  const result = gateway.run(
    'claim-extraction',
    { content: snapshot.content, contentDate: snapshot.contentDate, untrusted: true },
    { actor, correlationId },
  );
  if (!result.ok) {
    // AIQ-007: 根拠不足・モデル不能時は推測で埋めず停止する。
    throw new Error(`claim extraction refused: ${result.reason}`);
  }

  const claims = [];
  for (const candidate of result.output.claims) {
    const id = newId('clm');
    const claim = {
      id,
      claimId: id,
      statement: candidate.statement,
      sourceSnapshotId: snapshotId,
      sourceLocation: candidate.sourceLocation,
      claimType: candidate.claimType ?? 'product_spec',
      applicability: candidate.applicability ?? {},
      validFrom: snapshot.contentDate ?? null,
      validUntil: null,
      verificationStatus: 'unverified',
      confidence: computeConfidence(source?.trustTier, 'unverified'),
      trustTier: source?.trustTier ?? null,
      extractionRunId: result.runId,
    };
    const errors = validateClaim(claim);
    if (errors.length) {
      throw new Error(`invalid claim candidate rejected: ${errors.join('; ')}`);
    }
    claims.push(store.put('claims', claim));
  }
  recordAudit(store, {
    actor,
    operation: 'claim.extract',
    target: snapshotId,
    after: { count: claims.length, claimIds: claims.map((c) => c.id), runId: result.runId },
    correlationId,
  });
  return claims;
}

// 出典照合（Verifier ID）。statement が Snapshot 本文で裏付けられるか検査する。
export function sourceMatchClaims(store, { claimIds }, { actor, correlationId } = {}) {
  assertPermission(actor, 'claim.source-match');
  const results = [];
  for (const claimId of claimIds) {
    const claim = store.get('claims', claimId);
    if (!claim) throw new Error(`unknown claim: ${claimId}`);
    const snapshot = store.get('snapshots', claim.sourceSnapshotId);
    const matched = snapshot && normalizeText(snapshot.content).includes(normalizeText(claim.statement));
    const next = matched
      ? store.put('claims', {
          ...claim,
          verificationStatus: 'source_matched',
          confidence: computeConfidence(claim.trustTier, 'source_matched'),
        })
      : store.put('claims', { ...claim, sourceMatchFailed: true });
    recordAudit(store, {
      actor,
      operation: 'claim.source-match',
      target: claimId,
      after: { matched, verificationStatus: next.verificationStatus },
      correlationId,
    });
    results.push({ claimId, matched });
  }
  return results;
}

// 人間承認（Reviewer）。source_matched 以上のみ承認できる。
export function approveClaim(store, claimId, { actor, reason, correlationId } = {}) {
  assertPermission(actor, 'claim.approve');
  const claim = store.get('claims', claimId);
  if (!claim) throw new Error(`unknown claim: ${claimId}`);
  if (!['source_matched', 'ai_verified'].includes(claim.verificationStatus)) {
    throw new Error(
      `claim ${claimId} must be source_matched before human approval (current: ${claim.verificationStatus})`,
    );
  }
  const updated = store.put('claims', {
    ...claim,
    verificationStatus: 'human_verified',
    confidence: computeConfidence(claim.trustTier, 'human_verified'),
    approvedBy: actor,
  });
  recordAudit(store, {
    actor,
    operation: 'claim.approve',
    target: claimId,
    before: { verificationStatus: claim.verificationStatus },
    after: { verificationStatus: 'human_verified' },
    reason,
    correlationId,
  });
  return updated;
}

export function withdrawClaim(store, claimId, { actor, reason, correlationId } = {}) {
  assertPermission(actor, 'killswitch');
  const claim = store.get('claims', claimId);
  if (!claim) throw new Error(`unknown claim: ${claimId}`);
  const updated = store.put('claims', { ...claim, verificationStatus: 'withdrawn' });
  recordAudit(store, {
    actor,
    operation: 'claim.withdraw',
    target: claimId,
    before: { verificationStatus: claim.verificationStatus },
    after: { verificationStatus: 'withdrawn' },
    reason,
    correlationId,
  });
  return updated;
}
