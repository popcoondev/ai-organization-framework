# AOF Post-v4.0 Roadmap

## North Star

AOF should become an AI Organization Operating System that can:

- discover what is worth investigating
- validate what is worth turning into a project
- govern how work is executed
- keep the whole chain auditable across human, AI, and tool work
- make the current organizational mission recognizable to a human at a glance
- assign the right actor to the right work with the right skill, resource, policy, and review contract

This is the tighter frontier after `v4.0.1`.

## Current Baseline

`v4.0.0` established the Human Recognition Interface as the operator surface.

`v4.0.1` patched that surface so the current frontier task scope is visible from live task artifacts.

What is now strong:

- runtime-backed status is visible
- trunk / branch / frontier position is explicit
- operator brief, progress, tree position, evidence drill-down, and viewer session surfaces exist
- the runtime can show what task is active and why it is active
- council, role, team, and execution artifacts can be represented as canonical evidence

What is still weak:

- skills, capabilities, resources, policies, and metrics exist mostly as declared truth
- actor assignment is not yet driven strongly enough by skill fit and policy constraints
- the Human Recognition Interface can show the organization, but the organization is not yet skillful enough at runtime
- current allocation artifacts exist, but they are not yet the default decision path for staffing and escalation

The next roadmap question is:

> How can AOF make each actor perform above its raw LLM baseline by giving it the right skill packet, context, resources, constraints, and review path?

## `v5.0.0`: Skillful Actor Runtime

Theme:

- turn skills, capabilities, resources, policies, and metrics into live actor assignment inputs
- make actor work start from a skill packet rather than a generic role prompt
- make capability fit and resource availability explicit before assignment
- require policy evaluation and resource claims for work that crosses governed boundaries
- project actor state, skill use, and review readiness into the Human Recognition Interface
- make actor skillfulness falsifiable through negative benchmark cases

Canonical direction basis:

- `TASK-048`
- `.aof/tasks/done/TASK-047.json`
- `.aof/artifacts/execution/role-results/RRES-TASK-047-VISIONARY.json`
- `.aof/artifacts/execution/role-results/RRES-TASK-047-BUILDER.json`
- `.aof/artifacts/execution/role-results/RRES-TASK-047-GUARDIAN.json`
- `.aof/artifacts/execution/role-joins/RJOIN-TASK-047-V50-DIRECTION.json`
- `.aof/artifacts/execution/team-outputs/TOUT-TASK-047-V50-DIRECTION.json`
- `.aof/artifacts/execution/council-reviews/CRP-TASK-047-V50-DIRECTION.json`
- `.aof/goals/operating-goal.json`
- `.aof/goals/next-value-slice.json`

Required outcomes:

- an actor skill packet contract exists
- skill packet inputs include role, objective, required skill, capability fit, resource refs, policy refs, expected output, and review criteria
- actor assignment can explain why a specific actor or role was selected
- missing skill evidence can block or degrade assignment
- policy-bypassed allocation is detectable as a failure
- Human Recognition Interface can show actor skill, current assignment, confidence, blockers, and review status from canonical artifacts
- benchmark coverage includes negative cases for missing skill evidence, weak actor assignment, stale release state, and policy-bypassed allocation

Implementation steps:

1. `TASK-049`: Define the actor skill packet contract.
2. `TASK-050`: Implement the actor skill packet writer and fixtures.
3. `TASK-051`: Implement capability-fit and actor assignment evaluation.
4. `TASK-052`: Implement resource claim and policy gate integration.
5. `TASK-053`: Add Skillful Actor negative benchmarks.
6. `TASK-054`: Project Skillful Actor state into the Human Recognition Interface and self-hosting proof.

Why `v5.0` comes next:

- `v4.0` made runtime truth recognizable
- `v4.0.1` made the active task scope clearer
- the next product step is not a prettier viewer
- the next product step is a more capable organization whose decisions deserve to be viewed

Deferred from `v5.0`:

- broad autonomy expansion
- plugin-first visibility work
- decorative character UI
- multi-backend workforce automation claims that are not backed by actor assignment artifacts
- analytics dashboards that do not change assignment, blocking, escalation, or review decisions

## Boundary Rules

The roadmap should continue to preserve these rules:

- Discovery does not directly authorize project creation.
- Need Validation remains the mandatory pre-project gate.
- visibility layers must derive from canonical artifacts rather than become a second source of truth.
- Human Recognition Interface remains the operator surface, not the source of authority.
- actor skillfulness must be falsifiable through artifacts and benchmarks.
- backend-neutrality remains the default product position.
- autonomy claims must trail artifact proof, not lead it.

## Sequencing Rule

The roadmap should obey this dependency order:

1. truthful release state before future-direction claims
2. human recognition before richer visibility grammar
3. actor skill packet before dynamic staffing claims
4. capability fit before resource allocation
5. resource claim and policy evaluation before governed execution
6. negative benchmark cases before release sign-off
7. actor state projection before broader Human Recognition Interface expansion

## Current Recommendation

Proceed with the following interpretation:

- `v4.0.0` = Human Recognition Interface powered by Human Recognition Packet
- `v4.0.1` = task scope visibility patch for the Human Recognition Interface
- `v5.0.0` = Skillful Actor Runtime

The immediate v5.0 parent is `TASK-048`, but the active implementation step is `TASK-049`: define the first actor skill packet contract before adding runtime commands, assignment evaluation, policy/resource gates, benchmarks, and Human Recognition Interface projection.
