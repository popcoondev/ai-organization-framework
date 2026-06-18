# AOF Post-v3.7 Roadmap

## North Star

AOF should become an AI Organization Operating System that can:

- discover what is worth investigating
- validate what is worth turning into a project
- govern how work is executed
- keep the whole chain auditable across human, AI, and tool work
- make the current organizational mission legible without reconstructing raw artifact chains by hand

This is not a reset of the earlier North Star.  
It is the tighter frontier after `v3.7.0`.

## Current Baseline

`v3.7.0` established:

- a bounded runtime situation assessment layer
- current frontier diagnosis tied to the active release baseline
- roadmap guidance derived from active release truth and live frontier state
- Mission Control alignment through the same runtime judgment path
- a self-hosting runtime that no longer treats shipped `v3.7.0` work as current work

What is still weak after `v3.7.0`:

- the operator still needs a more compact answer surface than a visibility viewer
- situation judgment exists, but the best operator explanation is still spread across commands and artifacts
- the runtime can diagnose truth conflicts, but it still does not package the answer as a concise operating brief
- the next frontier should explain not only what changed, but why it matters and what to do next in one operator-native packet

The next roadmap therefore starts from this question:

> What is the smallest truthful operator briefing layer after `v3.7.0` that explains the current situation, why it is the current situation, and what should happen next without falling back to a viewer-first workflow?

## `v3.8.0`: Operator Briefing Layer

Theme:

- turn runtime situation assessment into a compact operator answer surface

Canonical direction basis:

- `TASK-044`
- `.aof/tasks/done/TASK-043.json`
- `.aof/goals/operating-goal.json`
- `.aof/goals/next-value-slice.json`
- `docs/v3.7-release-checklist.md`
- `docs/v3.7.0-release-notes.md`

Required outcomes:

- the runtime emits an operator-facing briefing packet that answers:
  - what is happening now
  - why that is the current state
  - what is blocked
  - what should happen next
- the briefing packet is derived from situation assessment and other canonical artifacts rather than becoming a second truth source
- operator-critical status can be understood without depending on the viewer as the primary path
- roadmap guidance and recommended action stay aligned with the same frontier the briefing packet describes

Why `v3.8` comes next:

- `v3.7.0` solved stale post-release guidance
- the remaining friction is now operator comprehension, not stale truth
- the next improvement should package runtime judgment into a tighter answer surface before any broader analytics or ornamentation work

Deferred from `v3.8`:

- richer role-state or council-state visual layers
- broader organization analytics claims
- autonomy expansion driven by partially explained state
- ornamental visualization work beyond the existing Mission Control slice

## `v3.9.x` Candidate Frontier

Potential follow-on direction:

- richer observability and organization analytics only after operator briefing becomes truthful and compact

This is not yet a committed release claim.  
It only becomes credible after `v3.8.0` proves that:

- the operator can understand the current situation without reconstructing multiple command outputs
- situation judgment and recommended action are compressed into one truthful brief
- briefing remains derived from canonical runtime artifacts

Possible later themes:

- role-state and council-state views where the runtime has truthful derivation
- broader organization analytics surfaces
- outcome and learning-loop trace compression

## Boundary Rules

The roadmap should continue to preserve these rules:

- Discovery does not directly authorize project creation.
- Need Validation remains the mandatory pre-project gate.
- visibility layers must derive from canonical artifacts rather than become a second source of truth
- operator briefing logic must derive from canonical artifacts rather than handwritten operator overrides
- backend-neutrality remains the default product position
- autonomy claims must trail artifact proof, not lead it

Minimum future requirement:

- operators should be able to trust that the current release frontier is the real one after a release ships
- operator briefing must stay additive to the current runtime rather than replacing governed artifact contracts
- explanation quality should improve before broader automation claims

## Sequencing Rule

The roadmap should obey this dependency order:

1. truthful release transition before operator briefing compression
2. operator briefing before richer observability
3. observability before broader operator judgment claims
4. judgment support before autonomy expansion

If a proposed feature breaks this order, it likely belongs in a later release.

## Current Recommendation

Proceed with the following interpretation:

- `v3.6.0` = bounded Mission Control visibility layer
- `v3.7.0` = runtime situation assessment and roadmap truthfulness
- `v3.8.0` = operator briefing layer above situation assessment
- `v3.9.x` = richer observability only after truthful diagnosis and truthful operator briefing are both proven

This is the fastest path that preserves consistency with:

- `v3.2.0` Need Validation gate
- `v3.3.0` discovery evidence contract
- `v3.4.0` release-state truthfulness
- `v3.5.0` command-routing truthfulness
- `v3.6.0` Mission Control visibility truthfulness
- `v3.7.0` runtime situation assessment truthfulness
