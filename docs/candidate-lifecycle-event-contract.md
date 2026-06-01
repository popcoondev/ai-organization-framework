# Candidate Lifecycle Event Contract

`candidate lifecycle` を partial runtime の最初の導入対象として使うときの、AOF 側の最小 event contract。

この文書の役割は 2 つある。

1. `candidate_generated / selected / published` を AOF の抽象イベントとして固定する
2. その event から `status / timeline / flow` をどう投影するかを定義する

## Scope

この contract はプロダクト固有の payload schema を定義しない。  
定義するのは、AOF runtime が最低限記録すべき event fields だけである。

ゲーム実例では、これが `日替わり観測候補` の運用に相当する。

## Event Types

最小 event type は次の 3 つとする。

- `candidate_generated`
- `candidate_selected`
- `candidate_published`

必要なら将来、

- `candidate_withdrawn`
- `candidate_replaced`

を足せるが、初回導入では必須ではない。

## Minimum Event Fields

各 event は最低限次を持つ。

- `event_type`
  - 上記 3 種のどれか
- `at`
  - event timestamp
- `owner`
  - event の責任主体
- `operating_goal`
  - その時点の goal
- `candidate_ref`
  - 候補を一意に指す参照
- `rationale`
  - なぜその判断になったか
- `source_refs`
  - 何を根拠にしたか
- `next_checkpoint`
  - 次に何を確認するか
- `usage_level`
  - `framing only / partial runtime / runtime mandatory`

## Event-Specific Expectations

### `candidate_generated`

追加で持つのが望ましいもの:

- `generation_inputs`
- `candidate_set_ref`

意味:

- 候補が生成された
- まだ採択・公開はしていない

### `candidate_selected`

追加で持つのが望ましいもの:

- `selection_rule`
- `selected_from_ref`

意味:

- 複数候補の中から 1 つ以上を採択した
- 次に publish してよい状態になった

### `candidate_published`

追加で持つのが望ましいもの:

- `published_artifact_ref`
- `effective_window`

意味:

- 候補が外部公開対象になった
- 運用側の current state が更新された

## Human Visibility Projections

この contract は内部ログのためだけにあるのではなく、  
人間が current state を理解するための 3 投影を支える。

### 1. Status View

status では次を表示できること。

- current phase
  - generated / selected / published
- current operating goal
- current owner
- current usage level
- latest candidate ref
- next checkpoint

### 2. Timeline View

timeline では各 event ごとに次を読めること。

- when
- who
- what happened
- why it happened
- what became next

読み替え例:

- `candidate_generated`
  - 候補群が生成された
- `candidate_selected`
  - 採択候補が決まった
- `candidate_published`
  - 現在の公開候補が切り替わった

### 3. Flow View

flow では次を表せること。

- `candidate_generated -> candidate_selected -> candidate_published`
- 差し戻しや置き換えがあれば途中に分岐を置ける
- current position marker を置ける

## Static vs Runtime-Used Reading

この contract に沿った event が無ければ、その対象は `runtime-used AOF` ではなく `static AOF` と読む。

逆に、最低限 1 セットでも

- `candidate_generated`
- `candidate_selected`
- `candidate_published`

があり、rationale と next checkpoint が残っていれば、  
その対象は `partial runtime` の evidence を持つと言える。

## Minimal Example

```yaml
event_type: candidate_selected
at: 2026-06-01T09:00:00Z
owner: Facilitator
operating_goal: choose today's featured observation
candidate_ref: obs-2026-06-01-cave-01
rationale: strongest novelty and low repetition versus recent picks
source_refs:
  - candidate-set-2026-06-01
  - repetition-check-2026-06-01
next_checkpoint: verify publish artifact before 10:00 JST
usage_level: partial runtime
selection_rule: novelty-first with repetition guard
selected_from_ref: candidate-set-2026-06-01
```

