// ANKP Phase 0 — 公開ゲート分類。
// 要件 9.4: Level A（条件付き自動公開）/ Level B（サンプリングレビュー）/ Level C（人間承認必須）。
const HIGH_RISK_PATTERNS = [
  /security|vulnerab|cve|exploit|injection/i,
  /脆弱性|セキュリティ/,
  /legal|regulation|law|判決|規制|法令/i,
  /personal (data|information)|個人情報/i,
  /contract|契約/i,
  /lawsuit|係争|訴訟/i,
];

function contentText(content) {
  if (content.type === 'lesson') {
    return content.blocks.map((b) => b.text).join('\n');
  }
  if (content.type === 'quiz') {
    return content.questions.map((q) => [q.prompt, ...q.options, q.explanation].join('\n')).join('\n');
  }
  return JSON.stringify(content);
}

export function classifyGate(store, content, claims) {
  const reasons = [];
  const snapshot = content.sourceSnapshotId ? store.get('snapshots', content.sourceSnapshotId) : null;
  const source = content.sourceId ? store.get('sources', content.sourceId) : null;
  const text = contentText(content);

  const highRiskText = HIGH_RISK_PATTERNS.some((re) => re.test(text));
  const highRiskClaims = claims.some((c) => ['security', 'legal'].includes(c.claimType));
  const injectionSuspect = Boolean(snapshot?.injectionSuspect);
  const lowTrustSource = (source?.trustTier ?? 3) > 1;

  // Level C: セキュリティ・法令・個人情報・契約・係争、または汚染疑いスナップショット。
  if (highRiskText || highRiskClaims || injectionSuspect) {
    if (highRiskText) reasons.push('high-risk topic in content text');
    if (highRiskClaims) reasons.push('high-risk claimType (security/legal)');
    if (injectionSuspect) reasons.push('source snapshot flagged as injection suspect');
    return { level: 'C', state: 'review_required', requiredApprovals: 2, reasons };
  }

  // Level A: Tier 1 出典 + 既公開素材からの再構成（復習・単純事実問題）のみ。
  // 新規の断定を含む初出コンテンツは自動公開しない。
  if (!lowTrustSource && content.reusedFromPublished === true) {
    reasons.push('tier-1 source, reuse of already published material');
    return { level: 'A', state: 'auto_publishable', requiredApprovals: 0, reasons };
  }

  // Level B: それ以外の新規コンテンツはレビューへ。
  reasons.push(lowTrustSource ? 'source trust tier > 1' : 'first publication of new content');
  return { level: 'B', state: 'review_required', requiredApprovals: 1, reasons };
}
