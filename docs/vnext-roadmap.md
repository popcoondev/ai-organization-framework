# AOF 2.3 To 3.0 Roadmap

## North Star

AOF should become an AI Organization Operating System that can represent, validate, inspect, coordinate, allocate, govern, and improve project organizations across human, AI, and tool workforces without backend lock-in.

This is a refinement of the earlier North Star, not a reset.  
The previous wording included split / merge / archive as part of the same top-line ambition. Those remain valid long-term themes, but they are no longer treated as the most efficient `v3.0` bar. The tighter `v3.0` target is:

- governed execution
- typed allocation
- policy-aware operation
- inspectable improvement loop

This keeps the goal ambitious while staying consistent with the current `v2.2` implementation speed.

## Current Baseline

`v2.2.0` now exists as the first release where AOF has:

- first-class organization model
- first-class capability layer
- machine-readable policy artifact
- productized organization and decision verification
- inspectable metrics / analytics / learning-loop artifacts

`v2.2.0` still stops at:

- represent
- validate
- inspect

The roadmap below therefore starts from the question:

> What is the smallest additive path from `represent / validate / inspect` to a release-grade organization runtime?

## `v2.3.0`: Operational Surface Consolidation

Theme:

- make the organization model operable without requiring direct JSON reading

Required outcomes:

- first-class organization inspection commands
- first-class contract / dependency / council / decision registers
- unified verification entrypoint for organization integrity
- roadmap / release / policy / contract surfaces linked as one operating packet

Candidate deliverables:

- `aof organization-status`
- `aof contract-register`
- `aof dependency-graph`
- `aof decision-register`
- `aof roadmap-status`
- unified benchmark or organization audit command

Canonical definition:

- [v2.3-operator-surface-definition.md](./v2.3-operator-surface-definition.md)

Why `v2.3` comes next:

- it uses the artifacts already added in `v2.2`
- it does not require autonomous scheduling or backend orchestration
- it makes the current model usable by humans and AI without schema-level reading

Exit criteria:

- a project operator can inspect organization state from CLI surfaces
- contracts, dependencies, decisions, and release state can be listed and cross-checked from product commands
- `v2.2` verification surfaces are unified into a more operator-facing runtime path

Deferred from `v2.3`:

- role execution backend integration
- automatic staffing
- runtime policy enforcement
- autonomous learning or re-org

## `v2.4.0`: Council And Team Execution Contracts

Theme:

- connect organization structure to repeatable role and council execution packets

Required outcomes:

- role result contract
- team output packet
- council review packet
- explicit judgment loop artifact between output and next tasking

Candidate deliverables:

- `aof role-result-record`
- `aof team-output-record`
- `aof council-review-packet`
- `aof execution-lineage`
- backend-neutral execution packet contract

Why `v2.4` follows `v2.3`:

- `v2.3` makes the organization inspectable
- `v2.4` makes work products move through that organization in a structured way

Exit criteria:

- work can flow from role output to team output to council review to next task without relying on ad hoc notes
- execution records can be inspected independently of which backend or human produced the output
- council judgment is traceable as artifact, not only prose

Deferred from `v2.4`:

- dynamic allocation engine
- policy enforcement at execution time
- autonomous parent/child spawning as a runtime claim

## `v2.5.0`: Governed Allocation And Policy Evaluation

Theme:

- move from static capability inventory to governed assignment planning

Required outcomes:

- typed resource-to-role allocation planning
- policy evaluation reports for assignment or execution requests
- explicit resource claim / approval flow
- metrics tied to workload, risk, and contract coverage

Candidate deliverables:

- allocation plan artifact
- policy evaluation report
- resource claim / lease contract
- staffing recommendation packet
- metrics rollup for capability coverage and review load

Why `v2.5` is the correct bridge:

- allocation is the first true step beyond `inspect`
- it can still be introduced as planning and approval logic before autonomous execution
- it creates the minimum substrate needed for a credible `v3.0`

Exit criteria:

- AOF can explain why a role or task should be assigned to a specific resource set
- policy constraints can be evaluated before execution, even if enforcement is still partly manual
- metrics can expose review bottlenecks, capability gaps, and approval load

Deferred from `v2.5`:

- continuous daemon scheduler
- self-directed organization rewrite
- autonomous merge / split execution

## `v3.0.0`: Backend-Neutral Organization Runtime

Theme:

- first release where AOF can govern real multi-role execution across backends as an organization runtime

Required outcomes:

- backend-neutral execution contract that can map to Codex, Claude workflows, humans, or tools
- governed parent/child orchestration model
- policy-aware allocation and execution approval
- inspectable learning loop connected to outcomes, audits, and next-value planning

Candidate deliverables:

- parent/child orchestration contract
- backend adapter contract
- execution approval gateway
- runtime allocation engine
- learning-loop recommendation packet

What `v3.0` should prove:

- AOF is not only a description language for organizations
- AOF can govern execution through organizations without becoming backend-specific
- improvement signals can influence future assignment and planning in a controlled, inspectable way

Exit criteria:

- one real end-to-end loop can run through organization framing, allocation, execution, review, outcome, and next-step recommendation
- the same organization contract can target more than one execution backend family
- policy, metrics, and learning-loop artifacts participate in runtime operation rather than existing only as passive records

Explicitly still out of scope for `v3.0`:

- fully autonomous daemon operation as a baseline assumption
- unconstrained self-modifying organization behavior
- claiming solved general intelligence workforce management
- mandatory split / merge / archive automation for all projects

## Sequencing Rule

The roadmap should obey this dependency order:

1. inspectability before execution
2. execution contracts before allocation
3. allocation before enforcement
4. enforcement before adaptive improvement

If a proposed feature breaks this order, it likely belongs in a later release.

## Current Recommendation

Proceed with the following interpretation:

- `v2.3` = operationalize the current model
- `v2.4` = formalize execution packets
- `v2.5` = governed allocation and policy evaluation
- `v3.0` = backend-neutral organization runtime

This is the fastest path that preserves consistency with:

- `v2.0` installer/bootstrap
- `v2.1` organization model
- `v2.2` capability layer
- current `main` cadence and `vnext` planning work
