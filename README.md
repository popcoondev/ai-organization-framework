# AI Organization Framework

AI Organization Framework は、人間と AI の混成チームが、曖昧な要求から再現可能に判断し、成果物を作り、その結果を次の判断へ還流させるための組織設計規格である。

これは「AI エージェントをどう動かすか」の規格ではない。  
「要求をどう解釈し、誰が何を根拠に決め、何を成果物とみなし、何を結果として追うか」を扱う規格である。

## Status

このリポジトリは、完成した universal standard ではなく、概念を固めるための設計仕様と local runtime prototype を含む repo である。  
現在は `v1.0.0` を release 済みで、`v1.1` では measurement foundation と operational policy を固定した。

- `v1` の境界: [docs/v1-release-definition.md](docs/v1-release-definition.md)
- `v1.1` の境界: [docs/v1.1-release-definition.md](docs/v1.1-release-definition.md)
- `v1.2` の境界: [docs/v1.2-release-definition.md](docs/v1.2-release-definition.md)
- `v1.3` の境界: [docs/v1.3-release-definition.md](docs/v1.3-release-definition.md)
- `v1.3` readiness evidence: [docs/v1.3-release-checklist.md](docs/v1.3-release-checklist.md)
- `v1.3` RC draft: [docs/v1.3.0-rc-draft.md](docs/v1.3.0-rc-draft.md)
- `v1.3.0` release notes draft: [docs/v1.3.0-release-notes.md](docs/v1.3.0-release-notes.md)
- `v1.4` の境界: [docs/v1.4-release-definition.md](docs/v1.4-release-definition.md)
- `v1.4` readiness evidence: [docs/v1.4-release-checklist.md](docs/v1.4-release-checklist.md)
- `v1.4` RC draft: [docs/v1.4.0-rc-draft.md](docs/v1.4.0-rc-draft.md)
- `v1.4.0` release notes draft: [docs/v1.4.0-release-notes.md](docs/v1.4.0-release-notes.md)
- `v1.5` の境界: [docs/v1.5-release-definition.md](docs/v1.5-release-definition.md)
- `v1.5` readiness evidence: [docs/v1.5-release-checklist.md](docs/v1.5-release-checklist.md)
- `v1.5` RC draft: [docs/v1.5.0-rc-draft.md](docs/v1.5.0-rc-draft.md)
- `v1.5.0` release notes draft: [docs/v1.5.0-release-notes.md](docs/v1.5.0-release-notes.md)
- `v1.2` readiness evidence: [docs/v1.2-release-checklist.md](docs/v1.2-release-checklist.md)
- `v1.2` RC draft: [docs/v1.2.0-rc-draft.md](docs/v1.2.0-rc-draft.md)
- `v1.2.0` release notes draft: [docs/v1.2.0-release-notes.md](docs/v1.2.0-release-notes.md)
- `v1.1` readiness evidence: [docs/v1.1-release-checklist.md](docs/v1.1-release-checklist.md)
- `v1.1` RC draft: [docs/v1.1.0-rc-draft.md](docs/v1.1.0-rc-draft.md)
- `v1.1.0` release notes draft: [docs/v1.1.0-release-notes.md](docs/v1.1.0-release-notes.md)
- 最初の 10 分: [docs/quickstart.md](docs/quickstart.md)
- CLI reference: [docs/cli-reference.md](docs/cli-reference.md)
- live verification: [docs/live-provider-verification.md](docs/live-provider-verification.md)
- visibility output formats: [docs/human-visibility-output-formats.md](docs/human-visibility-output-formats.md)

## この規格が解決したい問題

AI 活用はしばしば、単発の生成や単純な役割分担で終わる。  
しかし実際の仕事は、次の問題を抱えている。

- request が曖昧なまま実行に流れる
- 「何を本当に解くのか」と「どういう方向で解くのか」が混ざる
- 成果物ができても、それが成功なのかは分からない
- 誰が何を根拠に決めたかが残らない
- 結果や外部変化が次の判断に反映されにくい

