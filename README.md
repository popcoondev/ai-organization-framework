# AI Organization Framework

AI Organization Framework は、人間と AI の混成組織が、曖昧な要求から高品質な成果物と実際の成果を再現可能に生み出すための組織規格である。

これは AI エージェント規格ではない。  
解釈、議論、意思決定、実行、検証を含む、意思決定組織の規格である。

## 目的

人の曖昧な要求から

- 意図を汲み取り
- 制約を明確化し
- 適切な意思決定を行い
- 高品質な成果物を出し
- 結果を次の判断に還流させる

この流れを、AI と人間の組織として再現可能にする。

## 前提

現実の仕事は、単純な `Planner -> Executor -> Reviewer` では閉じない。  
実際には次の構造を持つ。

`要求 -> 解釈 -> 議論 -> 意思決定 -> 実行 -> 成果物 -> 結果`

この構造は、ソフト開発、建築、教育、ゲーム、経営などで共通している。

## コアモデル

フレームワークの最小ループは次の通り。

`Need -> Intent -> Context -> Discussion -> Decision -> Action -> Artifact -> Outcome`

`Outcome` は再び `Context` を更新し、必要なら `Need` や `Intent` の再解釈を引き起こす。

## 運用ワークフロー

runtime として動かす場合、実際の開始点は `Request` より前の `Trigger` になる。  
また、曖昧な要求を扱うため、`Request` 受領後には `Clarification` を標準運用フェーズとして置く。

`Clarification` は新しいコア成果物ではない。  
`Need` `Intent` `Context` を十分に定義するための質問、追加調査、前提確認、仮説の明示を行うフェーズである。

`Clarification` の詳細仕様は [docs/clarification-phase.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/clarification-phase.md:1) を正本とする。

入力が十分に明確な場合は `Clarification` を短縮または省略してよい。  
入力が曖昧な場合は、利用者への質問や既存資料の確認を経てから framing に進む。

既存案件に適用する場合は、`Clarification` の中で `Orientation` を行う。  
ここでは背景、経緯、既存 Artifact、過去の意思決定、現状の制約、未解決課題を把握してから framing に進む。

`Orientation` の詳細仕様は [docs/orientation-phase.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/orientation-phase.md:1) を正本とする。

```mermaid
flowchart LR
    trigger[Trigger]
    request[Request Intake]
    clarify[Clarification]
    orient[Orientation for Existing Work]
    frame[Frame Need Intent Context]
    select[Select Workflow]
    discuss[Discussion]
    decide[Decision]
    act[Action]
    artifact[Artifact]
    outcome[Outcome]
    monitor[Monitor]
    reopen[Re-open Session]
    close[Close Session]

    trigger --> request --> clarify --> frame --> select --> discuss --> decide --> act --> artifact --> outcome --> monitor
    clarify --> orient --> frame
    monitor --> close
    monitor --> reopen
    reopen --> clarify
```

## 構成図

```mermaid
flowchart TD
    request[Request]
    need[Need]
    intent[Intent]
    context[Context]

    subgraph org[Organization]
        mission[Mission]
        rules[Rules]
        governance[Governance]

        subgraph actors[Actors]
            actor1[Actor]
            actor2[Actor]
            actor3[Actor]
        end

        subgraph actor_props[Actor Properties]
            policy[Policy]
            capability[Capability]
            role[Role optional]
        end

        subgraph council[Council of Three default]
            visionary[Visionary]
            builder[Builder]
            guardian[Guardian]
        end
    end

    discussion[Discussion]
    decision[Decision]
    action[Action]
    artifact[Artifact]
    outcome[Outcome]

    request --> need
    need --> intent
    intent --> context
    context --> discussion

    actor1 --> discussion
    actor2 --> discussion
    actor3 --> discussion

    policy --> actor1
    capability --> actor1
    role --> actor1

    mission --> governance
    rules --> governance
    governance --> council
    council --> decision
    discussion --> decision

    decision --> action
    action --> artifact
    artifact --> outcome
    outcome --> context
```

## 基本要素

### Request

利用者や顧客から与えられる表層的な要求。  
曖昧でもよい。`Request` は入力であり、解釈対象である。

例:

- 売上を伸ばしたい
- 3 分で楽しいゲームイベントを作りたい
- チームの開発速度を上げたい

### Need

本当に解決したいこと。  
`Request` の背後にある本質的な課題。

例:

- 利益を増やしたい
- 学習定着率を上げたい
- 家族が自然に集まる場を作りたい

### Intent

Need をどういう方向で実現するかという方針。
ドメインによっては `Vision` と呼んでもよいが、コア概念としては `Intent` に統一する。

例:

- 業務効率化したい
- 初回体験の面白さを高めたい
- 安全性を最優先で改善したい

### Context

意思決定時点の状況と制約。

例:

- 予算 500 万円
- 納期 3 ヶ月
- 法規制あり
- 既存システムと互換必須

### Actor

観察、提案、判断、実行を行う実体。  
人間でも AI でもよい。

