# Next Major Version Contracts

## Contract Register

| Contract | contract_id | name | owner_team_ref | contract_type | artifact_ref |
| --- | --- | --- | --- | --- | --- |
| C-001 | `contract-requirements-to-organization` | Requirements To Organization Contract | `requirements-team` | `scope-and-success-criteria` | `docs/vnext-requirements-analysis.md` |
| C-002 | `contract-organization-to-contracts` | Organization To Contracts Contract | `organization-design-team` | `team-charter-and-dependency` | `docs/vnext-team-charters.md` |
| C-003 | `contract-contracts-to-adr` | Contracts To ADR Contract | `contract-integration-team` | `decision-gate` | `docs/vnext-contracts.md` |
| C-004 | `contract-council-approval-to-release-plan` | Council Approval To Release Plan Contract | `release-planning-team` | `approval-and-release-gate` | `docs/vnext-release-plan.md` |

The table above is the canonical markdown mirror of `.aof/organization.json` contract definitions.

### C-001: Requirements To Organization Contract

Owner:

- `requirements-team`

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

- `organization-design-team`

Consumers:

- Contract Integration Team
- Architecture Council

Artifact:

- `docs/vnext-team-charters.md`

Contract:

- Each team must have mission, responsibility, authority, deliverables, and dependencies.
- Role and Agent identities must remain separate.
- Escalation must be represented as governance path, not as a hierarchy node.

### C-003: Contracts To ADR Contract

Owner:

- `contract-integration-team`

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

- `release-planning-team`

Consumers:

- Human authority
- future release implementers

Artifact:

- `docs/vnext-release-plan.md`

Contract:

- Release plan must include phases, gates, risks, and success criteria.
- Council approval must be explicit and traceable.

## Dependency Graph

```text
Requirements Team
  -> Organization Design Team
  -> Contract Integration Team
  -> Release Planning Team

Product Council
Architecture Council
Operations Council
  -> .aof/decisions/ADR-001.json
  -> Release Planning Team
```

## Open Contract Risks

- Metrics are named but not auto-measured.
- Organization lifecycle is defined but not runtime-enforced.
- Backend-specific orchestration, such as Claude workflows or Codex subagents, remains an execution option rather than a core AOF dependency.
