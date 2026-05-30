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

## Execution
- Actions:
- Expected Artifact:
- Expected Outcome:

## Review
- Review Trigger:
- Review Date or Condition:
- Re-open Conditions:
```

## Field Notes

- `Scope` は全社、プロダクト、機能、要件承認、設計承認、リリース承認などの判断単位を書く。
- `Stage` は AIDLC のどの工程かを書く。
- `Context` は予算、期限、制約、既存依存、法規制など、その時点の判断条件を書く。
- `Options Considered` は最低 2 案あると比較可能性が高い。
- `Governance Rule Applied` は多数決、全会一致、Guardian 拒否権付き多数決などを書く。
- `Veto Used` は `yes/no` だけでなく、根拠となる Rule または Policy 違反を書く。
- `Expected Artifact` と `Expected Outcome` は分けて書く。
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

## Execution
- Actions: 要件確定、UI 文言修正、API 入力項目整理、テスト追加
- Expected Artifact: 要件メモ、UI 変更案、コード差分、テスト結果
- Expected Outcome: 初回登録完了率の改善、離脱率の低下

## Review
- Review Trigger: リリース後 2 週間または登録完了率が改善しない場合
- Review Date or Condition: First KPI review at 14 days
- Re-open Conditions: 離脱率が 5% 以上改善しない、重大障害発生
```
