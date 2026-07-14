# ANKP Phase 0 設計 — 縦切り実装

対象要件: `ANKP-REQ-001 v1.0`（[抽出テキスト](./requirements-v1.0-extracted.md)）
実装スコープ: 要件書 16.3「推奨する最初の開発単位」および 14.2 Phase 0。

> 一つの公式リリースノートを取得し、Claimを3件抽出し、根拠付きミニ教材1件とクイズ3問を
> 生成し、別モデル＋ルールで評価し、管理画面で承認して公開する。
> この縦切りでデータ、AI、管理、公開、学習、監査を一度に検証する。

## 1. アーキテクチャ

```
fixtures/release-note.md（公式リリースノート相当・Tier 1）
        │  ingest（Collector ID）
        ▼
Source Registry ──► Source Snapshot（hash / diff / untrusted / injection検査）
        │  extract（Generator ID, Model Gateway 経由）
        ▼
Claim（10.3 必須フィールド）
        │  source-match（Verifier ID）→ 人間承認（Reviewer）
        ▼
Content Generation（Generator ID、入力は human_verified Claim のみ）
        │
        ▼
独立検証（Verifier ID、生成から分離されたルールエンジン）
        │  pass                          fail
        ▼                                ▼
公開ゲート分類（Level A/B/C）        needs_review（公開不可）
        │  approve（Reviewer / Knowledge Owner、Level C は二重承認）
        ▼
Publisher Service が公開（公開時点の版を不変保存）
        │
        ▼
監査ログ / トレーサビリティ（公開事実 → Claim → Snapshot → Source）
```

すべての操作は AI 専用 ID または人間ロールで実行され、監査ログ（JSONL）に
主体・操作・対象・前後値・理由・相関 ID が残る。

## 2. モジュール構成

| モジュール | 責務 | 主な要件 |
|---|---|---|
| `src/store.js` | 版管理付きファイルストア（旧版保持） | 10.4, FR-ADM-006 |
| `src/audit.js` | 追記専用監査ログ・検索 | FR-ADM-012, NFR-SEC-005, 13.5 |
| `src/identities.js` | AI専用ID / 人間ロール / 最小権限 | 9.7, NFR-SEC-002 |
| `src/source-registry.js` | 情報源（URL・信頼Tier・利用条件・所有者） | FR-ADM-001, NFR-PRI-003 |
| `src/snapshot.js` | Snapshot（hash・差分・untrusted 隔離・injection 検知） | FR-ADM-002, AIQ-008, NFR-SEC-004 |
| `src/claims.js` | Claim 必須構造・出典照合・人間承認・confidence | 10.3, AIQ-002, FR-ADM-003 |
| `src/model-gateway.js` | Model Registry・固定評価・回帰ゲート・フォールバック・安全拒否 | AIQ-MDL-001〜005, UAT-011, NFR-MNT-001 |
| `src/providers/deterministic.js` | 決定的プロバイダー（参照実装・劣化モード付き） | — |
| `src/generation.js` | 承認済み Claim 限定の教材・クイズ生成 | AIQ-003, AIQ-007 |
| `src/verification.js` | 独立検証（Claim カバー・日付・ラベル・クイズ品質） | AIQ-001/004/005/006, 7.4, UAT-004 |
| `src/gates.js` | 公開レベル分類（A: 条件付き自動 / B: レビュー / C: 二重承認） | 9.4 |
| `src/workflow.js` | コンテンツ状態遷移（遷移ごとに監査） | 13.2 |
| `src/review.js` | レビューキュー・承認/差戻し（理由必須・Level C 二重承認） | FR-ADM-004/005 |
| `src/publish.js` | 公開・取り下げ・Kill Switch（Claim 起点カスケード） | FR-ADM-006/007, UAT-010 |
| `src/trace.js` | 公開内容 → Claim → Snapshot → Source の追跡 | UAT-003, 13.5 |
| `src/pipeline.js` | 16.3 縦切り E2E デモ | UAT-001〜005, 012 |
| `src/cli.js` | 管理操作面（queue / approve / publish / audit / kill-switch） | FR-ADM 系 |

## 3. 主要な設計判断

### 3.1 モデル非依存（NFR-MNT-001 / AIQ-MDL-001）
業務コードはモデル名を一切持たない。モデルは Model Registry に
`{ id, provider, tasks, owner, qualityThreshold, priority }` として登録され、
Gateway がタスク別に選択する。Phase 0 は決定的プロバイダーのみを同梱し、
実 LLM は `PROVIDER_FACTORIES` へのアダプター追加（と Registry 登録・回帰評価）で導入する。

