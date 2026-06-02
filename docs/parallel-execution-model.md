# Parallel Execution Model

AI Organization Framework における `v1.7` の parallel execution model。

## Position

`parallel` は first-class execution option だが、`independent` と同義ではない。  
`execution topology` と `independence strength` は別に扱う。

また、並列実行は Human を外すことを意味しない。  
Human-facing clarification と final decision は centralized でよい。

## Phase Rules

| phase | parallelism | reading |
|---|---|---|
| Discovery | conditional parallel | domain が独立していれば複数 scout を起動してよい |
| Goal Layer Setting | sequential required | 共有錨なので確定前に分岐しない |
| Value Alignment Loop | sequential required | Human への問いは Orchestrator が一元化する |
| Clarification | orchestrator-direct | child thread を直接 Human に接続しない |
| Planning | conditional parallel | technical / governance / experience planning を分けてよい |
| Build + Experience Steward | parallel allowed | Builder と Steward を同時に走らせてよい |
| Experience Validation | conditional parallel | fidelity axis ごとに分離してよい |
| Council Review | parallel allowed | Visionary / Builder / Guardian を独立 session で回してよい |
| Human Decision | sequential required | 集約後の decision point は 1 点に保つ |

## Clarification Rule

`Clarification` は actor ではなく phase として扱う。  
質問設計は Orchestrator が行い、child thread の判断は内部で集約する。

つまり:

1. worker thread は clarification question を Human に直接投げない
2. Orchestrator が human-facing question set を設計する
3. clarification answer の canonical write は Orchestrator が行う

## Experience Steward Rule

`Experience Steward` は Builder と並列起動してよい。  
ただし通信は Orchestrator 経由とする。

既定:

1. Builder 完了後、Orchestrator が成果物を Steward に渡す
2. clarification request が必要なら、Orchestrator が途中スナップショットを渡す
3. Steward は `expectation-mismatch` や fidelity gap を Orchestrator に返す

## Council Thread Boundary

Council thread 間の直接参照は禁止する。  
全通信は Orchestrator 経由とする。

これにより:

1. seat 間の contamination を減らす
2. thread isolation mode を事後に読める
3. disagreement の trace を集約しやすくする

## Independence Strength

並列実行から主張できる独立性は限定的である。

| condition | independence reading |
|---|---|
| same model, same provider, same prompt family | `none` または `partial` |
| same model, isolated prompt packets, no cross-thread visibility | `partial` |
| model diversity or provider diversity + isolation | `stronger-but-not-guaranteed` |

したがって `orchestrated-parallel` であっても、  
同一 model family だけで strong independent disagreement を保証したとは言わない。

## Aggregation Rule

並列 thread の出力は、そのまま canonical decision にならない。  
canonical 化は Orchestrator が行う。

最低限、次を残す。

1. participating threads
2. isolation mode
3. aggregated rationale
4. disagreements if any
5. final human-facing recommendation

## Failure Cases

並列 execution で最低限扱う failure は次である。

1. child failure
2. child timeout
3. partial completion
4. seat disagreement unresolved
5. abandoned child session

これらは `State Ownership Model` の canonical state update rule と一緒に読む。
