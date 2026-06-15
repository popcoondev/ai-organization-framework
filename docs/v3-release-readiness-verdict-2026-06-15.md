# AOF v3.x Release Readiness Verdict

Date: `2026-06-15`

## Verdict

**新しい release tag はまだ切らない。**

理由は、既存の `v3.0.x` runtime baseline は green だが、2026-06-15 に追加した 2 つの benchmark がまだ
**definition / policy / partial enforcement** の段階にあり、
**operationalized benchmark pass evidence** までは揃っていないためである。

## What Is Green

次は確認済みである。

- `main` branch history and refs are repaired
- orchestrator runtime provenance guard is implemented
- `organization-verify --project .` is green
- `organization-audit --project .` is green
- `Node 22.22.3` laneで `141 / 141` tests are green

このため、
**runtime discipline enforcement の土台実装** は成立している。

## What Is Not Yet Release-Ready

### 1. Review Validity Benchmark Is Not Operationalized Yet

`docs/v3-review-validity-benchmark.md` は benchmark definition として妥当だが、
次の release gate evidence がまだない。

- intentionally weak artifact set
- human-low / ai-high conflict case set
- benchmark pass / fail artifact recording flow
- showcase / deck / proposal review に対する再評価結果

したがって、
**「AI が人間品質に対して false positive を出さない」**
ことはまだ release-grade に証明されていない。

### 2. Orchestrator Runtime Discipline Benchmark Is Only Partially Operationalized

`docs/v3-orchestrator-runtime-discipline-benchmark.md` に対して、次は入った。

- orchestrator-origin task に `orchestrator_session_id` を要求
- execution artifacts に `source_task_id` / `source_parent_session_id` を要求
- `organization-verify` で provenance drift を fail できる

ただし次はまだ未完了である。

- prose-only orchestration benchmark artifact set
- partial-runtime-use benchmark artifact set
- green claim integrity の専用 benchmark record
- human audit challenge を reusable case として回す surface

したがって、
**「runtime bypass を benchmark として体系的に再現・採点できる」**
段階にはまだ達していない。

## Release Decision

現時点では次の判断とする。

- `v3.0.2`: まだ切らない
- `v3.1.0`: まだ切らない

次のどちらかが揃ったタイミングで release 候補に戻す。

1. review-validity benchmark artifact set と pass/fail evidence が repo に固定される
2. runtime-discipline benchmark artifact set と reusable verification path が repo に固定される

## Required Next Slice

release の前にやるべき次の value slice はこれである。

1. `TASK-029` を benchmark artifact set / verdict artifact / evaluation path まで進める
2. `TASK-030` を prose-only / partial-runtime benchmark case と verification path まで進める
3. 上の 2 系統を self-hosting benchmark として 1 回回し、pass/fail evidence を記録する

## Short Form

現状は

- baseline runtime: green
- benchmark definitions: green
- benchmark operationalization: not yet green

である。

よって、
**いまは version を切るより benchmark を完成させる段階** と判定する。
