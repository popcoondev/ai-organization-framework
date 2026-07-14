// ANKP Phase 0 — コンテンツ状態遷移。
// 要件 13.2: 状態遷移ごとに実行主体、理由、日時を記録する。
import { recordAudit } from './audit.js';

export const CONTENT_STATES = [
  'generated',
  'evaluated',
  'auto_publishable',
  'review_required',
  'approved',
  'published',
  'needs_review',
  'withdrawn',
];

const TRANSITIONS = {
  generated: ['evaluated', 'needs_review'],
  evaluated: ['auto_publishable', 'review_required'],
  auto_publishable: ['published', 'review_required', 'withdrawn'],
  review_required: ['approved', 'needs_review', 'withdrawn'],
  approved: ['published', 'review_required', 'withdrawn'],
  published: ['withdrawn', 'needs_review'],
  needs_review: ['withdrawn'],
  withdrawn: [],
};

export function transitionContent(store, contentId, to, { actor, reason, correlationId } = {}) {
  const content = store.get('contents', contentId);
  if (!content) throw new Error(`unknown content: ${contentId}`);
  const allowed = TRANSITIONS[content.state] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`invalid content transition: ${content.state} -> ${to} (${contentId})`);
  }
  const updated = store.put('contents', { ...content, state: to });
  recordAudit(store, {
    actor: actor ?? 'system',
    operation: 'content.transition',
    target: contentId,
    before: { state: content.state },
    after: { state: to },
    reason,
    correlationId,
  });
  return updated;
}
