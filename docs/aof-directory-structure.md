# AOF Directory Structure

AI Organization Framework における `.aof/` の canonical directory structure。

## Position

`v1.8` では `.aof/` を task memory, goal projection, context archive, and prompt template の  
統一配置として扱う。

## Canonical Layout

```text
.aof/
  sessions/
  decisions/
  context/
    active/
    summaries/
    snapshots/
    archive/
    threads/
  tasks/
    open/
    assigned/
    done/
    archived/
    retired/
  prompts/
    orchestrator/
    council/
    discovery/
    steward/
  goals/
    north-star.json
    operating-goal.json
    next-value-slice.json
```

## Directory Meanings

### `sessions/`

- runtime session state
- orchestrator / child session relationship

### `decisions/`

- canonical decision records
- human-approved or accepted decision artifacts

### `context/active/`

- current decision に直接必要な context
- `recent-confirmation-window.json` などの active alignment memory
- `alignment-pulse.json`, `framework-self-audit.json`, `retire-candidate-review.json` のような current cadence artifacts

### `context/summaries/`

- compaction 済み要約

### `context/snapshots/`

- rollback / reproducibility 用 point-in-time state

### `context/archive/`

- 古い context / raw evidence / obsolete material

### `context/threads/`

- thread-local intermediate outputs
- council draft evaluations
- discovery scout outputs
- experience steward notes

thread 完了後は Archivist が archive 側へ整理してよい。

### `tasks/`

- AOF-native task ledger
- `open / assigned / done / archived / retired`

### `prompts/`

- versioned templates only
- runtime-generated prompt expansion はここに混ぜない

### `goals/`

- `North Star Goal`
- `Current Operating Goal`
- `Next Value Slice`

の projection files。

## Projection Rule

`goals/` は canonical source ではなく **projection** である。  
canonical authority は引き続き Orchestrator / session-side ownership にある。

## Repository Placement Rule

`.aof/` の repository placement は topology-dependent である。

- self-hosting topology:
  - `.aof/` may live and update on repository `main`
- managed-project topology:
  - `.aof/` should not default to direct writes on product `main`
  - prefer `aof/state` branch or equivalent separated state channel

GitHub / branch strategy の正本は [github-operations-model.md](./github-operations-model.md) を参照する。

## Retention Guidance

### Keep Active

- current sessions
- active context
- open / assigned tasks
- current goal projections

### Compress

- done sessions
- stale active context
- finished thread outputs

### Archive

- done tasks no longer needed for day-to-day review
- old thread outputs
- superseded summaries

### Retire

- tasks explicitly dropped
- abandoned directions with decision rationale

## Framing-Only Minimum Shape

`framing-only` でも `.aof/` を全廃する必要はない。  
minimum shape は次でよい。

```text
.aof/
  decisions/
  tasks/open/
  goals/
```

ただし repeated confirmation や orchestration を強く使うなら、  
`sessions/` と `context/` を使う方が自然になる。
