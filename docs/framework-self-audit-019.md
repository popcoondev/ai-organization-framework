# Framework Self-Audit 019

- Date: `2026-06-03`
- Scope: `post-scheduler binding review`
- Related task: `TASK-004`

## Summary

`cadence-scheduler-binding` now makes the scheduler side of cadence operation machine-readable. AOF can already expose a schedule, accept external dispatch, and now describe concrete binding profiles for cron, GitHub Actions, and an agent loop.

## What improved

- `.aof/context/active/cadence-scheduler-binding.json` is now a first-class artifact.
- The runtime now exposes:
  - a canonical `dispatch_command`
  - a conservative polling interval
  - concrete scheduler profiles for:
    - cron
    - GitHub Actions
    - agent loop
- The binding guidance stays aligned with the current cadence schedule instead of relying on a free-form operator note.

## Remaining gap

Cadence still needs one chosen production scheduler profile, or a deeper autonomous self-start policy beyond explicit external invocation.

## Next action

Choose and formalize the primary production scheduler profile for `cadence-dispatch`.