例:

- Storyteller
- Facilitator
- Wizard
- Architect
- Builder
- Reviewer

### Role

Actor に付与される責務ラベル。  
Role は抽象概念であり、Actor そのものではない。

原則:

- Actor は実体
- Role は責務
- 1 つの Actor が複数 Role を持ってよい
- 1 つの Role を複数 Actor が担ってよい

このため、Role は必須のコア要素ではなく、組織設計上の補助概念とする。

### Policy

Actor または Organization が何を優先するかを示す判断基準。

例:

- 品質優先
- 安全性優先
- 面白さ優先
- 完走優先
- 学習効果優先

推奨する標準軸:

- Value
- Quality
- Safety
- Cost
- Speed
- Learning
- Delight

Policy は自由文ではなく、これらの軸への優先順位として表現すると再現性が高い。  
標準軸と表現ルールの詳細は [docs/policy-model.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/policy-model.md:1) を正本とする。

### Capability

Actor が実際にできること。

例:

- 設計
- 実装
- 文章生成
- 画像生成
- 分析
- テスト

### Organization

共通の目的のもとで協働する Actor の集合。

例:

- Product Team
- Architecture Team
- Game Team

Organization は少なくとも次を持つ。

- Mission
- Rules
- Governance

### Governance

誰が、何を、どの条件で決めるかを定義する仕組み。  
このフレームワークの最重要概念である。

Governance がない組織は、Actor の寄せ集めでしかない。
Governance は Organization 全体だけでなく、特定の工程、成果物、リリース判断などの意思決定スコープごとに設定できる。

### Decision

議論を踏まえて採択された判断。  
Decision は `Action` を正当化する。

### Action

Decision に基づく実行。

### Artifact

Action によって生成された成果物。
Artifact は直接作られたものを指す。利用者体験や事業上の変化は、原則として Outcome として扱う。

例:

- 要件定義書
- 設計書
- コード
- テスト結果
- 図面
- ゲームイベント
- 画像

### Outcome

Artifact が現実にもたらした結果。  
Artifact と Outcome は同一ではない。

例:

- 売上が上がった
- 障害率が下がった
- プレイ継続率が上がった
- 学習定着率が改善した

### Completion Criteria

Artifact が `done` とみなせる条件。  
工程内の完了条件であり、成功条件とは別である。

### Success Criteria

Outcome が `successful` とみなせる条件。  
外部結果の達成条件であり、完了条件とは別である。

## 整合性ルール

このフレームワークを矛盾なく運用するため、以下を原則とする。

1. `Request` はそのまま実行しない。必ず `Need` `Intent` `Context` に分解して解釈する。
2. `Actor` は `Policy` と `Capability` を持つことで初めて意味を持つ。
3. `Decision` は `Governance` によって確定する。Artifact の存在だけでは正当化されない。
4. `Action` は Artifact を作る。Outcome は Artifact の外部効果である。
5. `Completion Criteria` と `Success Criteria` は分けて定義する。
6. `Outcome` は次の `Context` を更新し、必要なら `Need` と `Intent` を見直す。
7. ドメイン固有の工程名はコア概念ではない。AIDLC や建築工程は、このモデル上の具体的な写像である。

## 標準ガバナンステンプレート

### Council of Three

`Council of Three` は、最高意思決定機関の標準テンプレートである。  
ただし、これは唯一の普遍形ではなく、再利用しやすい既定形と位置づける。
ここでいう最高意思決定機関とは、対象となる意思決定スコープ内での最終判断者を意味する。

3 つの判断観点は次の通り。

- Visionary: 価値、目的適合、意味を見る
- Builder: 実現可能性、資源、工程を見る
- Guardian: 品質、安全、破綻リスクを見る

### 決定ルール

既定値:

- 原則は多数決
- 必要に応じて Guardian に拒否権を設定できる
- 拒否権は感覚ではなく、明示された Rule または Policy 違反を根拠に行使する

この構造により、価値、実現性、リスクの 3 観点を最低限カバーできる。

## 最小通信規格

Actor 間の通信は、まず次の最小セットで定義できる。

- Observe
- Propose
- Review
- Approve
- Reject
- Request Rework
- Report Outcome

完全なプロトコル仕様は今後の課題だが、少なくとも「提案」「承認」「差し戻し」「結果報告」は必須である。

## Decision Record

`Decision` を再現可能にするため、最低限次の項目を記録する。

1. `Decision ID`
2. `Scope`
3. `Request`
4. `Need`
5. `Intent`
6. `Context`
7. `Existing Artifacts Reviewed`
8. `Background or Prior Decisions`
9. `Clarifications or Assumptions`
10. `Options Considered`
11. `Decision`
12. `Decision Makers`
13. `Governance Rule Applied`
14. `Rationale`
15. `Actions`
16. `Expected Artifact`
17. `Expected Outcome`
18. `Completion Criteria`
19. `Success Criteria`
20. `Completion Approval Scope`
21. `Success Evaluation Scope`
22. `Review Trigger`