AOF はこれを、個別のプロンプト改善ではなく、意思決定組織の設計問題として扱う。

## この規格の立場

AOF は次の立場をとる。

- request はそのまま実行してはいけない
- request に usable な `Need` がない場合は、先に `Discovery` で provisional `Need` を発見する
- request は `Need / Intent / Context` に分解して初めて判断可能になる
- 実行前に governance が必要である
- `Artifact` と `Outcome` は分けて追跡する必要がある
- `Outcome` と `External Signal` は次の `Context` を更新し、必要なら `Need` や `Intent` の再解釈を引き起こす

したがって AOF は、生成フレームワークではなく、判断と運用のフレームワークである。

## 何を標準化するのか

AOF が標準化するのは、ドメインをまたいで再利用したい抽象構造である。

### 1. Request を判断可能な形へ変える最小分解

- request に `Need` が不足している場合は、その前段に `Discovery` を置いてよい
- `Need`
- `Intent`
- `Context`

この 3 つがそろって初めて、組織は request を判断可能な単位にできる。  
したがって AOF は、`Need` が既知の task だけでなく、`Need` をまだ発見していない task にも適用できる。

### 2. 判断主体の最小構造

- `Organization`
- `Actor`
- `Policy`

誰が判断し、何を優先し、どの組織責任のもとで動くかを記述可能にする。

### 3. 実行と結果の最小追跡構造

- `Decision`
- `Action`
- `Artifact`
- `Outcome`

これにより、

- 何を決めたか
- 何をしたか
- 何を作ったか
- 何が起きたか

を分けて追える。

### 4. Governance の必要性

AOF は governance の存在を必須とする。  
ただし `Council of Three` 自体を唯一の mandatory 形にはしない。

必須なのは次である。

- value / intent を代表する観点
- feasibility / execution を代表する観点
- risk / quality / safety を代表する観点
- decision rule
- veto / exception rule
- escalation path

### 5. Completion と Success の分離

AOF は、完成と成功を分ける。

- `Completion Criteria`: Artifact が done とみなせる条件
- `Success Criteria`: Outcome が successful とみなせる条件

この分離はソフトウェアでも建築でもゲームでも必要である。

## 何を標準化しないのか

AOF は上位の組織規格であり、下位の実装や各ドメインの表現までは固定しない。

### 1. 工程名そのもの

AOF は `Need / Intent / Context` 以降の抽象構造を標準化するが、

- AIDLC
- 住宅設計
- ゲーム制作

で使う工程名そのものは固定しない。

例:

- Requirements
- Concept Design
- Dungeon Loop Tuning

のような名称は各ドメインでよい。

### 2. 成果物フォーマットそのもの

AOF は `Artifact` を概念として標準化するが、

- コード差分
- 図面
- ダンジョン定義
- レベルテーブル

の具体フォーマットは標準化しない。

### 3. Outcome 指標そのもの

AOF は `Outcome` を追うことを要求するが、

- 売上
- 安全性
- 学習定着
- 継続率
- 滞在時間

のどれを success とみなすかはドメイン依存である。

### 4. Actor 名の無制限拡張

AOF は Actor を使うが、Actor の語彙を無制限に増やすこと自体は標準化の本体ではない。  
Actor 名は domain shorthand として増やせるが、増やさなくても core 概念が成立することのほうが重要である。

### 5. Policy DSL の完全仕様

Policy は必須概念だが、Policy DSL の完全仕様は現時点で確定しない。  
優先順位軸の共通化は重要だが、表現形式は将来の規格化論点として扱う。

## 最小モデル

AOF の最小モデルは次である。

### Request Framing

- `Need`
- `Intent`
- `Context`

### Organization Structure

- `Organization`
- `Actor`
- `Policy`

### Execution Trace

- `Decision`
- `Action`
- `Artifact`
- `Outcome`

この最小モデルでまず問うべきことは、

- request を解釈できるか
- 誰が決めるかを記述できるか
- 実行と結果を追えるか

である。

## Actor の初期固定

