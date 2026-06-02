# Framework Self-Audit 018

- Date: `2026-06-03`
- Scope: `post-cadence dispatch review`
- Related task: `TASK-004`

## Summary

`cadence-dispatch` now gives AOF a concrete runtime-backed bridge from an external scheduler into `cadence-cycle`. The runtime can already decide whether cadence is due, emit a machine-readable schedule, and now accept a scheduler-triggered dispatch step that either invokes the cadence loop or defers cleanly.

## What improved

- `.aof/context/active/cadence-dispatch.json` is now a first-class artifact.
- External scheduler handoff is now explicit:
  - `cadence-schedule` tells an outside caller whether to invoke now or poll later.
  - `cadence-dispatch` consumes that decision and bridges into `cadence-cycle`.
- Deferred scheduler runs now leave a machine-readable dispatch record instead of relying on informal operator interpretation.

## Remaining gap

Cadence still needs a concrete scheduler binding in real operation, or a deeper self-start automation policy beyond manual dispatch invocation.

## Next action

Formalize how an external scheduler should invoke `cadence-dispatch` in real operation.
