# Runtime Session Model

AI Organization Framework の local runtime trigger、session lifecycle、state persistence の正式仕様。

## Purpose

最初の trigger から始まる runtime session を、中断や再開を含めて再現可能にする。

## Trigger Model

runtime は次の trigger type を標準で受けられる。

1. `cli`
2. `api`
3. `github-issue`
4. `file-drop`
5. `external-signal`

trigger は最低限次を持つ。

- `trigger_id`
- `trigger_type`
- `received_at`
- `request_payload`

必要なら次も持てる。

- `source_ref`
- `related_session_id`
- `related_decision_id`

## Session Identity

session は最低限次で識別する。

- `session_id`
- `workflow_id`
- `organization_id`
- `created_at`
- `status`

## Session States

標準 state は次とする。

1. `idle`
2. `intake`
3. `clarification`
4. `waiting_user`
5. `framed`
6. `planning`
7. `running`
8. `reviewing`
9. `monitoring`
10. `reopened`
11. `closed`
12. `stopped`

## Lifecycle

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> intake: trigger received
    intake --> clarification
    clarification --> waiting_user: clarification needed
    waiting_user --> clarification: partial answer received
    waiting_user --> planning: enough context, status becomes framed
    planning --> running
    running --> reviewing
    reviewing --> monitoring
    monitoring --> reopened: signal or outcome requires change
    reopened --> clarification
    monitoring --> closed: success met or stop approved
    running --> stopped: manual stop or fatal failure
    clarification --> stopped: abandoned
    closed --> [*]
    stopped --> [*]
```

## State Meaning

`status` と `current_stage` は同一である必要はない。  
たとえば clarification が完了した session は `status: framed` になりつつ、次の実 stage として `current_stage: planning` を持ってよい。

### `waiting_user`

human answer 待ち。  
timeout policy の対象になってよい。

### `monitoring`

artifact delivery 後で、outcome や external signal を見ている状態。

### `reopened`

一度進んだ session が、新しい signal、negative outcome、policy change で再開された状態。

### `stopped`

停止は closed と違う。  
done でも success でもなく、manual stop、fatal error、scope cancellation を意味する。

## Persistence Model

runtime は最低限次を永続化する。

1. session state
2. clarification log
3. selected workflow
4. routing mode
5. current context snapshot reference
6. decision references
7. artifact references
8. signal references

## On-Disk Files

推奨 layout:

```text
.aof/
  sessions/
    SESS-001.json
  decisions/
    DEC-001.md
    DEC-001.json
  context/
    active/
    summaries/
    snapshots/
    archive/
  signals/
    SIG-001.json
  artifacts/
```

## Session File Schema

`sessions/SESS-001.json` は最低限次を持つ。

- `session_id`
- `workflow_id`
- `organization_id`
- `status`
- `trigger`
- `current_stage`
- `routing_mode optional`
- `context_snapshot_id optional`
- `open_decision_ids`
- `closed_decision_ids`
- `artifact_refs optional`
- `signal_refs optional`
- `created_at`
- `updated_at`

`current_stage` は free-form string ではなく、stage-role matrix にある stage に制限する。

- `clarification`
- `planning`
- `proposal`
- `review`
- `approval`
- `reopen`

`routing_mode` は runtime がどれだけ軽量に stage を通すかを表す。

- `deep-path`
  - default mode
  - planning では Builder に加えて Visionary review を要求する
  - proposal / review / approval でも standard council participation を維持する
- `fast-track`
  - lightweight task 向けの短縮 mode
  - planning と proposal は Builder primary のみで進められる
  - review / approval は Guardian の minimal review を基本にする

選択優先順は次とする。

1. explicit runtime override
2. workflow `default_routing_mode`
3. fallback `deep-path`

## Clarification Persistence

clarification は session file に埋めてもよいが、長くなるなら別 file に分けてよい。

最低限残すもの:

- asked questions
- question rationale
- trigger classes
- target fields
- user answers
- assumptions
- unresolved ambiguity
- clarification round count

## Resume Rule

runtime は次の状態から resume できる。

- `waiting_user`
- `planning`
- `running`
- `monitoring`
- `reopened`

resume 時は最低限次を確認する。

1. referenced context snapshot が存在する
2. open decision ids が整合している
3. related artifacts / signals path が解決できる

## Reopen Rule

session reopen は新規 session ではなく、既存 session の continuation として扱ってよい。

reopen 条件の例:

- success criteria unmet
- negative outcome observed
- external signal received
- governance override

## Stop Rule

stop は close と分ける。  
次のような場合に `stopped` に入る。

- manual cancellation
- unresolved fatal dependency
- invalid template or persistence corruption

stop 時は次を残す。

- stop reason
- recoverability
- suggested next action

## First Runnable Prototype Scope

最初の local prototype は次までで十分である。

1. CLI trigger
2. 1 workflow only
3. one active session at a time
4. JSON session persistence
5. markdown + JSON decision persistence
6. clarification answer ingestion
7. reopen from signal file

## Example Session File

```json
{
  "session_id": "SESS-001",
  "workflow_id": "aidlc",
  "organization_id": "product-team",
  "status": "waiting_user",
  "trigger": {
    "trigger_id": "TRG-001",
    "trigger_type": "cli",
    "received_at": "2026-05-31T16:30:00+09:00",
    "request_payload": "初回離脱率を下げたい"
  },
  "current_stage": "clarification",
  "routing_mode": "deep-path",
  "context_snapshot_id": "CTX-001",
  "open_decision_ids": [],
  "closed_decision_ids": [],
  "created_at": "2026-05-31T16:30:00+09:00",
  "updated_at": "2026-05-31T16:31:20+09:00"
}
```
