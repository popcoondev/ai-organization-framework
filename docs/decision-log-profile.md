# Decision Log Profile

AI Organization Framework における machine-readable decision log companion の標準運用仕様。

## Purpose

markdown の `Decision Record` を人間向け正本としつつ、automation、replay、trace analysis のために stable JSON companion を定義する。

## Canonical Rule

正本は markdown である。  
JSON は companion であり、同じ decision を機械可読に写したものとする。

規則:

1. markdown is canonical
2. JSON is companion
3. 両者は同じ `decision_id` を共有する
4. 同じ basename で保存する

## File Layout

推奨配置:

```text
.aof/
  decisions/
    DEC-LX9KS8-EF56GH.md
    DEC-LX9KS8-EF56GH.json
```

## JSON Responsibilities

JSON companion は次に使う。

1. runtime replay
2. audit trail extraction
3. graph / timeline generation
4. SDK adapter ingestion
5. filtering and search

## Markdown Responsibilities

markdown 正本は次に使う。

1. human review
2. long-form rationale
3. nuance preservation
4. manual correction

## Standard Keys

JSON companion には次を持つ。

### Metadata

- `record_format_version`
- `decision_id`
- `created_at`
- `canonical_markdown_path`

### Decision Core

- `scope`
- `stage`
- `organization optional`
- `request`
- `need`
- `intent`
- `decision_summary`

### Governance

- `governance_model optional`
- `decision_makers optional`
- `governance_rule_applied optional`
- `veto_used optional`

### Context and Trace

- `context optional`
- `context_snapshot_id optional`
- `protocol_thread_id optional`
- `existing_artifacts_reviewed optional`
- `background_or_prior_decisions optional`
- `clarifications_or_assumptions optional`

### Execution and Review

- `selected_option optional`
- `actions optional`
- `expected_artifact optional`
- `expected_outcome optional`
- `completion_criteria optional`
- `success_criteria optional`
- `change_trigger optional`
- `review_trigger optional`

## Compatibility Rule

互換性は次で保つ。

1. required keys は破壊的に変えない
2. optional key の追加は許容する
3. enum を狭める変更は major 扱いにする
4. `record_format_version` を必ず明示する

## Consistency Rule

markdown と JSON が衝突した場合は markdown を優先する。  
runtime は JSON を読むが、監査や修正では markdown 正本を参照する。

## Emission Rule

runtime が JSON companion を出す場合、少なくとも次を保証する。

1. markdown と同じ `decision_id`
2. same session or same update transaction で生成
3. `canonical_markdown_path` が解決できる

## Storage Rule

JSON companion は overwrite してよいが、必要なら VCS か archive で履歴を残す。  
decision の意味が変わる更新は、新しい decision id に分ける方を優先する。

## SDK Guidance

SDK は markdown parser を正本にしてもよいが、通常は JSON companion を ingest して扱う。  
ただし write-back は markdown 正本に従う。

## Minimal Example

```json
{
  "record_format_version": "1.0.0",
  "decision_id": "DEC-LX9KS8-EF56GH",
  "created_at": "2026-05-31T07:00:00.000Z",
  "canonical_markdown_path": ".aof/decisions/DEC-LX9KS8-EF56GH.md",
  "scope": "User onboarding improvement",
  "stage": "Requirements approval",
  "organization": "Product Team",
  "request": "初回離脱率を下げたい",
  "need": "新規ユーザーの継続率を上げたい",
  "intent": "初回導線を簡素化して価値到達までの時間を短縮する",
  "decision_summary": "登録フォームの必須項目を半減し、初回入力負荷を下げる",
  "governance_model": "Council of Three",
  "decision_makers": [
    "visionary-worker-01 (Visionary)",
    "implementation-worker-01 (Builder)",
    "review-worker-01 (Guardian)"
  ],
  "context_snapshot_id": "CTX-LX9KS8-IJ78KL",
  "protocol_thread_id": "thr-req-001",
  "selected_option": "Option A",
  "expected_artifact": "要件メモ、UI 変更案、コード差分、テスト結果",
  "expected_outcome": "初回登録完了率の改善、離脱率の低下",
  "review_trigger": "リリース後 2 週間または登録完了率が改善しない場合"
}
```
