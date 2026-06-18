# AOF Post-v3.9 Roadmap

## North Star

AOF should become an AI Organization Operating System that can:

- discover what is worth investigating
- validate what is worth turning into a project
- govern how work is executed
- keep the whole chain auditable across human, AI, and tool work
- explain the current organizational mission in one truthful operator path
- let the operator drill from the current answer into the supporting evidence without reconstructing raw artifact chains by hand

This is the tighter frontier after `v3.9.0`.

## Current Baseline

`v3.9.0` established:

- a bounded runtime situation assessment layer
- a first-class operator briefing packet above that diagnosis layer
- bounded operator progress, tree-position, and evidence drill-down packets
- a viewer-session path that can be reached from one runtime command

What is still weak after `v3.9.0`:

- the viewer now exposes more truth, but its visual grammar is still implicit
- layout responsibility between `Now`, `Progress`, `Tree`, and `Proof` is still under-specified
- plugin or extension boundaries for future visibility work are still ad hoc
- richer observability is still risky unless the product contract for operator surfaces is made explicit

The next roadmap therefore starts from this question:

> What is the smallest governed layer after `v3.9.0` that makes the operator surface feel intentionally designed rather than merely truthful?

## `v4.0.0`: Visibility Architecture, Visual Grammar, And Plugin Boundary

Theme:

- turn the shipped `v3.9.0` surfaces into a governed product contract
- define visual grammar, layout responsibility, and extension boundaries before broader visibility growth

Canonical direction basis:

- `TASK-046`
- `.aof/tasks/done/TASK-045.json`
- `.aof/goals/operating-goal.json`
- `.aof/goals/next-value-slice.json`
- `docs/v3.9-release-checklist.md`
- `docs/v3.9.0-release-notes.md`

Required outcomes:

- the runtime defines a first-class visual grammar for operator surfaces
- each viewer section has an explicit responsibility and layout contract
- extension and plugin boundaries for future visibility work are explicit
- the operator can tell which surface is canonical, additive, optional, or extensible
- broader visibility growth stays subordinate to truthful runtime artifacts

Why `v4.0` comes next:

- `v3.9.0` solved truthful progress, tree, proof, and session reachability
- the next friction is no longer missing truth but missing product grammar
- the next improvement should stay bounded before broader analytics or decorative visibility claims

Deferred from `v4.0`:

- broad organization analytics expansion
- live role-state and council-state dashboards
- ornamental visualization work
- autonomy expansion justified by observability alone

## `v5.x` Candidate Frontier

Potential follow-on direction:

- richer observability and organization analytics only after truthful visibility grammar is also proven

This is not yet a committed release claim.  
It only becomes credible after `v4.0.0` proves that:

- the operator surface has an explicit grammar and hierarchy
- plugins or extensions can be added without eroding canonical truth
- visibility growth remains subordinate to truthful operator judgment

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
3. evidence drill-down and bounded progress before visibility grammar
4. visibility grammar before richer observability
5. observability before broader operator judgment claims
6. judgment support before autonomy expansion

## Current Recommendation

Proceed with the following interpretation:

- `v3.7.0` = runtime situation assessment and roadmap truthfulness
- `v3.8.0` = operator briefing layer above situation assessment
- `v3.9.0` 