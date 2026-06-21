# Next Release Plan

## Proposed Version

`v5.0.0`

## Release Theme

The next release should introduce **Skillful Actor Runtime**.

`v4.0.0` made AOF runtime state human-recognizable through the Human Recognition Interface.  
`v4.0.1` patched that interface so the current frontier task scope is visible from live task artifacts.

The remaining strategic gap is now runtime workforce quality:

- AOF can show who is acting
- AOF can show what is happening
- AOF can preserve task, council, role, team, and review artifacts
- but AOF does not yet strongly decide which actor should work, which skill should be applied, which resources are needed, which policy gates apply, and what evidence proves the actor performed skillfully

Therefore `v5.0.0` should make actor skillfulness operational.

## Runtime Evidence Basis

Direction-setting runtime evidence:

- active release baseline: `.aof/context/active/active-release-manifest.json`
- completed direction task: `.aof/tasks/done/TASK-047.json`
- completed parent implementation theme: `.aof/tasks/done/TASK-048.json`
- completed HRI projection frontier: `.aof/tasks/done/TASK-054.json`
- actor skill packet contract: `docs/v5-actor-skill-packet-contract.md`
- actor skill packet schema: `schemas/aof-actor-skill-packet.schema.json`
- actor skill packet writer: `src/commands/actor-skill-packet-record.js`
- actor skill packet fixture: `.aof/artifacts/benchmarks/fixtures/ASP-TASK-050-BUILDER.json`
- actor assignment evaluation command: `src/commands/actor-assignment-evaluation-record.js`
- actor assignment evaluation schema: `schemas/aof-actor-assignment-evaluation.schema.json`
- actor assignment evaluation fixture: `.aof/artifacts/benchmarks/fixtures/AAE-TASK-051-SELECTED.json`
- actor execution gate command: `src/commands/actor-execution-gate-record.js`
- actor execution gate schema: `schemas/aof-actor-execution-gate.schema.json`
- actor execution gate fixtures: `.aof/artifacts/benchmarks/fixtures/AEG-TASK-052-REQUIRES-REVIEW.json`, `.aof/artifacts/benchmarks/fixtures/RCL-TASK-052-REPO-MAIN.json`, `.aof/artifacts/benchmarks/fixtures/PER-TASK-052-RUNTIME-DISCIPLINE.json`
- Skillful Actor negative benchmark command: `src/commands/skillful-actor-benchmark.js`
- Skillful Actor negative benchmark schema: `schemas/aof-skillful-actor-benchmark.schema.json`
- current operating goal: `.aof/goals/operating-goal.json`
- current next value slice: `.aof/goals/next-value-slice.json`
- Visionary result: `.aof/artifacts/execution/role-results/RRES-TASK-047-VISIONARY.json`
- Builder result: `.aof/artifacts/execution/role-results/RRES-TASK-047-BUILDER.json`
- Guardian result: `.aof/artifacts/execution/role-results/RRES-TASK-047-GUARDIAN.json`
- role join: `.aof/artifacts/execution/role-joins/RJOIN-TASK-047-V50-DIRECTION.json`
- team output: `.aof/artifacts/execution/team-outputs/TOUT-TASK-047-V50-DIRECTION.json`
- council approval: `.aof/artifacts/execution/council-reviews/CRP-TASK-047-V50-DIRECTION.json`

## Required Outcomes

Required:

- define an actor skill packet contract
- connect skills, capabilities, resources, and policies into actor assignment
- expose capability fit and missing skill evidence as assignment signals
- require policy evaluation and resource claim evidence where governed boundaries are crossed
- project actor skill state into the Human Recognition Interface
- add benchmark cases that fail when skill evidence is missing, actor assignment is weak, release state is stale, or allocation bypasses policy

Deferred:

- broad autonomous execution claims
- decorative viewer expansion
- general analytics dashboards that do not affect assignment or review
- plugin ecosystem work before actor contracts are stable

## Release Gates

### Gate 1: Actor Skill Packet Contract

- a canonical artifact contract exists for actor skill packets
- `docs/v5-actor-skill-packet-contract.md` is the canonical contract document
- `schemas/aof-actor-skill-packet.schema.json` is the canonical packet schema
- the contract includes objective, role, skill, capability fit, resource refs, policy refs, expected output, review criteria, blocker semantics, and HRI projection

### Gate 2: Governed Assignment

- runtime can explain why an actor or role was selected
- missing skill evidence can block or degrade assignment
- resource and policy constraints are visible before execution

### Gate 3: Human Recognition Projection

- the Human Recognition Interface can show actor skill state, current assignment, confidence, blocker, and review state from canonical artifacts

### Gate 4: Negative Benchmarks

- benchmark coverage includes at least:
  - missing skill evidence
  - weak actor assignment
  - stale release state
  - policy-bypassed allocation

### Gate 5: Runtime Discipline

- direction, assignment, review, and release claims remain runtime-backed
- no new authority boundary is introduced
- Discovery and Need Validation boundaries remain unchanged

## Current Recommendation

Prepare:

- `v5.0.0 = Skillful Actor Runtime`

`TASK-048` was the parent v5.0 theme. It is now complete.

The concrete execution sequence is:

1. `TASK-049`: Define the actor skill packet contract (`docs/v5-actor-skill-packet-contract.md`, `schemas/aof-actor-skill-packet.schema.json`).
2. `TASK-050`: Implement the actor skill packet writer and fixtures.
3. `TASK-051`: Implement capability-fit and actor assignment evaluation.
4. `TASK-052`: Implement resource claim and policy gate integration.
5. `TASK-053`: Add Skillful Actor negative benchmarks.
6. `TASK-054`: Project Skillful Actor state into the Human Recognition Interface and commit one self-hosting proof chain.

All six implementation slices are complete: `TASK-049` defined the packet contract, `TASK-050` implemented the writer and fixture surface, `TASK-051` made actor assignment judgeable through capability-fit evaluation, `TASK-052` connected selected assignments to resource claims and policy gate evidence, `TASK-053` made fake v5.0 success fail through negative benchmarks, and `TASK-054` projected the Skillful Actor state into HRI with one committed self-hosting proof chain. The parent `TASK-048` is complete; the runtime is now waiting for a runtime-backed direction review to select the next frontier.

Completion evidence includes:

- active skill packet, assignment evaluation, execution gate, and benchmark state are available to HRI-facing artifacts
- actor, skill, resource/policy gate state, council review need, blocker, and next action are projected from canonical artifacts
- one proof chain demonstrates `TASK-048` from skill packet through benchmark and projection
- the projection remains derived from canonical runtime artifacts
- runtime situation assessment reports `frontier-definition-needed` after `TASK-048` closure while HRI projection and proof remain the evidence that the parent chain is complete

The release should not claim general autonomy.  
It should claim a narrower and more valuable thing: AOF can make an actor more skillful by assigning work through explicit skill, capability, resource, policy, and review evidence.
