# Next Release Plan

## Proposed Version

`v3.8.0`

## Release Theme

The next release should introduce a bounded operator briefing layer above runtime situation assessment for the self-hosting runtime.

`v3.7.0` made the current frontier more truthful.  
Running the released runtime after that exposes the next operator bottleneck:

- the runtime can explain the current frontier, but the operator still needs a tighter answer surface than a viewer
- situation judgment is available, but the best explanation is still spread across multiple outputs
- current state, blocker summary, and next move need stronger answer compression
- richer visibility alone would not solve this comprehension gap

This means the next release should not start with richer ornamentation or analytics.  
It should first let the runtime produce one compact operator brief that explains the current real situation and points to the correct next move.

## Runtime Evidence Basis

Direction-setting runtime evidence:

- release: `v3.7.0`
- completed implementation task: `.aof/tasks/done/TASK-043.json`
- current open frontier task: `.aof/tasks/open/TASK-044.json`
- current operating goal: `.aof/goals/operating-goal.json`
- current next value slice: `.aof/goals/next-value-slice.json`
- current mission surface: `.aof/artifacts/visibility/current/mission-control.json`
- current diagnosis surface: `.aof/artifacts/visibility/current/mission-control.json`

## Required Outcomes

Required:

- the runtime emits an operator-facing briefing packet that answers the current situation in one surface
- the packet explains what is happening, why it is happening, what is blocked, and what should happen next
- the packet stays derived from canonical runtime artifacts and situation assessment rather than becoming a second truth source
- the recommended action in the operator brief matches the live frontier task

Deferred:

- richer role-state and council-state visual layers
- broader organization analytics expansion
- new execution authority or autonomy claims
- a second operator state model maintained outside canonical artifacts

## Release Gates

### Gate 1: Situation Brief Exists

- the runtime emits one compact operator-facing briefing packet
- the packet answers current state, causal basis, blockers, and next action

### Gate 2: Briefing Is Truthful

- the operator briefing follows the same frontier as situation assessment and roadmap guidance
- the briefing does not recommend work that the runtime itself would reject as stale

### Gate 3: Viewer Is No Longer Required For Basic Runtime Comprehension

- operator-critical questions can be answered from the briefing packet without relying on Mission Control as the primary path
- Mission Control remains additive rather than mandatory

### Gate 4: Boundaries Stay Honest

- post-release transition does not invent new authority
- Discovery / Need Validation / execution boundaries remain unchanged
- transition logic stays backend-neutral and artifact-derived

## Verification Plan

Local verification baseline:

- post-release transition outputs validate
- Mission Control remains derivable from canonical runtime artifacts
- operator-critical questions about current frontier can be answered without manually reconciling stale release work

Verification evidence should include:

- a bounded operator-brief artifact
- situation assessment evidence showing that the brief matches current truth
- verification that the briefing remains artifact-derived and aligned with the live frontier

Council verification:

- Product Council confirms that the operator can understand the current situation without reconstructing multiple outputs
- Architecture Council confirms that briefing state derives from canonical runtime artifacts with low drift risk
- Operations Council confirms that the briefing does not hide or distort runtime truth

Human sign-off:

- required before cutting `v3.8.0`

## Risks

- collapsing multiple runtime truths into an over-simplified brief
- drifting into narrative surfaces that stop matching canonical artifacts
- broadening observability before operator answer quality is actually improved

## Current Recommendation

Proceed with the next narrow release:

- `v3.8.0 = operator briefing layer above situation assessment`
- prioritize truthful operator answer compression before any richer observability or analytics work
