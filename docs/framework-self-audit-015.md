# Framework Self-Audit 015

- Recorded at: `2026-06-03`
- Scope: `post-cadence timing review`
- Result state: `active`

## Summary

Cadence timing is now a first-class runtime surface with `due-now` vs `not-due` evaluation.

## What Improved

1. The runtime can now distinguish:
   - cadence is fresh enough
   - cadence should run now
2. `cadence-tick` no longer only reports follow-through state; it also reports timing state.
3. `cadence-timing.json` gives the operator and Orchestrator one place to read cadence freshness.

## Remaining Gap

Cadence still does not self-start on its own schedule, even though `due-now` is now runtime-visible.

## Next Action

Keep `TASK-004` focused on self-start policy now that cadence timing is runtime-visible.
