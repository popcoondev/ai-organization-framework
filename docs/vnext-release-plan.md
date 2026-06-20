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
- active implementation frontier: `.aof/tasks/open/TASK-048.json`
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
- the contract includes objective, role, skill, capability fit, resource refs, policy refs, expected output, and review criteria

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

Proceed with:

- `v5.0.0 = Skillful Actor Runtime`

`TASK-048` is the parent v5.0 theme. It is not the immediate implementation step.

The concrete execution sequence is:

1. `TASK-049`: Define the actor skill packet contract.
2. `TASK-050`: Implement the actor skill packet writer and fixtures.
3. `TASK-051`: Implement capability-fit and actor assignment evaluation.
4. `TASK-052`: Implement resource claim and policy gate integration.
5. `TASK-053`: Add Skillful Actor negative benchmarks.
6. `TASK-054`: Project Skillful Actor state into the Human Recognition Interface and commit one self-hosting proof chain.

The first implementation slice is `TASK-049`. It should define the exact packet shape before runtime command implementation starts:

- objective
- actor or role
- required skill
- capability-fit evidence
- resource refs
- policy refs
- expected output contract
- review criteria
- blocker semantics
- Human Recognition Interface projection fields

The release should not claim general autonomy.  
It should claim a narrower and more valuable thing: AOF can make an actor more skillful by assigning work through explicit skill, capability, resource, policy, and review evidence.
