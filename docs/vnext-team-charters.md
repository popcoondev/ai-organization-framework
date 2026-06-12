# Next Major Version Team Charters

## Requirements Team

Mission:

- Translate the user mission into explicit AOF requirements and acceptance criteria.

Responsibilities:

- maintain Need / Intent / Context
- identify scope boundaries
- define success criteria

Authority:

- request clarification when scope is ambiguous
- reject work that cannot be tied to a success criterion

Deliverables:

- requirements analysis
- acceptance criteria

Dependencies:

- human mission statement
- AOF v2.1 core model

## Organization Design Team

Mission:

- Design the organization required to execute the next major version.

Responsibilities:

- maintain `.aof/organization.json`
- define councils, teams, roles, assignments, escalation, and lifecycle
- keep Role and Agent identities separate

Authority:

- propose team split / merge
- define council membership and approval policy
- request human approval for authority boundary changes

Deliverables:

- organization manifest
- team charter set
- escalation model

Dependencies:

- requirements analysis

## Contract Integration Team

Mission:

- Define contracts between teams, artifacts, and decision gates.

Responsibilities:

- maintain contract register
- maintain dependency graph
- identify missing artifact owners

Authority:

- block release planning when a required contract has no owner
- request ADR when a contract changes system behavior

Deliverables:

- contract definitions
- dependency register

Dependencies:

- organization design
- team charters

## Release Planning Team

Mission:

- Convert council-approved direction into a staged roadmap and release plan.

Responsibilities:

- define release phases
- define verification gates
- identify release risks
- maintain readiness criteria

Authority:

- propose release candidates
- request additional verification
- escalate release blockers to Operations Council

Deliverables:

- roadmap
- release plan

Dependencies:

- council approval
- contract register
- ADR

