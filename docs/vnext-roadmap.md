# AOF Post-v3.5 Roadmap

## North Star

AOF should become an AI Organization Operating System that can:

- discover what is worth investigating
- validate what is worth turning into a project
- govern how work is executed
- keep the whole chain auditable across human, AI, and tool work
- make the current organizational mission legible without reconstructing raw artifact chains by hand

This is not a reset of the earlier North Star.  
It is the tighter frontier after `v3.5.0`.

## Current Baseline

`v3.5.0` established:

- a canonical command taxonomy for the current CLI surface
- a first-class command registry artifact
- AI recognition-packet routing integration for major operator paths
- a command-routing audit surface
- a more context-efficient operator and AI entry path into the runtime

What is still weak after `v3.5.0`:

- operator visibility still splits mission state across status, timeline, and flow surfaces
- artifact lineage still has to be reconstructed manually on the main operator path
- blockers and recommended next action are still not unified in one truthful mission surface
- visibility tells us more easily what is happening than why it happened or what should happen next

The next roadmap therefore starts from this question:

> What is the smallest truthful visibility upgrade after `v3.5.0` that improves operator judgment without inventing a second source of truth?

## `v3.6.0`: Bounded Mission Control Visibility

Theme:

- turn runtime visibility into a bounded Mission Control surface derived from canonical artifacts

Canonical direction basis:

- `TASK-041`
- `.aof/artifacts/discovery/question-sets/DQS-MQIZCECJ-TU6MBI.json`
- `.aof/artifacts/discovery/assumption-maps/ASM-MQIZCECJ-QE2IVF.json`
- `.aof/artifacts/discovery/anomaly-logs/ANL-MQIZCECJ-0WB7D6.json`
- `.aof/artifacts/discovery/judgments/DJP-MQIZEJC8-LRR4W9.json`
- `.aof/artifacts/discovery/handoffs/DHO-MQIZEYFI-CEDW49.json`
- `.aof/artifacts/need-validation/records/NVR-TASK-041.json`
- `.aof/artifacts/need-validation/project-charters/PCH-TASK-041.json`

Required outcomes:

- one mission overview that shows current mission, release, operating goal, next value slice, and current runtime position
- one artifact graph or equivalent causal chain view that links the current mission state to the upstream runtime artifacts that created it
- blocker visibility that tells the operator what is currently preventing forward movement
- recommended next action visibility derived from canonical runtime state
- truthful composition of existing runtime artifacts rather than handwritten dashboard-only truth
- a narrow Mission Control benchmark that proves stage transition from baseline through implementation-ready

Why `v3.6` comes next:

- `v3.5.0` improved how operators and AI choose commands
- the next observed bottleneck is no longer command routing first
- the next observed bottleneck is mission-level situational awareness across artifact relationships
- the proposal can be implemented as bounded visibility composition without changing Discovery, Need Validation, or execution authority boundaries

Deferred from `v3.6`:

- live role-state or council-state claims that current runtime data cannot support truthfully
- pixel-office or ornamental representation layers
- broader autonomy claims hidden inside visualization work
- a second operator state model outside canonical artifacts

## `v3.7.x` Candidate Frontier

Potential follow-on direction:

- richer organization observability once bounded Mission Control is truthful

This is not yet a committed release claim.  
It only becomes credible after `v3.6.0` proves that:

- operators can navigate current mission state from one surface
- artifact lineage can be derived reliably
- blocker and next-action summaries stay aligned with runtime truth
- Mission Control stage changes can be reproduced from a real runtime chain

Possible later themes:

- role-state and council-state views where the runtime has truthful derivation
- broader organization analytics surfaces
- outcome and learning-loop trace compression

## Boundary Rules

The roadmap should continue to preserve these rules:

- Discovery does not directly authorize project creation.
- Need Validation remains the mandatory pre-project gate.
- visibility layers must derive from canonical artifacts rather than become a second source of truth
- backend-neutrality remains the default product position
- autonomy claims must trail artifact proof, not lead it

Minimum future requirement:

- operators should be able to see what exists, what depends on what, what is blocked, and what should happen next without manually traversing many raw artifacts
- Mission Control must stay additive to the current runtime rather than replacing governed artifact contracts
- visibility upgrades should improve comprehension before they broaden presentation style

## Sequencing Rule

The roadmap should obey this dependency order:

1. truthful state before richer visibility
2. visibility before broader operator judgment claims
3. judgment support before autonomy expansion
4. adaptive improvement only after the operator can inspect the current chain

If a proposed feature breaks this order, it likely belongs in a later release.

## Current Recommendation

Proceed with the following interpretation:

- `v3.5.0` = CLI Context Efficiency Layer
- `v3.6.0` = bounded Mission Control visibility layer
- `v3.7.x` = richer observability only after truthful Mission Control is proven

This is the fastest path that preserves consistency with:

- `v3.2.0` Need Validation gate
- `v3.3.0` discovery evidence contract
- `v3.4.0` release-state truthfulness
- `v3.5.0` command-routing truthfulness
