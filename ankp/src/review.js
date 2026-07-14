// ANKP Phase 0 — レビュー・承認（人間）。
// 要件 FR-ADM-004/005: 根拠・評価結果とともにレビューし、承認・差戻し理由を保存する。
// 要件 9.4 Level C: 二重承認（異なる承認者2名）を要求できる。
import { newId, nowIso } from './store.js';
import { assertPermission } from './identities.js';
import { recordAudit } from './audit.js';
import { transitionContent } from './workflow.js';

export function listReviewQueue(store) {
  return store
    .list('contents', (c) => ['review_required', 'needs_review'].includes(c.state))
    .sort((a, b) => {
      const rank = (c) => (c.gateLevel === 'C' ? 0 : c.state === 'needs_review' ? 1 : 2);
      return rank(a) - rank(b);
    });
}

function approvalsFor(store, contentId, contentVersion) {
  return store.list(
    'publication-decisions',
    (d) => d.contentId === contentId && d.decision === 'approved' && d.contentVersion === contentVersion,
  );
}

export function approveContent(store, contentId, { actor, reason, correlationId } = {}) {
  assertPermission(actor, 'content.approve');
  if (!reason) throw new Error('approval requires a reason (FR-ADM-004)');
  const content = store.get('contents', contentId);
  if (!content) throw new Error(`unknown content: ${contentId}`);
  if (content.state !== 'review_required') {
    throw new Error(`content ${contentId} is not awaiting review (${content.state})`);
  }
  // 承認は最新の合格評価に基づく必要がある。
  const evalRun = content.lastEvalRunId ? store.get('evaluation-runs', content.lastEvalRunId) : null;
  if (!evalRun || evalRun.verdict !== 'pass') {
    throw new Error(`content ${contentId} has no passing verification run`);
  }

  const prior = approvalsFor(store, contentId, content._version);
  if (prior.some((d) => d.decidedBy === actor)) {
    throw new Error(`double approval requires distinct approvers: ${actor} already approved`);
  }
  const decision = store.put('publication-decisions', {
    id: newId('dec'),
    contentId,
    contentVersion: content._version,
    decision: 'approved',
    decidedBy: actor,
    reason,
    gateLevel: content.gateLevel ?? 'B',
    at: nowIso(),
    correlationId,
  });

  const required = content.requiredApprovals ?? 1;
  const total = prior.length + 1;
  if (total >= required) {
    transitionContent(store, contentId, 'approved', { actor, reason, correlationId });
  } else {
    recordAudit(store, {
      actor,
      operation: 'content.approve.partial',
      target: contentId,
      after: { approvals: total, required },
      reason,
      correlationId,
    });
  }
  recordAudit(store, {
    actor,
    operation: 'content.approve',
    target: contentId,
    after: { decisionId: decision.id, approvals: total, required },
    reason,
    correlationId,
  });
  return { decision, approved: total >= required };
}

export function rejectContent(store, contentId, { actor, reason, correlationId } = {}) {
  assertPermission(actor, 'content.reject');
  if (!reason) throw new Error('rejection requires a reason (FR-ADM-004)');
  const content = store.get('contents', contentId);
  if (!content) throw new Error(`unknown content: ${contentId}`);
  if (content.state !== 'review_required') {
    throw new Error(`content ${contentId} is not awaiting review (${content.state})`);
  }
  const decision = store.put('publication-decisions', {
    id: newId('dec'),
    contentId,
    contentVersion: content._version,
    decision: 'rejected',
    decidedBy: actor,
    reason,
    at: nowIso(),
    correlationId,
  });
  transitionContent(store, contentId, 'needs_review', { actor, reason, correlationId });
  recordAudit(store, {
    actor,
    operation: 'content.reject',
    target: contentId,
    after: { decisionId: decision.id },
    reason,
    correlationId,
  });
  return decision;
}
