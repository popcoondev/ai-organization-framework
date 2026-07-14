// ANKP Phase 0 — 公開・取り下げ・Kill Switch（Publisher Service / Admin）。
// 要件 FR-ADM-006: 公開時点の版を復元できる。
// 要件 FR-ADM-007: 重大な誤りを即時非公開にする Kill Switch。関連コンテンツも停止できる。
import { newId, nowIso } from './store.js';
import { assertPermission } from './identities.js';
import { recordAudit } from './audit.js';
import { transitionContent } from './workflow.js';
import { collectClaimIds } from './verification.js';
import { withdrawClaim } from './claims.js';

function globalKillSwitch(store) {
  return store.get('system', 'kill-switch');
}

export function publishContent(store, contentId, { actor, correlationId } = {}) {
  assertPermission(actor, 'content.publish');
  if (globalKillSwitch(store)?.engaged) {
    throw new Error('global kill switch engaged: publication suspended');
  }
  const content = store.get('contents', contentId);
  if (!content) throw new Error(`unknown content: ${contentId}`);
  if (!['approved', 'auto_publishable'].includes(content.state)) {
    throw new Error(`content ${contentId} is not publishable (${content.state})`);
  }
  // 公開時点の版を不変スナップショットとして保存する。
  const publication = store.put('publications', {
    id: newId('pub'),
    contentId,
    contentVersion: content._version,
    contentSnapshot: content,
    publishedBy: actor,
    publishedAt: nowIso(),
    status: 'published',
    correlationId,
  });
  transitionContent(store, contentId, 'published', {
    actor,
    reason: `published as ${publication.id}`,
    correlationId,
  });
  recordAudit(store, {
    actor,
    operation: 'content.publish',
    target: contentId,
    after: { publicationId: publication.id, contentVersion: content._version },
    correlationId,
  });
  return publication;
}

export function withdrawContent(store, contentId, { actor, reason, correlationId } = {}) {
  assertPermission(actor, 'content.withdraw');
  if (!reason) throw new Error('withdrawal requires a reason');
  const content = store.get('contents', contentId);
  if (!content) throw new Error(`unknown content: ${contentId}`);
  for (const publication of store.list('publications', (p) => p.contentId === contentId && p.status === 'published')) {
    store.put('publications', { ...publication, status: 'withdrawn', withdrawnAt: nowIso(), withdrawReason: reason });
  }
  if (content.state !== 'withdrawn') {
    transitionContent(store, contentId, 'withdrawn', { actor, reason, correlationId });
  }
  recordAudit(store, {
    actor,
    operation: 'content.withdraw',
    target: contentId,
    reason,
    correlationId,
  });
  return store.get('contents', contentId);
}

// Kill Switch: 対象（content / claim / global）から影響範囲へカスケードして即時停止する。
export function engageKillSwitch(store, { targetType, targetId, reason }, { actor, correlationId } = {}) {
  assertPermission(actor, 'killswitch');
  if (!reason) throw new Error('kill switch requires a reason');
  const affected = [];

  const withdrawByIds = (contentIds) => {
    for (const id of contentIds) {
      const content = store.get('contents', id);
      if (!content || content.state === 'withdrawn') continue;
      // Kill Switch は状態を問わず即時取り下げる。
      for (const publication of store.list('publications', (p) => p.contentId === id && p.status === 'published')) {
        store.put('publications', { ...publication, status: 'withdrawn', withdrawnAt: nowIso(), withdrawReason: reason });
      }
      store.put('contents', { ...content, state: 'withdrawn', killSwitchReason: reason });
      recordAudit(store, {
        actor,
        operation: 'content.transition',
        target: id,
        before: { state: content.state },
        after: { state: 'withdrawn' },
        reason: `kill switch: ${reason}`,
        correlationId,
      });
      affected.push(id);
    }
  };

  if (targetType === 'global') {
    store.put('system', { id: 'kill-switch', engaged: true, reason, engagedBy: actor, at: nowIso() });
  } else if (targetType === 'content') {
    const target = store.get('contents', targetId);
    if (!target) throw new Error(`unknown content: ${targetId}`);
    const targetClaims = new Set(collectClaimIds(target));
    const related = store.list('contents', (c) =>
      c.id === targetId || collectClaimIds(c).some((id) => targetClaims.has(id)),
    );
    withdrawByIds(related.map((c) => c.id));
  } else if (targetType === 'claim') {
    withdrawClaim(store, targetId, { actor, reason, correlationId });
    const related = store.list('contents', (c) => collectClaimIds(c).includes(targetId));
    withdrawByIds(related.map((c) => c.id));
  } else {
    throw new Error(`unknown kill switch targetType: ${targetType}`);
  }

  recordAudit(store, {
    actor,
    operation: 'killswitch.engage',
    target: targetId ?? 'global',
    after: { targetType, affectedContents: affected },
    reason,
    correlationId,
  });
  return { targetType, targetId: targetId ?? null, affectedContents: affected };
}

export function releaseKillSwitch(store, { actor, reason, correlationId } = {}) {
  assertPermission(actor, 'killswitch');
  store.put('system', { id: 'kill-switch', engaged: false, reason, releasedBy: actor, at: nowIso() });
  recordAudit(store, {
    actor,
    operation: 'killswitch.release',
    target: 'global',
    reason,
    correlationId,
  });
}