これにより、何が入力で、どの背景を引き継ぎ、どの曖昧さをどう解消し、誰が、どのルールで、何を根拠に決め、何を作り、どの結果を期待したかを追跡できる。

```mermaid
flowchart TD
    input[Request Need Intent Context]
    reviewed[Existing Artifacts Reviewed]
    history[Background or Prior Decisions]
    clarify[Clarifications or Assumptions]
    options[Options Considered]
    gov[Governance Rule Applied]
    deciders[Decision Makers]
    decision[Decision]
    rationale[Rationale]
    actions[Actions]
    artifact[Expected Artifact]
    outcome[Expected Outcome]
    done[Completion Criteria]
    success[Success Criteria]
    review[Review Trigger]

    input --> reviewed --> history --> clarify --> options
    options --> decision
    gov --> decision
    deciders --> decision
    decision --> rationale
    decision --> actions
    actions --> artifact
    artifact --> done
    done --> outcome
    outcome --> success
    success --> review
```

テンプレートは [docs/decision-record-template.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/decision-record-template.md:1) に置く。
完了条件と成功条件の詳細は [docs/completion-success-model.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/completion-success-model.md:1) を正本とする。

runtime と SDK の初期設計は [docs/runtime-sdk.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/runtime-sdk.md:1) に整理する。

## 意思決定ループ

1. `Request` を受け取る
2. `Need` `Intent` `Context` を明確化する
3. Actor がそれぞれの Policy と Capability に基づいて観察する
4. Proposal と Review を通じて議論する
5. Governance に従って `Decision` を確定する
6. `Action` を実行する
7. `Artifact` を生成する
8. `Outcome` を観測する
9. `Outcome` を `Context` に還流し、次の判断に使う

```mermaid
flowchart LR
    request[Request]
    need[Need]
    intent[Intent]
    context[Context]
    observe[Observe]
    discuss[Discussion]
    decide[Decision]
    act[Action]
    artifact[Artifact]
    outcome[Outcome]

    request --> need --> intent --> context --> observe --> discuss --> decide --> act --> artifact --> outcome
    outcome --> context
    outcome -. if needed .-> need
    outcome -. if needed .-> intent
```

## ドメイン適用

### AIDLC

ソフト開発を最初の実証対象とする。

例:

`Need -> Intent/Vision -> Context -> Requirements -> Design -> Implementation -> Test -> Release -> Outcome`

ここでの重要点は、各工程名そのものではない。  
各工程において、

- 誰が解釈するか
- 誰が決めるか
- 何を Artifact とみなすか
- 何を Outcome とみなすか

を Governance と結びつけて定義できるかが本質である。

### 建築

`Need -> Intent -> Context -> Design -> Drawings -> Construction -> Building(Artifact) -> Outcome`

### ゲーム

`Need -> Intent -> Context -> Event Design -> Game Event(Artifact) -> Play Experience(Outcome)`

## 現時点の結論

このフレームワークは、AI エージェントの役割分担表ではない。  
人間と AI が混成した意思決定組織をどう設計し、どう再現可能に運用するかの規格である。

最初の実証対象はゲームではなく AIDLC が最適である。  
理由は、日常的に観測しやすく、Artifact と Outcome の対応を追跡しやすく、工程ごとの Governance を検証しやすいからである。

## 未解決課題

1. [#1 Role をどこまで正式概念として残すか](https://github.com/popcoondev/ai-organization-framework/issues/1)
2. [#3 Council of Three をどこまで既定形として採用するか](https://github.com/popcoondev/ai-organization-framework/issues/3)
3. [#4 Actor 間通信の正式なメッセージ仕様をどう定義するか](https://github.com/popcoondev/ai-organization-framework/issues/4)
4. [#5 AIDLC 実証の成功条件が実案件で機能するか](https://github.com/popcoondev/ai-organization-framework/issues/5)
5. [#6 External Signal/Event をコアモデルにどう組み込むか](https://github.com/popcoondev/ai-organization-framework/issues/6)
6. [#7 AI Actor の performance and capacity model をどう定義するか](https://github.com/popcoondev/ai-organization-framework/issues/7)
7. [#9 Estimate を必須概念にせず Forecast として扱うか](https://github.com/popcoondev/ai-organization-framework/issues/9)
8. [#11 ローカル template folder layout と manifest schema をどう設計するか](https://github.com/popcoondev/ai-organization-framework/issues/11)
9. [#12 local runtime trigger と session lifecycle をどう作るか](https://github.com/popcoondev/ai-organization-framework/issues/12)
10. [#13 runtime と SDK の境界、および adapter surface をどう定義するか](https://github.com/popcoondev/ai-organization-framework/issues/13)

これらの課題は、作業管理上は GitHub Issue を正本として扱う。  
運用ルールは [docs/issue-management.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/issue-management.md:1) を参照する。
優先順位は [docs/priority-roadmap.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/priority-roadmap.md:1) にまとめる。
