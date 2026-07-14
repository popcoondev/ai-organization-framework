// ANKP Phase 0 — トレーサビリティ。
// 要件 UAT-003 / 13.5: 公開事実・正解 → Claim → Snapshot → Source の連鎖を追跡できる。
import { collectClaimIds } from './verification.js';

export function traceContent(store, contentId) {
  const content = store.get('contents', contentId);
  if (!content) throw new Error(`unknown content: ${contentId}`);
  const chains = [];
  for (const claimId of collectClaimIds(content)) {
    const claim = store.get('claims', claimId);
    if (!claim) throw new Error(`broken trace: claim ${claimId} missing for ${contentId}`);
    const snapshot = store.get('snapshots', claim.sourceSnapshotId);
    if (!snapshot) throw new Error(`broken trace: snapshot ${claim.sourceSnapshotId} missing for claim ${claimId}`);
    const source = store.get('sources', snapshot.sourceId);
    if (!source) throw new Error(`broken trace: source ${snapshot.sourceId} missing for snapshot ${snapshot.id}`);
    chains.push({
      claimId,
      statement: claim.statement,
      verificationStatus: claim.verificationStatus,
      sourceLocation: claim.sourceLocation,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.hash,
      contentDate: snapshot.contentDate,
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      trustTier: source.trustTier,
    });
  }
  return {
    contentId,
    type: content.type,
    state: content.state,
    generationRunId: content.generationRunId ?? null,
    modelId: content.modelId ?? null,
    chains,
  };
}
