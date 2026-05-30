# Decision Record Template

AI Organization Framework における標準の意思決定記録テンプレート。

## Template

```md
# Decision Record: <Decision ID>

## Scope
- Scope:
- Stage:
- Organization:

## Input
- Request:
- Need:
- Intent:
- Context:
- Existing Artifacts Reviewed:
- Background or Prior Decisions:
- Clarifications or Assumptions:

## Options Considered
- Option A:
- Option B:
- Option C:

## Decision
- Selected Option:
- Decision Summary:

## Governance
- Decision Makers:
- Governance Rule Applied:
- Veto Used:

## Rationale
- Why this option:
- Why other options were not selected:
- Policy priorities applied:
- Policy tradeoffs accepted:

## Execution
- Actions:
- Expected Artifact:
- Expected Outcome:
- Completion Criteria:
- Success Criteria:
- Completion Approval Scope:
- Success Evaluation Scope:

## Review
- Review Trigger:
- Review Date or Condition:
- Re-open Conditions:
```

## Field Notes

- `Scope` は全社、プロダクト、機能、要件承認、設計承認、リリース承認などの判断単位を書く。
- `Stage` は AIDLC のどの工程かを書く。
- `Context` は予算、期限、制約、既存依存、法規制など、その時点の判断条件を書く。
- `Existing Artifacts Reviewed` は brownfield で重要になる。判断前に参照した仕様書、コード、Issue、release note、既存成果物を列挙する。
- `Background or Prior Decisions` は既存案件で重要になる。背景、変更履歴、既存 Artifact、過去の判断、現在の inherited constraints を簡潔に書く。
- `Clarifications or Assumptions` は request が曖昧なときに重要になる。質問への回答、暫定前提、未解消の曖昧さを書く。
- `Options Considered` は最低 2 案あると比較可能性が高い。
- `Governance Rule Applied` は多数決、全会一致、Guardian 拒否権付き多数決などを書く。
- `Veto Used` は `yes/no` だけでなく、根拠となる Rule または Policy 違反を書く。
- `Policy priorities applied` は [docs/policy-model.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/policy-model.md:1) の ordinal order を基本に書く。必要なら補助的に重みを併記してよい。
- `Policy tradeoffs accepted` は優先した軸と犠牲にした軸を書く。衝突がなければ省略してよい。
- `Expected Artifact` と `Expected Outcome` は分けて書く。
- `Completion Criteria` は Artifact-level done を定義する。[docs/completion-success-model.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/completion-success-model.md:1) を参照。
- `Success Criteria` は Outcome-level success を定義する。短期案件で proxy を使う場合はここに明示する。
- `Completion Approval Scope` と `Success Evaluation Scope` は同じでも別でもよい。
- `Review Trigger` は KPI 閾値、障害発生、納期到達、ユーザーフィードバックなどを書く。

## AIDLC Example

```md
# Decision Record: AIDLC-REQ-001

## Scope
- Scope: User onboarding improvement
- Stage: Requirements approval
- Organization: Product Team

## Input
- Request: 初回離脱率を下げたい
- Need: 新規ユーザーの継続率を上げたい
- Intent: 初回導線を簡素化して価値到達までの時間を短縮する
- Context: 2 週間以内に実装、既存 API は維持、モバイル優先
- Existing Artifacts Reviewed: onboarding spec v2、signup flow code、release note 2026-05、issue #123
- Background or Prior Decisions: 現行 onboarding は 3 画面構成で、登録前に全プロフィール入力を要求している。認証基盤は既存利用を前提とする。
- Clarifications or Assumptions: 初回導線は新規登録開始から初回価値到達までを指す。既存認証基盤は変更しない。

## Options Considered
- Option A: フォーム項目を半減する
- Option B: チュートリアルを追加する
- Option C: 初回登録を後回しにしてゲスト導線を作る

## Decision
- Selected Option: Option A
- Decision Summary: 登録フォームの必須項目を半減し、初回入力負荷を下げる

## Governance
- Decision Makers: Visionary, Builder, Guardian
- Governance Rule Applied: Majority vote with Guardian veto on security violations
- Veto Used: No

## Rationale
- Why this option: 実装負荷が低く、2 週間以内に出せて、離脱要因に直接効く
- Why other options were not selected: B は学習コストが増え、C は認証要件に追加設計が必要
- Policy priorities applied: Value > Speed > Quality > Cost
- Policy tradeoffs accepted: quality polish was deferred to preserve 2-week delivery

## Execution
- Actions: 要件確定、UI 文言修正、API 入力項目整理、テスト追加
- Expected Artifact: 要件メモ、UI 変更案、コード差分、テスト結果
- Expected Outcome: 初回登録完了率の改善、離脱率の低下
- Completion Criteria: code merged, tests passed, release approved
- Success Criteria: sign-up completion rate improves by at least 5% within 14 days
- Completion Approval Scope: Release approval
- Success Evaluation Scope: Product KPI review

## Review
- Review Trigger: リリース後 2 週間または登録完了率が改善しない場合
- Review Date or Condition: First KPI review at 14 days
- Re-open Conditions: 離脱率が 5% 以上改善しない、重大障害発生
```
