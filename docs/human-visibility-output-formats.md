# Human Visibility Output Formats

`v1.4` で Human Visibility Layer を viewer 実装なしで成立させるための、最小出力フォーマット定義。

この文書の目的は次の 2 つである。

1. `status / timeline / flow` の最小 projection format を固定する
2. text, JSON, DB のどれを backend に使っても、人間向け表示の shape が一致するようにする

## Scope

この文書が定義するのは表示用 output format である。  
event source そのものの最低契約は [docs/candidate-lifecycle-event-contract.md](./candidate-lifecycle-event-contract.md) を正本とする。

## Output Families

Human Visibility Layer の最小出力は次の 3 系統とする。

1. `status_card`
2. `timeline_feed`
3. `flow_snapshot`

viewer はこの 3 系統から、追加 schema なしで次の derived summary を計算してよい。

- current step index
- completed / remaining step count
- immediate next step
- ordered project plan
- latest decision driver

## 1. Status Card

### Purpose

人間が「今どこにいるか」を 1 画面で把握するための current-state summary。

### Minimum Fields

- `view_type`
  - always `status_card`
- `as_of`
  - this snapshot timestamp
- `usage_level`
  - `framing only / partial runtime / runtime mandatory`
- `current_phase`
- `current_goal`
- `owner`
- `open_signals`
- `next_checkpoint`
- `latest_artifact_ref`
- `runtime_evidence_state`
  - `none / partial / present`

### Minimal JSON Shape

```json
{
  "view_type": "status_card",
  "as_of": "2026-06-01T10:00:00Z",
  "usage_level": "partial runtime",
  "current_phase": "candidate_selected",
  "current_goal": "choose today's featured observation",
  "owner": "Facilitator",
  "open_signals": [],
  "next_checkpoint": "verify publish artifact before 10:00 JST",
  "latest_artifact_ref": "obs-2026-06-01-cave-01",
  "runtime_evidence_state": "present"
}
```

## 2. Timeline Feed

### Purpose

人間が「誰が何を判断して今こうなったのか」を追うための chronological feed。

### Minimum Entry Fields

- `view_type`
  - always `timeline_feed`
- `entries[]`
  - each entry contains:
    - `at`
    - `actor`
    - `event_type`
    - `summary`
    - `rationale`
    - `next`
    - `refs`

### Minimal JSON Shape

```json
{
  "view_type": "timeline_feed",
  "entries": [
    {
      "at": "2026-06-01T09:00:00Z",
      "actor": "Facilitator",
      "event_type": "candidate_selected",
      "summary": "selected today's featured observation",
      "rationale": "strongest novelty and low repetition",
      "next": "verify publish artifact before 10:00 JST",
      "refs": [
        "candidate-set-2026-06-01",
        "obs-2026-06-01-cave-01"
      ]
    }
  ]
}
```

## 3. Flow Snapshot

### Purpose

人間が phase transition と current position をグラフィカルに理解するための graph-oriented snapshot。

### Minimum Fields

- `view_type`
  - always `flow_snapshot`
- `nodes`
- `edges`
- `current_node`
- `open_branches`

### Minimum Node Fields

- `id`
- `label`
- `state`
  - `done / current / pending / diverged`

### Minimum Edge Fields

- `from`
- `to`
- `reason`

### Minimal JSON Shape

```json
{
  "view_type": "flow_snapshot",
  "nodes": [
    { "id": "generated", "label": "candidate_generated", "state": "done" },
    { "id": "selected", "label": "candidate_selected", "state": "current" },
    { "id": "published", "label": "candidate_published", "state": "pending" }
  ],
  "edges": [
    { "from": "generated", "to": "selected", "reason": "selection completed" },
    { "from": "selected", "to": "published", "reason": "publish checkpoint pending" }
  ],
  "current_node": "selected",
  "open_branches": []
}
```

## Runtime Evidence State

`runtime_evidence_state` は次の 3 値に固定する。

- `none`
  - runtime event evidence が無い
- `partial`
  - event はあるが lifecycle が incomplete
- `present`
  - minimum lifecycle evidence が揃っている

この field によって、`static AOF` と `runtime-used AOF` の区別を人間から見て明示する。

## Text And Markdown Projection

UI が無くても、最低限次の markdown block に落とせることを想定する。

### Status Markdown

```md
Current phase: candidate_selected
Current goal: choose today's featured observation
Owner: Facilitator
Open signals: none
Next checkpoint: verify publish artifact before 10:00 JST
Runtime evidence: present
```

### Timeline Markdown

```md
- 2026-06-01T09:00:00Z | Facilitator | candidate_selected
  Why: strongest novelty and low repetition
  Next: verify publish artifact before 10:00 JST
```

### Flow Markdown

```md
candidate_generated -> candidate_selected -> candidate_published
current: candidate_selected
```

## Conformance Rule

Human Visibility Layer を主張するには、最低限

- `status_card`
- `timeline_feed`
- `flow_snapshot`

の 3 系統を、この文書の最小 shape に沿って出力できること。
