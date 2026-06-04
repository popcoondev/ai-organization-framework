# Codex Parent Join Contract

この文書は、AOF における **parent Codex join artifact** の最小 contract を定義する。

対象は、Human-started parent Codex が複数 child role result を受け取り、それらを join / aggregate して next move を決めるときの shape である。

## Position

parent join は、単なる conversational summary ではなく、**role result 群を runtime update に橋渡しする machine-readable aggregation surface** として扱う。

この contract の目的は次である。

1. expected role と actual role result の差を明示する
2. missing role / blocking signal / aggregate state を明示する
3. parent decision と runtime mutation の境界を明確にする

## Minimal Shape

```json
{
  "join_type": "role-join",
  "recorded_at": "2026-06-04T10:05:00+09:00",
  "stage": "approval",
  "expected_roles": [
    "visionary",
    "builder",
    "guardian"
  ],
  "received_roles": [
    "visionary",
    "builder",
    "guardian"
  ],
  "missing_roles": [],
  "aggregate_state": "ready-for-orchestrator-decision",
  "blocking_signals": [
    "governance-risk"
  ],
  "recommended_next_step": "write decision record and escalate to human review"
}
```

## Required Fields

### `join_type`

- 固定値: `role-join`
- parent aggregate artifact を識別する discriminator

### `recorded_at`

- join を確定した時刻
- role result 群との ordering を取るために必要

### `stage`

- どの orchestration stage の join か
- child role result の `stage` と一致していることが望ましい

### `expected_roles`

- parent が今回の join で期待した role の集合
- orchestration plan に対する completeness の基準になる

### `received_roles`

- 実際に child result が返ってきた role の集合
- partial completion, timeout, or missing assignment の把握に必要

### `missing_roles`

- `expected_roles - received_roles`
- parent が follow-up, retry, or degraded join を選ぶための直接入力

### `aggregate_state`

- join の current state
- 最低限、次を区別できること:
  - `ready-for-orchestrator-decision`
  - `waiting-for-missing-roles`
  - `blocked-by-signal`
  - `degraded-partial-join`

### `blocking_signals`

- child results から集約された signals
- human escalation や runtime hold の判断に使う

### `recommended_next_step`

- parent join の current recommendation
- 例:
  - `write decision record and proceed`
  - `spawn replacement child role`
  - `escalate to human review`
  - `narrow scope and rerun`

## Optional Fields

次は optional とする。

- `join_id`
- `join_status`
- `received_session_ids`
- `source_task_id`
- `source_parent_session_id`
- `decision_record_ref`
- `summary`

`v1.11` では必須にしないが、runtime-backed implementation に進むときの拡張余地として扱う。

## Join Semantics

### `ready-for-orchestrator-decision`

- 必須 role はそろった
- parent は aggregate interpretation を行って runtime update へ進める

### `waiting-for-missing-roles`

- expected role がまだ不足している
- parent は timeout, retry, or degraded join を選ぶ必要がある

### `blocked-by-signal`

- role result は集まっていても blocking signal が強い
- human escalation または scope reset を優先すべき状態

### `degraded-partial-join`

- missing role があるまま、現実的に partial decision を出す状態
- parent は risk と boundary を明示して次へ進める必要がある

## Missing Role Handling

`missing_roles` が空でない場合、parent は少なくとも次のいずれかを選べるようにする。

1. wait for missing role
2. spawn replacement child
3. proceed with degraded partial join
4. escalate to human review

この選択自体は join artifact に recommendation として残してよいが、最終 action owner は parent Codex である。

## Blocking Signal Handling

`blocking_signals` は child result の `signals` をそのまま並べるだけではなく、**parent が次の governance action を決めるための aggregated risk surface** として扱う。

例:

- `governance-risk`
- `alignment-risk`
- `execution-risk`
- `human-review-needed`

複数 signal がある場合、parent は `recommended_next_step` で優先する follow-through を明示する。

## Relation To Runtime Update

join artifact もまた、**runtime mutation そのものではない**。

flow は次である。

1. child role results are written
2. parent creates join artifact
3. parent interprets aggregate state
4. parent writes runtime updates

runtime update の例:

- task status update
- decision record write
- signal emission
- recent confirmation update
- next value slice refinement

## Non-Goals

この contract は次を主張しない。

1. join artifact だけで autonomous loop が成立すること
2. parent が unattended scheduler-native process として動くこと
3. strong independence of child seats

この contract は、**現行 Codex 仕様で可能な parent orchestration の honesty layer** である。
