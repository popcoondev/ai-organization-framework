# ANKP — AI Native Knowledge Platform (Phase 0)

要件定義書 `ANKP-REQ-001 v1.0`（AIネイティブ開発人材育成・AI業界ナレッジプラットフォーム）の
**Phase 0 縦切り実装**。要件書 16.3「推奨する最初の開発単位」を実行可能な形にしたもの。

> 一つの公式リリースノートを取得し、Claimを3件抽出し、根拠付きミニ教材1件とクイズ3問を生成し、
> 別モデル＋ルールで評価し、管理画面で承認して公開する。

- 要件（抽出テキスト）: [docs/requirements-v1.0-extracted.md](docs/requirements-v1.0-extracted.md)
- Phase 0 設計と要件トレーサビリティ: [docs/phase0-design.md](docs/phase0-design.md)

## 実行

Node.js 22+ / 依存パッケージなし。

```bash
cd ankp

# 縦切り E2E デモ（Source → Claim → 生成 → 検証 → 承認 → 公開 → 監査）
npm run demo

# テスト
npm test
```

デモ後の管理操作:

```bash
node src/cli.js queue --data-dir=data              # レビューキュー
node src/cli.js contents --data-dir=data           # コンテンツ一覧
node src/cli.js trace <contentId> --data-dir=data  # 根拠トレース
node src/cli.js audit --correlation=<corId> --data-dir=data
node src/cli.js kill-switch claim <claimId> --as=admin --reason="出典訂正" --data-dir=data
```

## Phase 0 が保証すること

- 公開される Confirmed 事実・クイズ正解は必ず Claim → Snapshot → Source へ追跡できる（Claim カバー率 100%）
- 生成入力は人間承認済み Claim に限定される（自由な Web 知識で教材を作らない）
- 生成と検証は分離され、検証不合格のコンテンツは公開経路に乗らない
- セキュリティ等の高リスク内容と injection 疑い出典は人間承認必須（Level C・二重承認）
- モデルは Registry 管理で、回帰評価の閾値未達モデルは本番化できない
- すべての操作が AI 専用 ID / 人間ロールで実行され、監査ログに残る
- Kill Switch は Claim 起点で影響コンテンツへカスケードして即時停止できる
