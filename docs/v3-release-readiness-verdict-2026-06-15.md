# AOF v3.x Release Readiness Verdict

Date: `2026-06-15`

## Verdict

**新しい release tag はまだ切らない。**

理由は、既存の `v3.0.x` runtime baseline は green で、benchmark surfaces も operationalized されてきたが、
`v3.1.0` の release gate を閉じるには
**broader family coverage と final release alignment**
がまだ不足しているためである。

## What Is Green

次は確認済みである。

- `main` branch history and refs are repaired
- orchestrator runtime provenance guard is implemented
- `organization-verify --project .` is green
- `organization-audit --project .` is green
- `Node 22.22.3` laneで `143 / 143` tests are green
- runtime proof is recorded across `fast-track` and `deep-path` families
- runtime coverage now has explicit framing / allocation family registers and stage-to-benchmark mapping

このため、
**runtime discipline enforcement の土台実装** と
**single-family 依存を避ける release honesty surface** は成立している。

## What Is Not Yet Release-Ready

### 1. Benchmark Scope Is Broad Enough, But Release Metadata Is Still Not Aligned

`review-validity` は family register により `TASK-035` を閉じ、
`runtime-discipline` も audit shortcut と family register により `TASK-036` を閉じた。

したがって benchmark 側の主ブロッカーは解消されている。  
ただし release としては次がまだ未完了である。

- final candidate commit SHA を release tag に固定すること
- candidate tag と changelog / release definition の最終整列

## Release Decision

現時点では次の判断とする。

- `v3.0.2`: まだ切らない
- `v3.1.0`: まだ切らない

次の条件が揃ったタイミングで release 候補に戻す。

1. review-validity benchmark artifact set と pass/fail evidence が repo に固定される
2. runtime-discipline benchmark artifact set と reusable verification path が repo に固定される
3. final candidate commit SHA と release surface が `v3.1.0` 候補に揃う

## Required Next Slice

release の前にやるべき次の value slice はこれである。

1. final candidate commit に対して release tag を記録する
2. taggable かどうかを latest evidence refs で最終確認する

## Short Form

現状は

- baseline runtime: green
- benchmark definitions: green
- benchmark operationalization: green for the claimed `v3.1.0` benchmark scope
- release metadata alignment: not yet complete

である。

よって、
**いまは version を切るより benchmark を完成させる段階** と判定する。
