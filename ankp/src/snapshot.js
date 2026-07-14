// ANKP Phase 0 — Source Snapshot。
// 要件 FR-ADM-002: 取得内容、ハッシュ、取得日時、差分を保存し、同じ版を後から再現できる。
// 要件 AIQ-008 / NFR-SEC-004: 収集コンテンツは信頼しない入力として隔離する。
import { newId, nowIso, sha256 } from './store.js';
import { assertPermission } from './identities.js';
import { recordAudit } from './audit.js';

// 出典本文に含まれる「AIへの命令」らしきパターン。検知した場合は自動公開経路から外す。
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+|the\s+)?(previous|above|prior)\s+instructions/i,
  /disregard\s+(all\s+|the\s+)?(previous|above|prior)/i,
  /you\s+are\s+now\s+/i,
  /begin\s+system\s+prompt/i,
  /<\s*script\b/i,
  /これまでの指示を無視/,
];

export function ingestSnapshot(store, { sourceId, content, contentDate, fetchedAt }, { actor, correlationId } = {}) {
  assertPermission(actor, 'snapshot.ingest');
  const source = store.get('sources', sourceId);
  if (!source) throw new Error(`unknown source: ${sourceId}`);
  if (!source.enabled) throw new Error(`source is disabled: ${sourceId}`);
  if (!content) throw new Error('snapshot requires content');

  const hash = sha256(content);
  const previous = store
    .list('snapshots', (s) => s.sourceId === sourceId)
    .sort((a, b) => (a.fetchedAt < b.fetchedAt ? 1 : -1))[0];

  const snapshot = store.put('snapshots', {
    id: newId('snap'),
    sourceId,
    hash,
    fetchedAt: fetchedAt ?? nowIso(),
    contentDate: contentDate ?? null,
    content,
    // 収集コンテンツは常に「信頼しないデータ」。ツール指示として解釈してはならない。
    untrusted: true,
    injectionSuspect: INJECTION_PATTERNS.some((re) => re.test(content)),
    changedFromPrevious: !previous || previous.hash !== hash,
    previousSnapshotId: previous?.id ?? null,
  });

  recordAudit(store, {
    actor,
    operation: 'snapshot.ingest',
    target: snapshot.id,
    after: {
      sourceId,
      hash,
      contentDate: snapshot.contentDate,
      changedFromPrevious: snapshot.changedFromPrevious,
      injectionSuspect: snapshot.injectionSuspect,
    },
    correlationId,
  });
  return snapshot;
}
