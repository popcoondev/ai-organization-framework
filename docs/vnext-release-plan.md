# Next Release Plan

## Proposed Version

`v4.0.0`

## Release Theme

The next release should introduce a governed visibility architecture, visual grammar, and plugin boundary above the shipped `v3.9.0` operator progress surface.

`v3.9.0` made the current answer, progress, branch position, proof path, and viewer reachability truthful.  
Running that runtime after release exposes the next operator bottleneck:

- the operator can now get the right answer and supporting proof
- but the surface still lacks an explicit visual grammar
- layout responsibilities and extension boundaries are not yet first-class
- a richer viewer alone would not solve this if it becomes an ungoverned pile of surfaces

This means the next release should not begin with broader analytics.  
It should first make the operator surface intentionally designed and governable.

## Runtime Evidence Basis

Direction-setting runtime evidence:

- release: `v3.9.0`
- completed implementation task: `.aof/tasks/done/TASK-045.json`
- current open frontier task: `.aof/tasks/open/TASK-046.json`
- current operating goal: `.aof/goals/operating-goal.json`
- current next value slice: `.aof/goals/next-value-slice.json`
- current mission surface: `.aof/artifacts/visibility/current/mission-control.json`
- current diagnosis surface: `.aof/artifacts/visibility/current/operator-brief.json`

## Required Outcomes

Required:

- the runtime defines a visual grammar for `Now`, `Progress`, `Tree`, and `Proof`
- the viewer layout has explicit responsibilities and hierarchy
- extension or plugin boundaries for future visibility work are explicit
- the operator can tell which surfaces are canonical and which are additive
- the visibility product contract stays derived from canonical runtime artifacts

Deferred:

- broader organization analytics expansion
- live role-state and council-state views
- decorative visibility work
- new execution authority or autonomy claims

## Release Gates

### Gate 1: Visual Grammar Exists

- the runtime defines first-class operator surface responsibilities
- the viewer hierarchy is explicit and repeatable

### Gate 2: Layout Contract Exists

- the main viewer sections have explicit layout and information-density rules
- the release makes progress, branch position, and proof easier to scan than in v3.9

### Gate 3: Extension Boundary Exists

- plugin or extension boundaries for future visibility work are explicit
- the canonical surface remains clear when extensions exist

### Gate 4: Truth Boundary Stays Honest

- no new authority is introduced
- discovery and Need Validation boundaries remain unchanged
- visibility grammar remains backend-neutral and artifact-derived

## Current Recommendation

Proceed with the next narrow release:

- `v4.0.0 = visibil