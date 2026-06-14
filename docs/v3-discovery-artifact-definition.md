# AOF Discovery Artifact Definition

Date: `2026-06-14`

この文書は、Discovery Layer を AOF artifact として扱うための最小定義を置く。

## Position

Discovery を AOF に取り込む場合、最初に必要なのは role 追加ではない。  
必要なのは、探索活動を reviewable で handoff 可能な artifact にすることである。

同時に、Discovery は delivery より柔らかく扱う必要がある。  
標準化の対象は creativity そのものではなく、問い、判断、handoff の痕跡である。

したがって最初の標準化対象は次の 5 つである。

- Discovery Question Set
- Breakthrough Pattern Record
- Assumption Map
- Anomaly Log
- Discovery Judgment Packet
- Discovery-to-Delivery Handoff Packet

## Flexibility Rule

Discovery artifact は provisional なままでよい。

- 問いは途中で差し替わってよい
- 仮説は棄却されてよい
- anomaly は未解決のまま保持してよい
- artifact の目的は収束強制ではなく exploration trace の保持である

厳格に保つべきなのは次である。

- 何を発見しようとしていたか
- 何を見つけたか
- 何を捨てたか
- 何を delivery に渡したか

## Artifact Set

### 1. Discovery Question Set

Schema:

- `schemas/aof-discovery-question-set.schema.json`

Purpose:

- Discovery が最初に答えるべき問いではなく、最初に追うべき問い群を定義する

Minimum content:

- discovery objective
- key questions
- target assumptions
- target anomalies
- target user or market slice
- stop / continue / pivot signals

### 2. Breakthrough Pattern Record

Schema:

- `schemas/aof-breakthrough-pattern-record.schema.json`

Purpose:

- 歴史的・異分野的 breakthrough の発生条件を reusable pattern として保持する

Minimum content:

- source domain
- triggering tension
- broken assumption
- enabling tool or method
- transfer hypothesis
- expected relevance

Operator surface:

- `aof breakthrough-library-register`

Breakthrough Pattern Record は記録単位であり、library そのものではない。  
library は複数 record を横断して再利用可能性を見る register / knowledge layer として扱う。

### 3. Assumption Map

Schema:

- `schemas/aof-assumption-map.schema.json`

Purpose:

- Discovery 中に依存している前提を可視化し、どこを検証すべきか明確にする

Minimum content:

- assumption
- assumption type
- confidence
- evidence state
- break-test question

### 4. Anomaly Log

Schema:

- `schemas/aof-anomaly-log.schema.json`

Purpose:

- 例外、違和感、失敗、ノイズを消さずに保持し、探索の方向転換トリガとして扱う

Minimum content:

- observed anomaly
- why it matters
- challenged assumption
- follow-up recommendation

### 5. Discovery Judgment Packet

Schema:

- `schemas/aof-discovery-judgment-packet.schema.json`

Purpose:

- Discovery artifact 群に対して、continue / pivot / handoff / stop の judgment を残す

Minimum content:

- council id
- judgment status
- decision summary
- rationale
- desirability / feasibility / risk assessments
- evidence quality state
- recommended next step
- question-set refs
- artifact refs
- follow-up questions

### 6. Discovery-to-Delivery Handoff Packet

Schema:

- `schemas/aof-discovery-handoff.schema.json`

Purpose:

- Discovery の出力を delivery runtime に正規化して渡す

Minimum content:

- selected need
- intended user or segment
- context summary
- hypothesis
- evidence refs
- rejected alternatives
- explicit risks
- delivery validation requirements
- need
- intent
- context

## Interface Rule

Discovery artifact 群は独立して価値を持ってよいが、AOF の中では最終的に次へ収束しなければならない。

```text
idea
  -> discovery question set
  -> breakthrough / assumption / anomaly artifacts
  -> discovery judgment packet
  -> selected hypothesis
  -> discovery handoff packet
  -> Need / Intent / Context
  -> delivery runtime
```

このルールにより、Discovery Layer は別 framework ではなく、AOF の前段 exploration contract になる。

## Evaluation Rule

Discovery artifact の quality は、完成度だけでなく次で見るべきである。

- どの問いを追うと決めたか
- どの前提が明示されたか
- どの anomaly が保持されたか
- どの breakthrough pattern が transfer 可能か
- continue / pivot / handoff / stop の judgment が trace されているか
- delivery へ渡す need / intent / context が十分に絞られているか

## Completion Rule

Discovery は次のどちらかで閉じる。

- `synthesize-handoff`
  Discovery judgment packet が handoff 可能と判断し、Discovery-to-Delivery Handoff Packet が存在する。
- `stop`
  Discovery judgment packet が探索停止を判断し、停止理由と残課題が残されている。

`continue-exploration` と `pivot` は有効な中間状態だが、完了状態ではない。

## Current Status

この artifact set は最小 write path と schema validation までは current runtime command に接続済みである。

現時点の位置づけ:

- `v3.x` research-track definition
- schema-backed artifact exploration
- future discovery council operating contract candidate
