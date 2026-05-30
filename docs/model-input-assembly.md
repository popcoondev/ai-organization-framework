# Model Input Assembly

AI Organization Framework における template/context の model call への注入仕様。

## Conclusion

`.aof/aof.yaml` をそのまま model に読ませるのではなく、runtime が template を正規化し、stage と actor に応じた `Model Input Packet` を組み立てて渡す。

つまり:

1. raw template file を直接 prompt に貼らない
2. runtime が normalized template object を作る
3. actor / stage / session state に応じて必要部分だけを packet 化する

## Why

`aof.yaml` は runtime の entry manifest であって、そのまま model instruction ではない。  
manifest 全文を毎回注入すると、context が肥大化し、role-specific reasoning も弱くなる。

必要なのは file 自体ではなく、次の正規化済み情報である。

- actor identity
- active role or seat
- current workflow stage
- governance scope
- policy priorities
- active context
- relevant artifacts / decisions / signals

## Layer Rule

### Template Loader

template loader は `.aof/aof.yaml` と参照先 component を読み、`Normalized Template` を作る。

### Runtime

runtime は `Normalized Template` と session state から `Model Input Packet` を組み立てる。

### Model Adapter

model adapter は packet を provider-specific prompt / structured input に変換する。

## Normalized Template

runtime が使う normalized object は最低限次を含む。

- `organization`
- `governance`
- `policies`
- `actors`
- `workflow`
- `template_refs`
- `state_paths`

これは model にそのまま渡す object ではない。  
assembly の素材である。

## Model Input Packet

1 回の model call で渡す標準 packet は次とする。

### Metadata

- `session_id`
- `decision_id optional`
- `thread_id optional`
- `stage`
- `call_purpose`

### Actor Frame

- `actor_id`
- `actor_kind`
- `active_role optional`
- `capabilities`
- `policy_profile`

`active_role` の選び方は [docs/stage-role-matrix.md](docs/stage-role-matrix.md) を参照する。

### Governance Frame

- `governance_model`
- `governance_scope`
- `routing_mode optional`
- `decision_rule`
- `veto_rule optional`

### Context Frame

- `need`
- `intent`
- `active_context`
- `context_snapshot_id`
- `clarifications_or_assumptions optional`

### Task Frame

- `request`
- `current_goal`
- `expected_output_kind`

### Evidence Frame

- `relevant_artifacts optional`
- `relevant_decisions optional`
- `relevant_signals optional`

## Assembly Rule

runtime は stage ごとに packet を縮約してよい。  
常に full packet を渡す必要はない。

### Clarification

重視:

- request
- active_context
- missing constraints
- ambiguity markers
- risk-sensitive policy

### Planning / Proposal

重視:

- actor frame
- governance scope
- current goal
- active context
- relevant prior decisions

### Review

重視:

- target proposal summary
- governance rule
- policy priorities
- risk and quality-sensitive evidence

### Outcome Review

重視:

- expected outcome
- observed outcome
- change trigger
- review trigger

## Prompt vs Structured Input

runtime は packet を次の 2 層に分ける。

### Prompt Text

自然言語で伝えるもの:

- task instruction
- role framing
- output expectation
- reasoning constraints

### Structured Input

JSON 等で渡すもの:

- ids
- policy order
- governance fields
- context snapshot reference
- lists of artifacts / decisions / signals

## Injection Timing

template/context の注入は次のタイミングで行う。

1. clarification question generation
2. proposal generation
3. review generation
4. approval recommendation
5. outcome review

## Actor-Specific Assembly

同じ decision でも actor ごとに packet は変わってよい。

例:

- Visionary: value / intent / user meaning を厚く
- Builder: feasibility / constraints / artifacts を厚く
- Guardian: risk / veto basis / failure modes を厚く

stage ごとの primary / participating seat の関係は [docs/stage-role-matrix.md](docs/stage-role-matrix.md) を参照する。

## Context Budget Rule

packet には `Active Context` を優先して入れる。  
summary や archive は必要な部分だけ retrieval する。

raw archive 全文を model に渡してはならない。

## First Prototype Rule

prototype v1 では、最低限次で十分である。

1. one normalized template object
2. one session snapshot
3. one actor frame
4. one stage-specific packet builder

## Example Packet

```json
{
  "session_id": "SESS-001",
  "stage": "clarification",
  "call_purpose": "generate-clarification-questions",
  "actor": {
    "actor_id": "visionary-worker-01",
    "active_role": "Visionary",
    "capabilities": ["product-framing", "requirements-review"],
    "policy_profile": ["value", "quality", "safety", "speed"]
  },
  "governance": {
    "governance_model": "council-of-three",
    "governance_scope": "requirements-approval",
    "decision_rule": "majority-with-guardian-veto"
  },
  "context": {
    "need": "新規ユーザーの継続率を上げたい",
    "intent": "初回導線を簡素化して価値到達までの時間を短縮する",
    "active_context": "モバイル優先、既存認証基盤は変更しない",
    "context_snapshot_id": "CTX-001"
  },
  "task": {
    "request": "初回離脱率を下げたい",
    "current_goal": "need/intent/context を十分に明確化する",
    "expected_output_kind": "clarification-questions"
  }
}
```

## Relation to Issue #21 and #22

この文書は `何を渡すか` を決める。  
`#21` は `誰として回すか`、`#22` は `何を質問するか` を決める論点である。
