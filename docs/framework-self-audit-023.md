# Framework Self-Audit 023

- Date: `2026-06-03`
- Scope: `post-cadence-dispatch review hardening`
- Related task: `TASK-005`

## Summary

The cadence dispatch review findings around CI churn and untriaged open tasks have been addressed.

## What improved

- `.aof/`-only cadence commits no longer trigger the full CI workflow.
- `cadence-dispatch` now writes more informative commit messages:
  - `dispatch=<state>`
  - `tick=<state>`
- cadence workflow commits now stage only cadence-relevant AOF paths:
  - `.aof/context/active`
  - `.aof/goals`
  - `.aof/tasks`
- `cancel-in-progress` is now `true` for the cadence workflow.
- cadence no-follow-through paths now stamp open tasks as triaged, so a newly opened task does not keep the scheduler in perpetual `due-now`.

## Remaining gap

Cadence timing, dispatch state, and scheduler profile are still operator-facing only through raw `.aof/` artifacts.

## Next action

Surface cadence timing, dispatch state, and scheduler profile through the existing human visibility contract.
