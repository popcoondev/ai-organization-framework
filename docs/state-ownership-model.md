# State Ownership Model

AI Organization Framework における `v1.7` の state ownership と aggregation failure handling。

## Position

並列 thread を導入しても、canonical state は 1 つに保つ。  
`AI Orchestrator` は統治と集約を担い、thread-local reasoning を global state に昇格させる条件を管理する。

## Ownership Table

| state | write authority | confirm condition |
|---|---|---|
| `North Star Goal` | Orchestrator | Human との合意後のみ |
| `Current Operating Goal` | Orchestrator | 前 goal 完了判断、または Human 指示後 |
| `Next Value Slice` | Orchestrator | Builder または planning 出力受け取り後 |
| `Recent Confirmation Window` | Orchestrator | confirmation / alignment pulse 後 |
| `Open Mismatch` | Orchestrator | Experience Steward または Human mismatch 判断後 |
| `Clarification Answer Set` | Orchestrator | Human 回答後 |
| `thread-local evaluation` | child thread | thread completion まで local のみ |
| `Decision Record` | Orchestrator | Human approval または explicit acceptance 後 |

## Thread-Local Rule

child thread の途中判断は local であり、他 thread から直接参照しない。  
shared state に上がるのは Orchestrator が集約した後だけである。

## Aggregation Rule

canonical state 更新時、Orchestrator は最低限次を判断する。

1. thread output が final か partial か
2. disagreement があるか
3. Human へそのまま上げるべきか
4. retry / abandon / downgrade のどれか

## Failure Handling

### Child Failure

child failure が起きたら、Orchestrator は次を記録する。

1. failed child session id
2. failure stage
3. failure reason summary
4. impact on canonical goal progression

### Partial Completion

一部 thread だけ完了した場合、Orchestrator は次を決める。

1. partial output で次へ進めるか
2. missing thread を retry するか
3. Human decision が必要か

### Abandoned Child Session

retry しない child session は abandoned として close してよい。  
ただし次を残す。

1. why abandoned
2. whether superseded by another child
3. whether canonical decision ignored or incorporated its partial output

### Aggregation Failure

集約不能な場合は次のいずれかに落とす。

1. human escalation
2. scope downgrade
3. thread rerun with tighter isolation
4. governance path upgrade

## North Star Goal Rule

`North Star Goal` は Orchestrator が保持してよいが、単独で変更してはならない。  
変更には Human との会話上の合意を必要とする。

## Decision Record Rule

thread-local output が canonical decision に昇格した時は、Decision Record に最低限次を残す。

1. execution pattern
2. parallel thread count
3. isolation mode
4. independent seats
5. execution trace refs
