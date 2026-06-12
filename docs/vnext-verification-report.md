# AOF 2.1 Self-Hosting Benchmark Verification Report

Date: 2026-06-12

Scope: PR #357 AOF 2.1 next-major-version planning package

## Verdict

Result: pass

The benchmark package satisfies the stricter AOF Organization OS acceptance condition: organization, decision, contract, dependency, and artifact records are mutually consistent.

## Checks

| Check | Target | Result |
| --- | --- | --- |
| Organization schema validation | `.aof/organization.json` against `schemas/aof-organization.schema.json` | pass |
| Decision schema validation | `.aof/decisions/ADR-001-next-major-version-direction.json` against `schemas/decision-record.schema.json` | pass |
| Contract consistency validation | `.aof/organization.json` contracts against `docs/vnext-contracts.md` contract register | pass |
| Dependency reference validation | organization team and dependency references resolve to existing `team_id` or `council_id` | pass |
| Success criteria artifact validation | all mission success criteria artifacts exist | pass |
| Runtime regression validation | `npm test` | pass, 100 tests |
| Smoke validation | `npm run smoke` | pass |

## Contract Register Expected State

| Contract | contract_id | name | owner_team_ref | contract_type | artifact_ref |
| --- | --- | --- | --- | --- | --- |
| C-001 | `contract-requirements-to-organization` | Requirements To Organization Contract | `requirements-team` | `scope-and-success-criteria` | `docs/vnext-requirements-analysis.md` |
| C-002 | `contract-organization-to-contracts` | Organization To Contracts Contract | `organization-design-team` | `team-charter-and-dependency` | `docs/vnext-team-charters.md` |
| C-003 | `contract-contracts-to-adr` | Contracts To ADR Contract | `contract-integration-team` | `decision-gate` | `docs/vnext-contracts.md` |
| C-004 | `contract-council-approval-to-release-plan` | Council Approval To Release Plan Contract | `release-planning-team` | `approval-and-release-gate` | `docs/vnext-release-plan.md` |

## Dependency Reference Expected State

Valid organization node references:

- `requirements-team`
- `organization-design-team`
- `contract-integration-team`
- `release-planning-team`
- `product-council`
- `architecture-council`
- `operations-council`

Resolved dependencies:

| from_ref | to_ref | dependency_type | status |
| --- | --- | --- | --- |
| `organization-design-team` | `requirements-team` | `requirements-input` | active |
| `contract-integration-team` | `organization-design-team` | `charter-input` | active |
| `release-planning-team` | `contract-integration-team` | `contract-input` | active |
| `release-planning-team` | `product-council` | `approval-input` | active |

Council approval is not modeled as a dependency node. It is modeled through:

- `.aof/decisions/ADR-001-next-major-version-direction.json`
- `docs/ADR-001-next-major-version-direction.md`

## Success Criteria Artifacts

| Criterion | Artifact | Result |
| --- | --- | --- |
| 要求分析 | `docs/vnext-requirements-analysis.md` | exists |
| 組織編成 | `.aof/organization.json` | exists and schema-valid |
| Team Charter作成 | `docs/vnext-team-charters.md` | exists |
| Contract定義 | `docs/vnext-contracts.md` | exists and contract-consistent |
| ADR作成 | `.aof/decisions/ADR-001-next-major-version-direction.json` | exists and schema-valid |
| Councilによる承認 | `docs/ADR-001-next-major-version-direction.md` | exists |
| Roadmap作成 | `docs/vnext-roadmap.md` | exists |
| Release Plan作成 | `docs/vnext-release-plan.md` | exists |

## Validation Method

The validation pass checked the following invariants:

- Required schema fields exist.
- Additional properties prohibited by `schemas/decision-record.schema.json` are absent.
- Contract IDs, names, owners, contract types, and artifact refs match between `.aof/organization.json` and `docs/vnext-contracts.md`.
- Dependency references do not point to synthetic nodes such as `council-approval`.
- Approval is represented as decision and ADR evidence rather than as a dependency edge.

This verification is part of the benchmark artifact set. It does not introduce new AOF runtime capability.
