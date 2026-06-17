# AOF Post-v3.2 Roadmap

## North Star

AOF should become an AI Organization Operating System that can:

- discover what is worth investigating
- validate what is worth turning into a project
- govern how work is executed
- keep the whole chain auditable across human, AI, and tool work

This is not a reset of the earlier North Star.  
It is a tighter statement of the current frontier after `v3.2.0`.

## Current Baseline

`v3.2.0` established:

- Need Validation as a mandatory pre-project gate
- runtime transition control from framing to planning
- schema-backed artifact family for problem statement, value hypothesis, alternatives, experiment proposal, project charter, and need validation record
- the explicit rule that Discovery strengthens Need Validation input but does not replace project approval authority

What is still weak after `v3.2.0`:

- discovery evidence quality before Need Validation
- discovery judgment as a release-grade contract
- consistent handoff from discovery evidence into validated need planning

The next roadmap therefore starts from this question:

> What is the smallest additive step after `validated need` gating that improves project-selection quality without overclaiming discovery autonomy?

## `v3.3.0`: Evidence-Bearing Discovery

Theme:

- make discovery evidence, judgment, and handoff part of the release-grade pre-project contract

Canonical definition:

- [v3.3-release-definition.md](./v3.3-release-definition.md)

Required outcomes:

- discovery question set becomes part of the operating path
- assumption and anomaly evidence become part of the operating path
- discovery judgment becomes a first-class continue / pivot / handoff / stop surface
- discovery-to-need-validation handoff becomes an auditable packet rather than prose-only guidance
- upstream evidence quality can be judged before stronger project-creation claims are made

Why `v3.3` comes next:

- `v3.2` already made Need Validation mandatory
- discovery artifact schemas and commands already exist
- the largest remaining governance gap is still wrong-project creation caused by weak upstream evidence, not lack of broader execution ambition

Deferred from `v3.3`:

- full Discovery Council productization
- generalized business discovery autonomy
- direct project creation from discovery alone
- backend-specific orchestration claims

## `v3.4.x`: Release-State Freshness And Drift Detection

Theme:

- make the self-hosting runtime truthful about the currently active release baseline after a real release

Candidate outcomes:

- one canonical active release manifest
- release-state drift detection across operator-facing runtime surfaces
- a runtime-native refresh/update path for active release refs after release
- explicit separation between active refs and intentionally historical refs
- stronger external-reader legibility once active release truthfulness is stable

Why this follows `v3.3`:

- using the `v3.3.0` runtime on the self-hosting repo exposed immediate drift between active goals, contracts, roadmap refs, bootstrap metadata, and organization mission
- later evidence-quality and legibility work is weaker if the runtime cannot first say truthfully which release baseline is active

## `v4.x` Candidate Frontier

Potential longer-horizon direction:

- governed discovery-plus-delivery organization runtime

This is not yet a committed release claim.  
It becomes credible only after:

- discovery evidence is stable
- need validation remains strong
- execution/runtime proof stays honest
- human audit and external legibility become cheaper

## Boundary Rules

The roadmap should continue to preserve these rules:

- Discovery does not directly authorize project creation.
- Need Validation remains the mandatory pre-project gate.
- backend-neutrality remains the default product position.
- autonomy claims must trail artifact proof, not lead it.

Minimum future requirement:

- Discovery should be able to frame what must be discovered before it frames what must be built
- Discovery must terminate in a structured handoff to Need Validation
- Need Validation must terminate in `Validated Need -> Project Charter` before project creation
- Discovery artifacts must be reviewable and governable, not only creative notes
- Discovery should extend the current model rather than fork it into a parallel framework
- Discovery standardization should preserve exploration flexibility and avoid forcing early convergence

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
- `v2.6` = runtime-backed visibility projection
- `v3.0` = backend-neutral organization runtime

This is the fastest path that preserves consistency with:

- `v2.0` installer/bootstrap
- `v2.1` organization model
- `v2.2` capability layer
- current `main` cadence and `vnext` planning work