### 3.2 回帰評価ゲート（UAT-011）
`evaluateModel` は固定評価セット（Golden Dataset の最小形）でスコアを算出し、
`activateModel` は閾値未達を拒否する。テストでは劣化モード（出典欠落・根拠なし断定・
正解重複を出力するモデル）が実際にゲートで止まることを検証している。

### 3.3 生成と検証の分離（AIQ-004）
生成は Generator ID + 生成モデル、検証は Verifier ID + 生成から独立した
ルールエンジンで行う。生成側の自己採点は公開判断に使われない。
検証は Claim カバー率（Confirmed は Claim 必須・本文一致）、日付整合、
ラベル（Confirmed / Inferred / Suggested / Unknown）、クイズ品質
（正解の一意性・選択肢重複・誤答理由・Claim への正解追跡）を検査する。

### 3.4 公開ゲート（9.4）
- Level C（人間承認必須・二重承認）: セキュリティ / 法令 / 個人情報 / 契約 / 係争を含む内容、
  または injection 疑いスナップショット由来の内容。
- Level A（条件付き自動公開）: Tier 1 出典かつ既公開素材の再構成のみ。
  **新規の断定を含む初出コンテンツは自動公開されない。**
- Level B: それ以外はレビュー必須。

### 3.5 収集コンテンツの隔離（AIQ-008 / NFR-SEC-004）
Snapshot は常に `untrusted: true` で保存され、命令様パターンを検知した場合は
`injectionSuspect` が立ち、当該由来のコンテンツは Level C（人間承認必須）へ強制される。
収集本文がツール実行・状態変更を誘発する経路は存在しない。

### 3.6 Kill Switch（FR-ADM-007）
Claim / Content / Global の 3 起点。Claim 起点では、当該 Claim を参照する
すべてのコンテンツを公開状態から即時取り下げ、公開レコードも withdrawn 化する
（出典訂正 → 影響範囲展開のシナリオ、UAT-010 に対応）。

## 4. UAT 対応状況（Phase 0 時点）

| UAT | 状態 | 検証箇所 |
|---|---|---|
| UAT-001 Snapshot・差分保存 | ✅ | `test/identity-claims.test.js`, `test/e2e-demo.test.js` |
| UAT-002 Claim 作成・出典箇所・日付 | ✅ | 同上 |
| UAT-003 Claim 限定生成・全事実追跡 | ✅ | `test/generation-verification.test.js`, `test/e2e-demo.test.js` |
| UAT-004 評価ゲートによる公開停止 | ✅ | `test/generation-verification.test.js` |
| UAT-005 低リスク自動公開 / 高リスク人間レビュー | ✅（Level 分類・自動公開条件は保守的設定） | `test/publish-workflow.test.js` |
| UAT-010 出典訂正の影響範囲展開・停止 | ✅（Kill Switch カスケード） | `test/publish-workflow.test.js` |
| UAT-011 モデル回帰ゲート | ✅ | `test/model-gateway.test.js` |
| UAT-012 監査ログ追跡 | ✅ | `test/e2e-demo.test.js` |

その他の UAT（Web UI・学習進捗・5レンズ診断等）は MVP / Phase 1 以降のスコープ。

## 5. Phase 0 で意図的にやっていないこと

- Web UI（管理操作面は CLI。要件上、画面デザインは基本設計以降）
- 実 LLM プロバイダー接続（Gateway のアダプター追加で導入。O-005 未決）
- RDB / 検索基盤（ファイルストア。O-004 未決のため抽象化に留める）
- Daily AI の日次スケジューラ・配信枠（11.5 は初期案のため）
- 学習進捗・復習・5レンズ診断（Phase 1）

## 6. 次の開発単位（提案）

1. **Daily AI 記事エンティティ**: NewsItem（公開日/イベント日分離、Buzz/Impact/Credibility/Maturity スコア表示、FR-NEW 系）
2. **公開 Web（読み取り）**: 公開済みコンテンツの閲覧 API + 最小 UI（FR-ACT-001）
3. **実 LLM アダプター**: Model Gateway への Anthropic 等の接続と evals 拡充（O-005 の技術検証）
4. **5レンズ診断**: 付録 A の質問セットと Not Ready 判定（FR-PRJ-001/002）
