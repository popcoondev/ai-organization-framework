# AI Orchestrator Role

AI Organization Framework における `AI Orchestrator` の役割仕様。

## Position

`AI Orchestrator` は Human と worker threads の間に立つ first-class actor である。  
Council seat そのものではなく、state, routing, aggregation, and human-facing synthesis を担う。

`v1.7` では AOF の組織を次の 3 層で読む。

1. Human
2. AI Orchestrator
3. worker threads

## Responsibilities

最低限、次を担う。

1. Human request を `Need / Intent / Context` に変換する
2. `North Star Goal / Current Operating Goal / Next Value Slice` を維持する
3. `Value Alignment Loop` と repeated confirmation を運用する
4. phase に応じて child threads を起動、監視、終了する
5. child thread の出力を統合して human-readable summary を作る
6. canonical decision artifact と session state を更新する
7. `alignment pulse` のタイミングで Human に再確認を求める
8. mismatch, escalation, partial failure を Human が読める粒度に要約する

## Non-Responsibilities

次は持たない。

1. final human approval の代替
2. Human 合意なしの `North Star Goal` 変更
3. Guardian veto の無効化
4. Council seat の独立判断を偽装すること
5. child thread 間の無制限な相互参照を許すこと

## Human Relationship

Human は `approval / review only` の存在ではない。  
少なくとも次の役割を持つ。

1. final authority
2. alignment owner
3. North Star Goal の変更合意者
4. high-risk decision の escalation authority

Orchestrator は Human を飛ばしてこれらを確定してはならない。

## Worker Thread Relationship

worker threads は task-local reasoning を担う。  
例:

- Council seat threads
- Discovery scouts
- Slice builders
- Experience Steward

Orchestrator は thread を統治するが、thread-local judgment を事前に上書きしてはならない。  
統合は thread 完了後に行う。

## Required Outputs

Orchestrator は最低限、次を human-facing artifact として出せる必要がある。

1. current goal layers
2. current topology
3. child thread roster
4. open mismatches
5. next human decision request
6. aggregated rationale

## Failure Handling Boundary

child thread failure が起きたとき、Orchestrator は最低限次を行う。

1. failure を session state に記録する
2. partial completion の有無を判定する
3. abandoned child session を close するか retry 候補に残す
4. Human へ影響を要約して提示する

## Runtime Claim

`AI Orchestrator` を first-class に運用する案件では、`runtime` の価値が高い。  
理由は次の通り。

1. child session relationship を保持する必要がある
2. repeated confirmation window を持ち回る必要がある
3. mismatch / escalation / partial failure を state として残す必要がある
4. aggregated decision trace を後から読める必要がある
