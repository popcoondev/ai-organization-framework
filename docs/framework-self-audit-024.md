# Framework Self-Audit 024

- Date: `2026-06-03`
- Scope: `post-cadence visibility contract review`

## Summary

Cadence timing, dispatch state, and scheduler profile are now carried by the existing human visibility contract and rendered by `visibility-serve`.

## What Changed

1. `status_card` now allows cadence summary fields.
2. `visibility-serve` derives and renders cadence summary information from the status payload.
3. The self-hosting / managed-project topology split is now documented so the GitHub Actions binding is not misread as the general default.

## Remaining Gap

The remaining gap is no longer viewer rendering. It is producer automation:

- live `.aof/` operating state still needs an automatic projection path into `status_card`, `timeline_feed`, and `flow_snapshot`
- operators should not need a separate manual producer to expose cadence state through the visibility contract

## Next Action

Open `TASK-006` and make visibility output generation read from live `.aof/` operating artifacts directly.
