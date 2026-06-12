# Next Major Version Release Plan

## Release Theme

The next major version should prove that AOF can operate as an AI Organization Operating System, not merely describe one.

## Proposed Version

`v3.0.0`

Rationale:

- `v2.0.0` made AOF installable.
- `v2.1.0` made organization first-class.
- The next major should make organization operation visibly executable and auditable.

## Release Scope

Required:

- runtime-readable organization status
- team charter artifacts
- contract register
- dependency register
- ADR recording flow
- council approval packet
- roadmap and release planning artifacts

Deferred:

- autonomous AI daemon
- full resource scheduler
- automatic metric collection
- backend-specific workflow execution as core requirement

## Release Gates

### Gate 1: Requirements Are Traceable

- each release scope item maps to a mission success criterion

### Gate 2: Organization Is Inspectable

- organization, teams, roles, contracts, dependencies, and councils can be inspected from AOF artifacts

### Gate 3: Council Approval Is Auditable

- council votes and approval outcome are recorded in ADR or decision record format

### Gate 4: Contracts Are Owned

- each contract has owner, consumer, artifact, and expected output

### Gate 5: Roadmap Is Phased

- roadmap has phases, exit criteria, and deferred scope

### Gate 6: Release Plan Is Verifiable

- release plan has verification gates, risk notes, and sign-off boundary

## Verification Plan

Local verification:

- JSON parse for `.aof/organization.json`
- JSON parse for ADR
- docs presence check for all success criteria artifacts

Council verification:

- Product Council confirms value and scope
- Architecture Council confirms model consistency
- Operations Council confirms release gates and risk boundaries

Human sign-off:

- required before cutting the next major release

## Risks

- Scope creep from trying to implement full automation too early
- Confusing organization model with execution backend
- Treating metrics as measured when they are only named
- Treating council approval as independent when one AI orchestrator synthesized all votes

## Current Recommendation

Proceed with the next major version only after one more planning review confirms that the artifacts created by this AOF 2.1 exercise are sufficient and internally consistent.

