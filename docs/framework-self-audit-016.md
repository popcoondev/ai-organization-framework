# Framework Self-Audit 016

- Recorded at: `2026-06-03`
- Scope: `post-cadence cycle review`
- Result state: `active`

## Summary

`cadence-cycle` can now self-start cadence processing when timing says `due-now`, and it can defer cleanly when timing says `not-due`.

## What Improved

1. The runtime now has a single command that can:
   - evaluate cadence timing
   - start cadence tick automatically when due
   - record a defer decision when not due
2. `cadence-cycle.json` makes the self-start decision itself auditable.
3. The remaining self-start gap is now outside the runtime loop itself.

## Remaining Gap

Cadence still depends on an external caller or scheduler to invoke `cadence-cycle` at all.

## Next Action

Keep `TASK-004` focused on external scheduling vs deeper self-start automation.
