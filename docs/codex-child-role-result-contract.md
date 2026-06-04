# Codex Child Role Result Contract

この文書は、AOF における **child role result artifact** の最小 contract を定義する。

対象は、Human-started parent Codex が spawn した role-scoped child agent が、親へ結果を返すときの shape である。

この contract の目的は次である。

1. parent Codex が child output を machine-readable に join できるようにする
2. role result と runtime update の境界を曖昧にしない
3. current Codex parent/child orchestration を release-grade surface にする

## Position

child role result は、単なる自由文の message ではなく、**parent Codex が join / aggregate できる最小 artifact** として扱う。

この contract は次の境界を前提とする。

- child agent は role-scoped reasoning / implementation / review を行う
- child agent は判断結果を artifact 化して返す
- parent Codex はその artifact を読み、next-step decision と runtime update を行う

## Minimal Shape

最小 shape は次である。

```json
{
  "result_type": "role-result",
  "recorded_at": "2026-06-04T10:00:00+09:00",
  "role": "guardian",
  "stage": "approval",
  "session_id": "SESS-GUARD-001",
  "status": "completed",
  "recommendation": "request_changes",
  "rationale": "blast radius is not yet bounded enough for fast-track approval",
  "signals": [
    "governance-risk"
  ],
  "artifact_refs": [
    ".aof/decisions/DEC-214.json"
  ],
  "decision_required": true
}
```

## Required Fields

### `result_type`

- 固定値: `role-result`
- parent が child result artifact として解釈するための discriminator

### `recorded_at`

- child result を確定した時刻
- join ordering と audit trace に使う

### `role`

- child の role 名
- 例:
  - `visionary`
  - `builder`
  - `guardian`
  - `experience-steward`

### `stage`

- どの orchestration stage の結果か
- 例:
  - `framing`
  - `planning`
  - `execution`
  - `approval`
  - `review`

### `session_id`

- child execution unit を識別する ID
- parent が repeated run や partial retry を区別するために必要

### `status`

- child run の完了状態
- 最低限、次を区別できること:
  - `completed`
  - `blocked`
  - `partial`

### `recommendation`

- parent に返す role-scoped recommendation
- 例:
  - `approve`
  - `request_changes`
  - `ship_slice`
  - `narrow_scope`
  - `escalate`

### `rationale`

- recommendation を支える短い説明
- parent が aggregate summary を作るための最小根拠

### `signals`

- parent が join 時に見る risk / escalation / governance signals
- 例:
  - `governance-risk`
  - `alignment-risk`
  - `execution-risk`
  - `human-review-needed`

### `artifact_refs`

- child が参照または更新した artifact の path
- parent が downstream runtime update や human-facing summary を作るときの trace になる

### `decision_required`

- parent Codex が次に明示的判断を下す必要があるか
- `true` のとき、parent は単なる pass-through ではなく aggregation decision を行う

## Optional Fields

次は optional でよい。

- `source_task_id`
- `source_decision_record_id`
- `source_parent_session_id`
- `blocking_reason`
- `missing_inputs`
- `confidence`

これらは将来の runtime implementation で追加できるが、`v1.11` の最小 contract には含めない。

## Status Semantics

### `completed`

- child role として必要な判断を返し終わった
- recommendation を parent がそのまま join 対象にできる

### `blocked`

- child 単独では判断を完了できなかった
- parent は human review, scope reset, or further child assignment を検討する

### `partial`

- 子タスクの一部だけ終わった
- parent は missing work を明示して join する必要がある

## Relation To Runtime Update

重要なのは、**child role result 自体は runtime mutation ではない** ことである。

- child result:
  - role-scoped conclusion
  - parent join input
- runtime update:
  - parent Codex が aggregate 後に行う state mutation

つまり flow は次である。

1. child writes role result
2. parent reads role results
3. parent joins / aggregates
4. parent writes runtime artifacts, decision records, tasks, or `.aof` state

## Non-Goals

この contract は次を主張しない。

1. role result が independent truth であること
2. parallel child runs が strong independence を保証すること
3. child artifact だけで最終 decision が確定すること

最終 decision owner は parent Codex である。
