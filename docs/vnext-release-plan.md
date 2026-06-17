# Next Release Plan

## Proposed Version

`v3.4.0`

## Release Theme

The next release should make the self-hosting runtime truthful about the active release baseline after a real release.

The core problem exposed by running `AOF v3.3.0` on the self-hosting repo was not lack of autonomy.  
It was that active runtime surfaces drifted after release:

- contract and roadmap surfaces still referenced `v3.0`
- bootstrap metadata still reported `2.2.0`
- organization mission still framed the active baseline around `v3.0`

This means AOF still lacks a runtime-native mechanism for keeping release-state synchronized after a release.

## Runtime Evidence Basis

Direction-setting runtime evidence:

- task: `TASK-038`
- session: `SESS-MQI8U3JX-Y6BTOI`
- discovery judgment: `.aof/artifacts/discovery/judgments/DJP-MQI8WRBG-LTYR15.json`
- discovery handoff: `.aof/artifacts/discovery/handoffs/DHO-MQI8X4VW-VYX8LT.json`
- need validation record: `.aof/artifacts/need-validation/records/NVR-TASK-038.json`
- project charter: `.aof/artifacts/need-validation/project-charters/PCH-MQI8Y4VO-7N9R27.json`
- planning execution: `CRUN-MQI8Z17N-2V30ZT`

## Required Outcomes

Required:

- canonical active release manifest artifact
- release-state drift detection across operator-facing runtime surfaces
- runtime-native refresh/update path for active release refs
- clear separation between active refs and historical refs
- verification that `organization-status`, `contract-register`, `roadmap-status`, and bootstrap metadata converge on one release baseline

Deferred:

- broader external-reader review automation
- business-facing artifact legibility scoring
- stronger human audit reconstruction automation beyond release-state truthfulness
- new autonomy claims or backend-specific execution expansion

## Release Gates

### Gate 1: Active Release Baseline Is Canonical

- one active release manifest exists
- active operator surfaces can resolve through it

### Gate 2: Drift Is Detectable

- release-state drift can be surfaced by runtime verification or benchmark output
- stale refs are not silent

### Gate 3: Drift Is Repairable Through Runtime

- the operator has a runtime-native way to refresh active release refs
- repair does not depend on manual JSON editing as the primary operating path

### Gate 4: Boundary Stays Honest

- `v3.4` does not claim broader autonomy from this work
- Need Validation and backend-neutral constraints remain unchanged

## Verification Plan

Local verification baseline:

- release-state manifest validates
- release-state drift checks pass on the repaired self-hosting repo
- a drift case can be reproduced intentionally and caught by verification

Verification evidence:

- `docs/v3.4-direction-runtime-review.md`
- release-state verification or benchmark artifacts
- roadmap self-review record

Council verification:

- Product Council confirms operator value and prioritization
- Architecture Council confirms canonical manifest and contract integrity
- Operations Council confirms verification honesty and repair safety

Human sign-off:

- required before cutting `v3.4.0`

## Risks

- accidentally overwriting intentionally historical refs while refreshing active refs
- introducing a manifest that exists but is not actually consumed by operator-facing runtime commands
- treating drift detection as sufficient without a repair/update path

## Current Recommendation

Proceed with the next narrow release:

- `v3.4.0 = release-state freshness and drift detection`
- fix active release truthfulness before expanding evidence-quality and external-legibility claims further
