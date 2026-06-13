# Next Major Release Plan

## Release Theme

The next major release should prove that AOF can govern real execution as an organization runtime, not only describe and inspect organization state.

## Proposed Version

`v3.0.0`

Rationale:

- `v2.0.0` made AOF installable.
- `v2.1.0` made organization first-class.
- `v2.2.0` made capability, policy, and inspectable learning surfaces first-class.
- The next major should make those surfaces participate in governed execution without collapsing into backend lock-in or premature autonomy claims.

## Pre-Major Bridge Releases

Before `v3.0.0`, the roadmap should pass through additive bridge releases:

- `v2.3.0`: operational surface consolidation
- `v2.4.0`: council and team execution contracts
- `v2.5.0`: governed allocation and policy evaluation

These are not optional polish phases. They are the shortest coherent path from `v2.2 = represent / validate / inspect` to a credible major runtime release.

## `v3.0.0` Release Scope

Required:

- backend-neutral execution contract
- governed parent/child orchestration model
- policy-aware allocation and execution approval
- inspectable linkage from outcome and self-audit into next-step recommendation
- at least one end-to-end organization runtime loop that is auditable across artifacts

Required but still additive:

- no backend lock-in to Codex-only or Claude-only execution
- no rollback of cadence, verification, or planning surfaces already on current `main`

Deferred:

- autonomous always-on daemon as a baseline assumption
- unconstrained self-modifying organization behavior
- full adaptive split / merge / archive automation
- automatic metric collection from every backend as a hard requirement

## `v2.3` To `v3.0` Release Gates

### Gate 1: `v2.3` Makes The Model Operable

- organization, contracts, dependencies, and decisions are inspectable from CLI-level operator surfaces
- operator workflows do not require raw JSON reading as the primary interface
- the concrete `v2.3` command and audit surface is fixed in [v2.3-operator-surface-definition.md](./v2.3-operator-surface-definition.md)

### Gate 2: `v2.4` Makes Execution Traceable

- role output, team output, and council review are represented by explicit packet or contract artifacts
- execution lineage can be inspected independently of backend choice

### Gate 3: `v2.5` Makes Allocation Governable

- role-to-resource assignment can be planned through typed capability and resource artifacts
- policy evaluation can be recorded before execution proceeds

### Gate 4: `v3.0` Makes Runtime Real

- a real organization loop can run from framing to allocation to execution to review to outcome to next-step recommendation
- runtime behavior remains backend-neutral at the organization contract layer

### Gate 5: Scope Boundaries Stay Honest

- `v3.0` does not market autonomous workforce management beyond what the runtime artifacts and backend contracts actually support
- deferred items remain explicitly deferred

## Verification Plan

Local verification baseline:

- `.aof/organization.json` validates against `schemas/aof-organization.schema.json`
- capability-layer artifacts validate and remain cross-referenced correctly
- decision artifacts validate and remain paired with canonical markdown
- release roadmap and release plan remain consistent with `docs/v2.3-release-definition.md`

Bridge-release verification:

- `v2.3` validates operator surfaces
- `v2.4` validates execution packet integrity
- `v2.5` validates allocation and policy evaluation artifacts

Verification evidence:

- `docs/vnext-verification-report.md`
- roadmap self-review record

Council verification:

- Product Council confirms user-value and pacing
- Architecture Council confirms layering and contract integrity
- Operations Council confirms runtime safety and release honesty

Human sign-off:

- required before cutting `v3.0.0`

## Risks

- trying to skip `v2.3` to `v2.5` bridge work and forcing `v3.0` to carry too many concerns at once
- confusing execution packet design with backend-specific implementation details
- treating policy evaluation as equivalent to runtime enforcement
- treating a learning loop artifact as evidence of adaptive optimization before allocation and policy steps exist

## Current Recommendation

Proceed with the revised staged plan:

- stabilize `v2.3` as the operator-surface release
- use `v2.4` and `v2.5` as execution and allocation bridges
- hold `v3.0` for the first honest backend-neutral organization runtime release
