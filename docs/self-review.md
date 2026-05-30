# Self Review

AI Organization Framework の現時点レビュー。

## 結論

方向性に大きな矛盾はない。  
現在の中心命題である「AI エージェント規格ではなく、AI と人間の意思決定組織規格である」は、`Need`、`Intent`、`Context`、`Governance`、`Decision`、`Artifact`、`Outcome` の構造と整合している。

ただし、仕様として固定するにはいくつかの境界を明示する必要があった。

## 修正済みの論点

### Vision と Intent

問題:

`README.md` の AIDLC 例で `Vision` が登場していたが、基本要素では `Intent` のみ定義されていた。  
このままだと `Vision` が新しいコア概念なのか、AIDLC 固有名なのかが曖昧になる。

判断:

`Vision` は AIDLC における `Intent` のドメイン別表現とする。  
コア概念は `Intent` に統一する。

### Council の適用範囲

問題:

`Council of Three` を最高意思決定機関と書くと、Organization 全体に常に 1 つだけ存在するように読める。  
しかし実運用では、要件承認、設計承認、リリース承認など、意思決定スコープごとに最終判断者が異なる可能性がある。

判断:

Council は対象スコープ内の最高意思決定機関とする。  
全社、プロダクト、工程、リリース単位などに設置できる。

### Artifact と Outcome

問題:

建築やゲームの例では、建物、ゲームイベント、プレイ体験の境界が曖昧になりやすい。  
直接作られたものと、外部に生じた結果が混ざるとループの再現性が落ちる。

判断:

Artifact は Action によって直接作られたもの。  
Outcome は Artifact が現実にもたらした外部結果とする。

例:

- 建物は Artifact
- 家族が集まるようになったことは Outcome
- ゲームイベントは Artifact
- プレイヤーが 3 分楽しんだことは Outcome

## 現時点で矛盾していない点

### Actor と Role

`Actor` は実体、`Role` は責務という分離で整合している。  
Role を補助概念にしたため、Council の `Visionary` や AIDLC の `Builder` を Actor 名としても Role 名としても使える。

正式な記録では、実体と責務を分ければ矛盾しない。

### Policy と Governance

`Policy` は判断基準、`Governance` は決定権限であり、役割が重ならない。  
Actor は Policy に基づき提案やレビューを行うが、Decision は Governance によって確定する。

### AIDLC を初回実証にする方針

妥当。  
理由は、要件、設計、実装、テスト、リリースという Artifact が明確で、承認点も置きやすく、Outcome も観測しやすいからである。

## 残る仕様リスク

1. `Need` と `Intent` の分解品質をどう評価するか
2. `Decision` の記録フォーマットをどう標準化するか
3. `Guardian` の拒否権をどの条件で発動できるか
4. `Outcome` が観測できない短期案件をどう扱うか
5. 外的変化を `Outcome` と別にどう扱うか
6. AI Actor の性能差や並列性をどうモデル化するか
7. `Done` と `Success` をどう分離するか
8. 見積もりを必須とせずに、必要な予測情報だけをどう定義するか

## 次に固めるべき仕様

最優先は `Decision` の記録フォーマットである。  
理由は、Governance がこのフレームワークの中心であり、Decision の記録がなければ「誰が何を根拠に決めたか」を再現できないためである。

この点については、標準テンプレートを [docs/decision-record-template.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/decision-record-template.md:1) として定義した。  
次の論点は、この記録粒度が実案件で重すぎないかを検証することである。

## 追加レビュー

今回の再チェックで、既存 Issue #1-#5 は「静的な仕様の整備」としては整合しているが、実運用に必要な次の4論点が不足していると判断した。

1. 外的変化のモデル化
2. AI Actor の性能理解
3. 完成条件と成功条件の分離
4. 見積もりを必須前提にしない予測モデル

これらはそれぞれ Issue #6-#9 として追加した。  
この追加により、全体設計は `概念定義 -> ガバナンス定義 -> 通信定義 -> 実証 -> 動的運用` の流れで一貫した論点配置になった。

## Runtime 観点の確認

今回さらに確認した結果、runtime 化に向けて次の 4 論点を別グループとして持つのが自然だと判断した。

1. Clarification/Discovery phase
2. local template folder layout and manifest schema
3. local runtime trigger, session lifecycle, and persistence
4. SDK surface and adapters

これらは Issue #10-#13 として追加した。  
この結果、Issue 群は次の 4 層で整理できる。

1. `#1-#4`: コア仕様
2. `#5`: 実証
3. `#6-#9`: 動的運用と AI 前提の補正
4. `#10-#13`: runtime/template/sdk 化
5. `#14`: 既存案件への適用時の orientation

この並びであれば、全体設計と Issue の進行方向は統制が取れている。

優先順位については [docs/priority-roadmap.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/priority-roadmap.md:1) を正本とする。

## #10 対応

`Clarification` については、`Discovery` を別フェーズに分けず、標準運用フェーズの中の手法として扱う方針を採用した。  
この判断により、request の曖昧さ解消、既存資料確認、brownfield orientation を 1 つの入口仕様として統合できる。

## #14 対応

`Orientation` については、独立したコア phase ではなく、brownfield 向け `Clarification` サブモードとして定義した。  
この判断により、既存案件で最低限何を集め、何を記録し、どの条件を満たせば framing に進めるかを固定できた。

## #2 対応

`Policy` については、canonical 7 軸を標準セットとし、必須表現は ordinal order、重みは任意補助情報とする方針を採用した。  
この判断により、数値の疑似精密さを避けつつ、runtime や `Decision Record` で再利用できる記述規格を固定できる。

## #8 対応

`Completion Criteria` と `Success Criteria` は分離し、前者を Artifact-level done、後者を Outcome-level success として定義した。  
この判断により、release 完了と business success を混同せず、monitoring や reopen の条件を別に扱える。

## #9 対応

`Estimate` はコア概念にせず、必要な予測情報を任意の `Forecast` として扱う方針を採用した。  
この判断により、人間工数前提を押し付けずに、duration、review load、retry cost、不確実性などを判断支援として記録できる。

## #5 対応

Issue `#9` の実作業を使って AIDLC pilot record を 1 本作成し、現在の成功条件を実案件で照合した。  
この結果、flow 自体は回るが、docs-only task では outcome が process outcome に寄ることと、Decision Record の重さが残ることが分かった。
