# Next Release Plan

## Proposed Version

`v3.6.0`

## Release Theme

The next release should introduce a **bounded Mission Control visibility layer** for the self-hosting runtime.

`v3.5.0` made the CLI easier to route for humans and AI.  
Running the runtime after that release exposed the next operator bottleneck:

- mission state is still split across multiple visibility outputs
- artifact lineage is present in the runtime but not yet legible from one operator surface
- blockers and recommended next action still require manual reconstruction
- the current visibility layer answers "what is happening" more easily than "why" and "what next"

This means the next release should not start with ornamental visualization or broader liveness claims.  
It should first make the existing runtime chain legible as one truthful Mission Control surface.

## Runtime Evidence Basis

Direction-setting runtime evidence:

- task: `TASK-041`
- discovery question set: `.aof/artifacts/discovery/question-sets/DQS-MQIZCECJ-TU6MBI.json`
- assumption map: `.aof/artifacts/discovery/assumption-maps/ASM-MQIZCECJ-QE2IVF.json`
- anomaly log: `.aof/artifacts/discovery/anomaly-logs/ANL-MQIZCECJ-0WB7D6.json`
- discovery judgment: `.aof/artifacts/discovery/judgments/DJP-MQIZEJC8-LRR4W9.json`
- discovery handoff: `.aof/artifacts/discovery/handoffs/DHO-MQIZEYFI-CEDW49.json`
- need validation record: `.aof/artifacts/need-validation/records/NVR-TASK-041.json`
- project charter: `.aof/artifacts/need-validation/project-charters/PCH-TASK-041.json`

## Required Outcomes

Required:

- mission overview derived from active mission, release, operating goal, next value slice, and current runtime position
- artifact graph or equivalent causal-chain view that links the current state to the runtime artifacts that produced it
- blocker summary that tells the operator what currently stops forward movement
- recommended next action summary derived from canonical runtime state
- Mission Control composition implemented from canonical artifacts rather than duplicate handwritten truth

Deferred:

- live role-state and council-state claims that the current runtime cannot derive truthfully
- pixel-office or ornamental visual layers
- new execution authority or autonomy claims
- a second operator state model maintained outside canonical artifacts

## Release Gates

### Gate 1: Mission Overview Is Canonical

- one mission overview exists for the main operator path
- it is derived from current runtime state, not maintained separately

### Gate 2: Artifact Lineage Is Legible

- operators can see what created the current mission state from one surface
- lineage is rendered from governed artifacts or narrow derived summaries

### Gate 3: Blockers And Next Action Are Visible

- the operator can identify current blockers from the Mission Control surface
- the operator can identify the recommended next action from the same surface

### Gate 4: Boundaries Stay Honest

- Mission Control does not invent new authority
- Discovery / Need Validation / execution boundaries remain unchanged
- visibility stays backend-neutral and artifact-derived

## Verification Plan

Local verification baseline:

- Mission Control payloads validate
- visibility surfaces remain derivable from canonical runtime artifacts
- operator-critical questions can be answered without opening raw JSON on the main path

Verification evidence should include:

- a direction review record for `v3.6`
- visibility contract evidence for mission overview, lineage, blockers, and next action
- a narrow benchmark proving that the Mission Control surface stays truthful across stage transition

Council verification:

- Product Council confirms that the mission surface improves operator comprehension
- Architecture Council confirms that Mission Control derives from canonical runtime artifacts with low drift risk
- Operations Council confirms that blocker and next-action summaries reduce operator reconstruction cost

Human sign-off:

- required before cutting `v3.6.0`

## Risks

- building a compelling UI that is not tied tightly enough to runtime truth
- drifting into live-state claims that current artifacts cannot support
- expanding the scope into full observability or simulation before the first truthful Mission Control slice is proven

## Current Recommendation

Proceed with the next narrow release:

- `v3.6.0 = bounded Mission Control visibility layer`
- prioritize mission overview, artifact lineage, blocker visibility, and recommended next action before any richer live or o