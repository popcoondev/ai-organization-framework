# Next Release Plan

## Proposed Version

`v3.9.0`

## Release Theme

The next release should introduce a bounded evidence drill-down layer below the operator briefing surface.

`v3.8.0` made the current answer compact and truthful.  
Running that runtime after release exposes the next operator bottleneck:

- the operator can now get the right answer quickly
- but the shortest path from answer to supporting proof is still weak
- a richer viewer alone would not solve this if it reintroduces reconstruction work

This means the next release should not begin with decorative observability.  
It should first let the runtime produce one bounded answer-to-proof packet that shows why the current brief is true.

## Runtime Evidence Basis

Direction-setting runtime evidence:

- release: `v3.8.0`
- completed implementation task: `.aof/tasks/done/TASK-044.json`
- current open frontier task: `.aof/tasks/open/TASK-045.json`
- current operating goal: `.aof/goals/operating-goal.json`
- current next value slice: `.aof/goals/next-value-slice.json`
- current mission surface: `.aof/artifacts/visibility/current/mission-control.json`
- current diagnosis surface: `.aof/artifacts/visibility/current/operator-brief.json`

## Required Outcomes

Required:

- the runtime emits one bounded evidence drill-down packet tied to the current operator brief
- the packet lets the operator inspect why the current headline, blockers, and next action are true
- the packet stays derived from canonical runtime artifacts and does not become a second truth source
- the drill-down follows the same frontier as the operator brief and situation assessment

Deferred:

- broader organization analytics expansion
- live role-state and council-state views
- decorative observability
- new execution authority or autonomy claims

## Release Gates

### Gate 1: Drill-Down Exists

- the runtime emits one bounded answer-to-proof packet
- the packet includes evidence paths for current headline, blockers, and next action

### Gate 2: Drill-Down Is Truthful

- the drill-down follows the same frontier as operator briefing and situation assessment
- the drill-down does not recommend stale shipped work

### Gate 3: Richer Observability Still Stays Deferred

- the release does not broaden into decorative dashboards before answer-to-proof is solid
- Mission Control remains additive

### Gate 4: Boundaries Stay Honest

- no new authority is introduced
- discovery and Need Validation boundaries remain unchanged
- drill-down remains backend-neutral and artifact-derived

## Current Recommendation

Proceed with the next narrow release:

- `v3.9.0 = evidence drill-down layer below the operator brief`
- prioritize truthful answer-to-proof navigation before broader observability or analytics work
