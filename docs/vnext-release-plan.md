# Next Release Plan

## Proposed Version

`v4.0.0`

## Release Theme

The next release should introduce a **Human Recognition Interface** above the shipped `v3.9.0` operator surfaces.

`v3.9.0` made the current answer, progress, branch position, proof path, and viewer reachability truthful.  
Comparing that runtime with the current external ecosystem exposes the next strategic bottleneck:

- the operator can now get the right answer and supporting proof
- but the runtime still does not strongly use skills, capabilities, resources, policies, and metrics in live allocation judgment
- many external frameworks already provide tracing, flow orchestration, studios, and observability
- AOF only becomes clearly more advanced if its organization model becomes live workforce reasoning rather than staying mostly declarative

This means the next release should not begin with broader visibility polish.  
It should first turn AOF truth into a one-screen interface that a human can instantly recognize, with governed workforce reasoning as one of its main inputs and a Human Recognition Packet as the canonical intermediate layer.

## Runtime Evidence Basis

Direction-setting runtime evidence:

- release: `v3.9.0`
- completed implementation task: `.aof/tasks/done/TASK-045.json`
- current open frontier task: `.aof/tasks/open/TASK-046.json`
- current operating goal: `.aof/goals/operating-goal.json`
- current next value slice: `.aof/goals/next-value-slice.json`
- current mission surface: `.aof/artifacts/visibility/current/mission-control.json`
- current diagnosis surface: `.aof/artifacts/visibility/current/operator-brief.json`
- external comparison basis: `docs/v4.0-direction-runtime-review.md`
- interface mapping basis: `docs/v4.0-human-recognition-interface-spec.md`

## Required Outcomes

Required:

- the runtime exposes a Human Recognition Interface as a first-class surface
- the interface is powered by a Human Recognition Packet derived from canonical artifacts
- runtime-backed status is explicit
- last runtime execution time, commands, and refreshed artifact refs are visible
- trunk / branch / frontier / council / actor / judgment / assignment / review state is instantly recognizable
- workforce reasoning is exposed in operator language derived from canonical artifacts
- human and council authority boundaries remain explicit while workforce logic becomes stronger
- the one-screen interface spec and artifact mapping are canonical and complete

Deferred:

- decorative visibility work
- plugin-first viewer expansion without workforce semantics
- autonomy expansion justified only by observability
- dashboards that do not materially improve allocation, escalation, or bottleneck diagnosis

## Release Gates

### Gate 1: Human Recognition Interface Exists

- the runtime can show a human on one screen what is happening, why, where in the tree it sits, who is acting, what each actor is recommending, and whether the answer is runtime-backed

### Gate 1A: Interface Mapping Is Canonical

- artifact -> recognition packet -> character / roadmap / timeline / blocker / next-action mapping is documented and canonical

### Gate 2: Runtime-Backed Fact Is Visible

- the surface shows last runtime execution time, commands run, execution-log ref, and refreshed-artifact refs
- direction / review / self-review / retrospective claims become visibly incomplete when runtime backing is missing

### Gate 3: Governed Workforce Reasoning Feeds The Interface Through The Packet

- the runtime can still cite capability, policy, resource, and analytics reasons
- workforce reasoning appears as input to recognition rather than as a hidden internal layer

### Gate 4: Truth Boundary Stays Honest

- no new authority is introduced
- discovery and Need Validation boundaries remain unchanged
- workforce reasoning remains backend-neutral and artifact-derived

## Current Recommendation

Proceed with the next narrow release:

- `v4.0.0 = Human Recognition Interface powered by Human Recognition Packet above governed workforce reasoning`
- after shipping it, move the next frontier to `v5.0.0` rather than leaving open work on the shipped release track
- prioritize human recognition of runtime truth before broader visibility or analytics polish
