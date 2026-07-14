// ANKP Phase 0 — コンテンツ生成（Generator ID）。
// 要件 AIQ-003: 生成入力は承認済み Claim と既存ナレッジに限定する。
// 要件 AIQ-007: 根拠不足なら生成を停止する（Unknown を推測で埋めない）。
import { newId } from './store.js';
import { assertPermission } from './identities.js';
import { recordAudit } from './audit.js';

function loadApprovedClaims(store, claimIds) {
  const claims = claimIds.map((id) => {
    const claim = store.get('claims', id);
    if (!claim) throw new Error(`unknown claim: ${id}`);
    return claim;
  });
  const unapproved = claims.filter((c) => c.verificationStatus !== 'human_verified');
  if (unapproved.length) {
    throw new Error(
      `AIQ-003: generation input must be human_verified claims. rejected: ${unapproved
        .map((c) => `${c.id}(${c.verificationStatus})`)
        .join(', ')}`,
    );
  }
  return claims;
}

function sourceContext(store, claims) {
  const snapshot = store.get('snapshots', claims[0]?.sourceSnapshotId);
  const source = snapshot ? store.get('sources', snapshot.sourceId) : null;
  return { snapshot, source };
}

export function generateLesson(store, gateway, { title, claimIds }, { actor, correlationId } = {}) {
  assertPermission(actor, 'content.generate');
  if (!claimIds?.length) throw new Error('AIQ-007: no claims provided, generation refused');
  const claims = loadApprovedClaims(store, claimIds);
  const { snapshot, source } = sourceContext(store, claims);

  const result = gateway.run('lesson-generation', { title, claims }, { actor, correlationId });
  if (!result.ok) throw new Error(`lesson generation refused: ${result.reason}`);

  const content = store.put('contents', {
    id: newId('les'),
    type: 'lesson',
    title,
    blocks: result.output.blocks,
    claimIds,
    sourceSnapshotId: snapshot?.id ?? null,
    sourceId: source?.id ?? null,
    state: 'generated',
    generationRunId: result.runId,
    modelId: result.modelId,
    generatedBy: actor,
  });
  recordAudit(store, {
    actor,
    operation: 'content.generate',
    target: content.id,
    after: { type: 'lesson', claimIds, runId: result.runId, modelId: result.modelId },
    correlationId,
  });
  return content;
}

export function generateQuiz(store, gateway, { claimIds }, { actor, correlationId } = {}) {
  assertPermission(actor, 'content.generate');
  if (!claimIds?.length) throw new Error('AIQ-007: no claims provided, generation refused');
  const claims = loadApprovedClaims(store, claimIds);
  const { snapshot, source } = sourceContext(store, claims);

  const result = gateway.run(
    'quiz-generation',
    { claims, sourceName: source?.name, contentDate: snapshot?.contentDate },
    { actor, correlationId },
  );
  if (!result.ok) throw new Error(`quiz generation refused: ${result.reason}`);

  const content = store.put('contents', {
    id: newId('qz'),
    type: 'quiz',
    title: `${source?.name ?? 'Daily'} クイズ`,
    questions: result.output.questions,
    claimIds,
    sourceSnapshotId: snapshot?.id ?? null,
    sourceId: source?.id ?? null,
    state: 'generated',
    generationRunId: result.runId,
    modelId: result.modelId,
    generatedBy: actor,
  });
  recordAudit(store, {
    actor,
    operation: 'content.generate',
    target: content.id,
    after: { type: 'quiz', claimIds, runId: result.runId, modelId: result.modelId },
    correlationId,
  });
  return content;
}
