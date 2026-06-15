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

### 1. Review Validity Benchmark Still Needs Broader Family Coverage

`review-validity` は baseline-complete まで進み、`RV-002` は
escalation-reopen / weak-artifact reopen / signal-reopen の
複数 runtime-generated family を持つ。

ただし次はまだ未完了である。

- broader weak-artifact families
- broader human disconfirmation artifact diversity
- `TASK-035` を閉じるだけの追加 recorded verdict coverage

したがって、
**「AI が人間品質に対して false positive を出さない」**
ことはまだ release-grade に証明されていない。

### 2. Orchestrator Runtime Discipline Benchmark Still Needs Broader Automation

`runtime-discipline` は baseline-complete を超えて、次まで進んでいる。

- prose-only / partial-runtime negative traces
- 3 つの replayable `RD-002` broken-chain families
- machine-readable audit note / packet / reconstruction map / audit index / audit gate
- latest positive path の one-command replay

ただし次はまだ未完了である。

- broader audit automation beyond the current generated gate artifacts
- tighter cost reduction for human audit
- `TASK-036` を閉じるだけの lower-cost audit path expansion

したがって、
**「runtime bypass を benchmark として体系的に再現・採点できる」**
surface はできているが、まだ release-grade fully complete とは言えない。

## Release Decision

現時点では次の判断とする。

- `v3.0.2`: まだ切らない
- `v3.1.0`: まだ切らない

次の条件が揃ったタイミングで release 候補に戻す。

1. review-validity benchmark artifact set と pass/fail evidence が repo に固定される
2. runtime-discipline benchmark artifact set と reusable verification path が repo に固定される
3. package metadata, release notes, and final verification snapshot が `v3.1.0` 候補に揃う

## Required Next Slice

release の前にやるべき次の value slice はこれである。

1. `TASK-029` を benchmark artifact set / verdict artifact / evaluation path まで進める
2. `TASK-030` を prose-only / partial-runtime benchmark case と verification path まで進める
3. `TASK-035` と `TASK-036` を閉じるだけの broader recorded evidence を追加する
4. candidate commit に対して release metadata と final verification snapshot を揃える

## Short Form

現状は

- baseline runtime: green
- benchmark definitions: green
- benchmark operationalization: mostly green, but broader family coverage is not yet complete

である。

よって、
**いまは version を切るより benchmark を完成させる段階** と判定する。
