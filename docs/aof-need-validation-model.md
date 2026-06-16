# AOF Need Validation Model

Date: `2026-06-16`

## Purpose

AOF must not assume that an incoming need is already correct.

Before project creation, AOF must be able to:

- validate the need
- reframe the need
- reject the need
- defer the need
- require an experiment before project creation

The purpose of this capability is not to create more projects.
The purpose is to ensure that AOF works on the correct problem.

## Required Flow

```text
Need
  -> Need Validation
  -> Validated Need
  -> Project Charter
  -> Council Approval
  -> Project Creation
  -> Organization Formation
  -> Execution
```

Projects without a validated need are non-compliant.

## Mandatory Authority

Need Validation is allowed to conclude:

- no project should be created
- more evidence is required
- the need should be reframed
- the need should be deferred
- an experiment should run before project creation

## Required Artifacts

### 1. Problem Statement

Command:

- `aof problem-statement-record`

Defines:

- who is affected
- what problem exists
- why it matters
- why it exists now

### 2. Value Hypothesis

Command:

- `aof value-hypothesis-record`

Defines:

- expected value creation
- beneficiary
- evidence supporting the value claim
- success criteria

### 3. Alternative Analysis

Command:

- `aof alternative-analysis-record`

Defines:

- alternative solutions
- non-solution options
- defer options
- stop options

### 4. Experiment Proposal

Command:

- `aof experiment-proposal-record`

Defines:

- smallest testable validation
- expected learning
- expected cost
- success threshold

This artifact is optional when project creation is approved immediately, but mandatory when Need Validation concludes that experimentation is required.

### 5. Project Charter

Command:

- `aof project-charter-record`

Defines:

- validated objective
- scope
- constraints
- expected outcomes

### 6. Need Validation Record

Command:

- `aof need-validation-record`

This is the gate artifact that ties the above outputs together and records whether project creation is allowed.

### 7. Need Validation Advance

Command:

- `aof need-validation-advance`

This command advances a framed session from the `need-validation` gate to `planning` only when the need validation record and linked project charter authorize project creation.

### 8. Need Validation Benchmark

Command:

- `aof need-validation-benchmark`

This command evaluates whether the current project contains evidence for the `NV-001` through `NV-006` benchmark family.

## Required Validation Questions

Need Validation should attempt to answer:

- Who is affected?
- What problem actually exists?
- What evidence supports the problem?
- Why does it matter?
- Why now?
- What happens if nothing is done?
- What alternative explanations exist?
- What alternative solutions exist?
- How can the assumption be tested cheaply?
- What outcome would prove success?

## Benchmark Family

Need Validation introduces the following benchmark family.

- `NV-001 Need Validation`: detect incorrect or weak needs
- `NV-002 False Problem Rejection`: reject solution requests that do not correspond to validated problems
- `NV-003 Value Hypothesis Quality`: ensure value claims are evidence-based
- `NV-004 Alternative Discovery`: verify that alternatives were considered
- `NV-005 Experiment Efficiency`: prefer the cheapest meaningful validation
- `NV-006 Project Readiness`: verify that the project charter is based on a validated need

## Relationship To Discovery

Discovery remains useful, but it is not the project creation gate by itself.

The contract is:

```text
Discovery artifacts
  -> discovery handoff
  -> Need Validation
  -> Validated Need
  -> Project Charter
```

Discovery can widen the search space.
Discovery handoff is the upstream required-input candidate when discovery has already happened.
Need Validation decides whether there is a project worth creating.
Discovery alone never authorizes project creation.