最初の概念固定では、Actor は次の 5 つから増やさない。

- `Visionary`
- `Builder`
- `Guardian`
- `Facilitator`
- `Reviewer`

この制約の狙いは、ドメインごとに役割語彙を増やす前に、最小 Actor 集合で複数ドメインが表現できるかを検証することにある。

## Domain Neutrality

AOF の重要な仮説は、仕事の本質はドメイン固有の工程名よりも、次の構造にあるという点である。

`Need -> Intent -> Context -> Decision -> Action -> Artifact -> Outcome`

ドメインが変わると変わるのは、

- 何を Artifact とみなすか
- 何を Outcome とみなすか
- どこに approval point を置くか
- 誰がどの観点を担うか

であって、core 構造そのものではない。

## Runtime との関係

この README は runtime の手引きではなく、規格の思想文書である。  
runtime, CLI, template, verification の詳細は個別ドキュメントに分離する。

ただし runtime は、概念検証と運用検証の補助として重要である。  
現在の prototype では次を確認できる。

- `Need / Intent / Context` を session として保持できる
- `Decision / Action / Artifact / Outcome` を分けて trace できる
- clarification, reopen, outcome writeback を machine-readable に記録できる
- `framing-only` と `runtime-on` の使い分けを docs で運用できる

runtime の価値は単発 task だけに限られない。  
AOF は、初動を速くする intake/assembly model と、長く続く work を reopen / signal / outcome で運用する loop の両方を持つことを目指す。

## この README の使い方

読む順序の推奨:

1. この README で「何を標準化する規格か」をつかむ
2. `Clarification`, `Governance`, `Decision Record` の詳細仕様を見る
3. 各ドメインへの適用例を見る
4. 必要なら local runtime prototype を試す

関連文書:

- discovery: [docs/discovery-phase.md](docs/discovery-phase.md)
- discovery acceleration: [docs/discovery-acceleration.md](docs/discovery-acceleration.md)
- knowledge state: [docs/knowledge-state-model.md](docs/knowledge-state-model.md)
- organization sizing: [docs/organization-sizing.md](docs/organization-sizing.md)
- team assembly: [docs/team-assembly-model.md](docs/team-assembly-model.md)
- autonomy and goal sizing: [docs/autonomy-and-goal-sizing.md](docs/autonomy-and-goal-sizing.md)
- mission control: [docs/mission-control-loop.md](docs/mission-control-loop.md)
- interpretation lenses: [docs/interpretation-lenses.md](docs/interpretation-lenses.md)
- clarification: [docs/clarification-phase.md](docs/clarification-phase.md)
- governance: [docs/governance-template-model.md](docs/governance-template-model.md)
- decision record: [docs/decision-record-template.md](docs/decision-record-template.md)
- minimal model validation: [docs/minimal-model-validation.md](docs/minimal-model-validation.md)
- operating model validation: [docs/v1.3-operating-model-validation.md](docs/v1.3-operating-model-validation.md)
- domain adaptation: [docs/domain-adaptation-guide.md](docs/domain-adaptation-guide.md)
- AIDLC mapping: [docs/aidlc-pilot.md](docs/aidlc-pilot.md)
- quickstart: [docs/quickstart.md](docs/quickstart.md)

## 現在の規範強度

現時点の AOF は、完成した universal standard ではなく、概念を固めるための設計仕様である。  
したがって現段階では、次を優先する。

- core 概念の固定
- ドメイン横断の表現可能性の検証
- governance 最小保証の確認
- runtime は概念検証の補助として扱う

## 現時点の結論

AOF が標準化したいのは、AI や人間が混在する仕事を「再現可能な意思決定組織」として扱うための最小構造である。  
標準化したいのは、工程名でも実装手段でもなく、要求の分解、判断主体、判断記録、成果物と結果の分離である。

逆に、各ドメイン固有の工程名、成果物形式、KPI、Policy DSL の完全形までは、まだ標準化しない。  
そこを急いで固定するより先に、最小モデルが複数ドメインに耐えるかを検証する。
