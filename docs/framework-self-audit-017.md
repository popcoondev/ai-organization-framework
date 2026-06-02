# Framework Self-Audit 017

- Date: `2026-06-03`
- Scope: `post-cadence schedule review`
- Related task: `TASK-004`

## Summary

`cadence-schedule` now gives the runtime a machine-readable handoff surface for an external scheduler. AOF can already decide whether cadence is due, can self-start `cadence-cycle` once invoked, and can now tell an outside caller whether to invoke immediately or poll later.

## What improved

- `.aof/context/active/cadence-schedule.json` is now a first-class artifact.
- The runtime can emit:
  - `scheduler_state = invoke-now`
  - `scheduler_state = poll-later`
- Poll-later state includes:
  - `recommended_next_check_at`
  - `recommended_next_check_after_hours`
- Cadence-mutating commands now refresh the schedule artifact automatically.

## Remaining gap

The cadence runtime still needs a concrete external scheduler integration, or a deeper policy for when cadence should self-start without relying on an outside caller.

## Next action

Formalize external scheduler integration around `cadence-cycle` now that cadence scheduling guidance is runtime-backed.
