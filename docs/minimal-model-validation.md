# Minimal Model Validation

この文書は、AOF の最小モデルが複数ドメインに耐えるかを検証するための設計メモである。  
目的は実装を増やすことではなく、概念の不足と過剰を見つけることにある。

## Question

次の最小モデルだけで、

- `Need`
- `Intent`
- `Context`
- `Organization`
- `Actor`
- `Policy`
- `Decision`
- `Action`
- `Artifact`
- `Outcome`

を使って、異なる 3 ドメインを表現できるか。

対象ドメイン:

1. AIDLC
2. 住宅設計
3. ひまつぶしダンジョン

## Validation Rule

この検証で見たいのは次の 3 点である。

1. request を `Need / Intent / Context` に分解できるか
2. 誰が何を根拠に決めるかを `Organization / Actor / Policy / Governance` で表現できるか
3. `Decision / Action / Artifact / Outcome` を無理なく追跡できるか

この 3 点を満たすなら、最小モデルは少なくとも concept level では有効とみなせる。

## Fixed Actor Set

初期の concept validation では、Actor は次の 5 つから増やさない。

- `Visionary`
- `Builder`
- `Guardian`
- `Facilitator`
- `Reviewer`

ここで検証したいのは、Actor 名の豊富さではなく、少数の判断観点で異なる domain を記述できるかどうかである。

## Shared Governance Questions

各 domain で最低限次を答えられる必要がある。

- value / intent を誰が代表するか
- feasibility / execution を誰が代表するか
- risk / quality / safety を誰が代表するか
- decision rule は何か
- veto / exception rule はあるか
- deadlock や disagreement の escalation path はあるか

## Domain 1: AIDLC

### Representative Request

`初回離脱率を下げたい`

### Framing

- `Need`
  - 新規ユーザーの価値到達率を改善したい
- `Intent`
  - onboarding の friction を減らし、登録完了率を改善したい
- `Context`
  - 認証基盤は変更しない
  - 既存 onboarding flow がある
  - product KPI で改善判定する

### Organization / Actor / Policy

- `Organization`
  - product team
- `Visionary`
  - user value と product fit を代表
- `Builder`
  - implementation feasibility を代表
- `Guardian`
  - quality / safety / regression risk を代表
- `Facilitator`
  - clarification と decision flow を整える
- `Reviewer`
  - downstream review や release judgment を補助

主要 policy 例:

- user-value-first
- quality-first
- change-safety-first

### Decision / Action / Artifact / Outcome

- `Decision`
  - onboarding 改善方針、変更範囲、成功条件
- `Action`
  - requirements framing, design, implementation, test, release
- `Artifact`
  - spec, design, code diff, test results
- `Outcome`
  - 登録完了率、初回価値到達率、reopen 有無

### Reading

最小モデルだけで十分に表現できる。  
工程名は AIDLC 固有だが、コア構造は AOF にそのまま写せる。

## Domain 2: 住宅設計

### Representative Request

`家族が自然に集まれる家を設計したい`

### Framing

- `Need`
  - 生活動線と安心感を両立した住環境を作りたい
- `Intent`
  - 家族が集まりやすく、日常の使いやすさが高い住宅にしたい
- `Context`
  - 予算上限がある
  - 法規と構造安全は non-negotiable
  - 敷地条件と既存インフラ制約がある

### Organization / Actor / Policy

- `Organization`
  - residential design team
- `Visionary`
  - 住まい方、暮らしの価値、空間意図を代表
- `Builder`
  - 施工性、工程、コスト、設備との整合を代表
- `Guardian`
  - 構造、安全、法規、長期保全の観点を代表
- `Facilitator`
  - 要件整理、施主との clarification、判断記録を担う
- `Reviewer`
  - third-party review や approval gate を補助

主要 policy 例:

- safety-first
- livability-first
- budget-discipline

### Decision / Action / Artifact / Outcome

- `Decision`
  - 空間構成、優先制約、承認条件
- `Action`
  - requirement framing, concept design, detailed design, review, construction handoff
- `Artifact`
  - brief, plan drawings, sections, specifications
- `Outcome`
  - 住みやすさ、施工時の問題率、安全性、予算逸脱の有無

### Reading

これも最小モデルで表現できる。  
違うのは artifact format と outcome indicator であって、AOF のコア概念を増やす必要は見えない。

## Domain 3: ひまつぶしダンジョン

### Representative Request

`3分で何度も遊びたくなるダンジョン体験を作りたい`

### Framing

- `Need`
  - 短時間でも気持ちよく遊べる反復体験を作りたい
- `Intent`
  - テンポの良い探索と軽い成長感で再プレイしたくなる loop を作りたい
- `Context`
  - session length は短い
  - content volume は限られる
  - ルール理解は一目でできる必要がある

### Organization / Actor / Policy

- `Organization`
  - game design team
- `Visionary`
  - 面白さ、プレイ感、体験意図を代表
- `Builder`
  - 実装コスト、バランス実現性、content production を代表
- `Guardian`
  - exploit、破綻、退屈化、UX risk を代表
- `Facilitator`
  - request framing、playtest feedback の整理、decision flow を担う
- `Reviewer`
  - playtest review、release gate の補助

主要 policy 例:

- delight-first
- finish-first
- anti-friction

### Decision / Action / Artifact / Outcome

- `Decision`
  - loop design、risk acceptance、success criteria
- `Action`
  - concept framing, encounter design, tuning, playtest, release
- `Artifact`
  - dungeon rules, level tables, enemy sets, reward tables, playable build
- `Outcome`
  - replay rate、session completion rate、離脱 point、体験満足

### Reading

これも最小モデルで表現できる。  
ゲーム固有の工程名は必要だが、AOF core とは別に置ける。

## Result

現時点の読みでは、3 ドメインとも最小モデルで表現可能である。

共通して必要だったのは次である。

- request を `Need / Intent / Context` に落とすこと
- governance 観点を value / feasibility / risk で最低保証すること
- `Artifact` と `Outcome` を分けること

逆に、現時点で追加必須だと判定できた新概念はまだない。

## What This Does Not Yet Prove

この検証は concept validation であり、次をまだ証明しない。

- Actor 5 種だけで実運用が十分に回ること
- `Council of Three` が全 domain で最適であること
- policy の表現形式がこれで固定できること
- domain adaptation の実装コストが低いこと

## Follow-Up Questions

次に深掘りすべき論点は次である。

1. Actor 5 種の contract をどう定義するか
2. `Council of Three` を default governance としてどこまで形式化するか
3. Policy を priority list として表現するのか、rule として表現するのか
4. `最高の PM` のような人間の意思決定パターンを Actor contract にどう写すか

## Current Conclusion

今の段階では、AOF の価値は「AI をどう並べるか」よりも、  
**優秀な人間の意思決定を、AI を含む混成組織の形で記述できるか** にある。

したがって次の概念固定は、DSL の複雑化ではなく、

- Actor Contract
- Governance default
- README の思想強化

を優先するのが妥当である。
