# AOF Post-v3.8 Roadmap

## North Star

AOF should become an AI Organization Operating System that can:

- discover what is worth investigating
- validate what is worth turning into a project
- govern how work is executed
- keep the whole chain auditable across human, AI, and tool work
- explain the current organizational mission in one truthful operator path
- let the operator drill from the current answer into the supporting evidence without reconstructing raw artifact chains by hand

This is the tighter frontier after `v3.8.0`.

## Current Baseline

`v3.8.0` established:

- a bounded runtime situation assessment layer
- a first-class operator briefing packet above that diagnosis layer
- Mission Control alignment with the same runtime truth source
- a primary operator path that no longer depends on a viewer-first workflow

What is still weak after `v3.8.0`:

- the operator can now get the right answer quickly, but still has a weak drill-down path from answer to proof
- the brief can say `why` and `what next`, but it does not yet package a bounded evidence bundle for each claim
- richer observability is still risky unless it stays subordinate to the operator brief instead of replacing it

The next roadmap therefore starts from this question:

> What is the smallest truthful evidence drill-down layer after `v3.8.0` that lets the operator move from the current answer to the supporting proof without falling back to raw artifact reconstruction?

## `v3.9.0`: Evidence Drill-Down Layer

Theme:

- turn operator briefing into a bounded answer-to-proof path

Canonical direction basis:

- `TASK-045`
- `.aof/tasks/done/TASK-044.json`
- `.aof/goals/operating-goal.json`
- `.aof/goals/next-value-slice.json`
- `docs/v3.8-release-checklist.md`
- `docs/v3.8.0-release-notes.md`

Required outcomes:

- the runtime emits a bounded evidence drill-down packet tied to the current operator brief
- the operator can inspect why the headline, blockers, and next action are true without reconstructing the whole repo by hand
- drill-down stays derived from canonical runtime artifacts rather than introducing a second operator story
- richer observability remains subordinate to truthful answer compression

Why `v3.9` comes next:

- `v3.8.0` solved compact operator answer compression
- the next friction is now answer-to-proof navigation, not first-order explanation
- the next improvement should stay bounded before broader analytics or decorative observability claims

Deferred from `v3.9`:

- broad organization analytics expansion
- live role-state and council-state dashboards
- ornamental visualization work
- autonomy expansion justified by observability alone

## `v4.x` Candidate Frontier

Potential follow-on direction:

- richer observability and organization analytics only after truthful briefing and truthful drill-down are both proven

This is not yet a committed release claim.  
It only becomes credible after `v3.9.0` proves that:

- the operator can move from answer to evidence without raw reconstruction
- drill-down remains artifact-derived and bounded
- observability stays subordinate to truthful operator judgment

## Boundary Rules

The roadmap should continue to preserve these rules:

- Discovery does not directly authorize project creation.
- Need Validation remains the mandatory pre-project gate.
- visibility layers must derive from canonical artifacts rather than become a second source of truth
- operator briefing and drill-down logic must derive from canonical artifacts rather than handwritten overrides
- backend-neutrality remains the default product position
- autonomy claims must trail artifact proof, not lead it

## Sequencing Rule

The roadmap should obey this dependency order:

1. truthful release transition before operator briefing compression
2. operator briefing before evidence drill-down
3. evidence drill-down before richer observability
4. observability before broader operator judgment claims
5. judgment support before autonomy expansion

## Current Recommendation

Proceed with the following interpretation:

- `v3.7.0` = runtime situation assessment and roadmap truthfulness
- `v3.8.0` = operator briefing layer above situation assessment
- `v3.9.0` = evidence drill-down layer below the operator brief
- `v4.x` = richer observability only after truthful diagnosis, truthful briefing, and truthful drill-down are all proven
