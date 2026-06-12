# Next Major Version Contracts

## Contract Register

### C-001: Requirements To Organization Contract

Owner:

- Requirements Team

Consumers:

- Organization Design Team
- Product Council

Artifact:

- `docs/vnext-requirements-analysis.md`

Contract:

- Every team, role, and release phase must trace back to at least one success criterion.
- Scope not tied to the mission is deferred.

### C-002: Organization To Contracts Contract

Owner:

- Organization Design Team

Consumers:

- Contract Integration Team
- Architecture Council

Artifact:

- `.aof/organization.json`
- `docs/vnext-team-charters.md`

Contract:

- Each team must have mission, responsibility, authority, deliverables, and dependencies.
- Role and Agent identities must remain separate.
- Escalation must be represented as governance path, not as a hierarchy node.

### C-003: Contracts To ADR Contract

Owner:

- Contract Integration Team

Consumers:

- Product Council
- Architecture Council
- Operations Council

Artifact:

- `docs/vnext-contracts.md`

Contract:

- Major direction must be recorded as ADR before roadmap commitment.
- Contracts must identify owners and consumers.

### C-004: Council Approval To Release Plan Contract

Owner:

- Release Planning Team

Consumers:

- Human authority
- future release implementers

Artifact:

- `.aof/decisions/ADR-001-next-major-version-direction.json`
- `docs/vnext-roadmap.md`
- `docs/vnext-release-plan.md`

Contract:

- Release plan must include phases, gates, risks, and success criteria.
- Council approval must be explicit and traceable.

## Dependency Graph

```text
Requirements Team
  -> Organization Design Team
  -> Contract Integration Team
  -> Council Approval
  -> Release Planning Team
```

## Open Contract Risks

- Metrics are named but not auto-measured.
- Organization lifecycle is defined but not runtime-enforced.
- Backend-specific orchestration, such as Claude workflows or Codex subagents, remains an execution option rather than a core AOF dependency.

