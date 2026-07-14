// ANKP Phase 0 — Source Registry。
// 要件 FR-ADM-001 / NFR-PRI-003: URL、種別、信頼Tier、所有者、利用条件、収集頻度を管理する。
import { newId } from './store.js';
import { assertPermission } from './identities.js';
import { recordAudit } from './audit.js';

const TRUST_TIERS = [1, 2, 3];

export function addSource(store, spec, { actor, correlationId } = {}) {
  assertPermission(actor, 'source.manage');
  const { name, url, kind, trustTier, terms, owner, schedule } = spec;
  if (!name || !url) throw new Error('source requires name and url');
  if (!TRUST_TIERS.includes(trustTier)) {
    throw new Error(`trustTier must be one of ${TRUST_TIERS.join(',')}`);
  }
  const source = store.put('sources', {
    id: newId('src'),
    name,
    url,
    kind: kind ?? 'official',
    trustTier,
    terms: terms ?? {},
    owner: owner ?? actor,
    schedule: schedule ?? 'daily',
    enabled: true,
    createdBy: actor,
  });
  recordAudit(store, {
    actor,
    operation: 'source.add',
    target: source.id,
    after: { name, url, trustTier },
    correlationId,
  });
  return source;
}

export function setSourceEnabled(store, sourceId, enabled, { actor, reason, correlationId } = {}) {
  assertPermission(actor, 'source.manage');
  const source = store.get('sources', sourceId);
  if (!source) throw new Error(`unknown source: ${sourceId}`);
  const updated = store.put('sources', { ...source, enabled });
  recordAudit(store, {
    actor,
    operation: enabled ? 'source.enable' : 'source.disable',
    target: sourceId,
    before: { enabled: source.enabled },
    after: { enabled },
    reason,
    correlationId,
  });
  return updated;
}
