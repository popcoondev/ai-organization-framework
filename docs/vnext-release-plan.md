# Next Release Plan

## Proposed Version

`v3.5.0`

## Release Theme

The next release should introduce a **CLI Context Efficiency Layer** for the self-hosting runtime.

`v3.4.0` made the runtime truthful about its active release baseline after release.  
Running the runtime after that release exposed the next bottleneck:

- the CLI surface is broad enough that humans and AI must reread too much command detail
- command purpose is inferable, but not yet classified through a canonical routing layer
- the problem is not missing execution capability first
- the problem is missing command-surface discoverability and context-efficient routing

This means the next release should not start by adding more commands.  
It should first make the existing command surface easier to discover, route, and summarize.

## Runtime Evidence Basis

Direction-setting runtime evidence:

- task: `TASK-039`
- session: `SESS-MQIOS2S3-GKB1T4`
- framing decision: `.aof/decisions/DEC-MQIOSEGP-U0K9DM.json`
- discovery question set: `.aof/artifacts/discovery/question-sets/DQS-TASK-039.json`
- assumption map: `.aof/artifacts/discovery/assumption-maps/ASM-TASK-039.json`
- anomaly log: `.aof/artifacts/discovery/anomaly-logs/ANL-TASK-039.json`
- discovery judgment: `.aof/artifacts/discovery/judgments/DJP-TASK-039.json`
- discovery handoff: `.aof/artifacts/discovery/handoffs/DHO-TASK-039.json`
- need validation record: `.aof/artifacts/need-validation/records/NVR-TASK-039.json`
- project charter: `.aof/artifacts/need-validation/project-charters/PCH-TASK-039.json`
- planning promotion decision: `.aof/decisions/DEC-MQIP3JV9-ROY1MG.json`

## Required Outcomes

Required:

- canonical command taxonomy for the current CLI surface
- command registry artifact that classifies commands by role in the operator flow
- AI recognition packet integration that surfaces top commands and runtime flow without embedding the full CLI reference
- clear separation between summary routing surfaces and full command detail
- verification or benchmark evidence that major operator paths can be discovered from the new routing layer

Deferred:

- large-scale command renaming
- runtime authority expansion
- new backend-specific execution claims
- replacement of the full CLI reference as the detailed backup surface

## Release Gates

### Gate 1: Command Taxonomy Is Canonical

- commands are classified by a stable category model
- the taxonomy is not merely prose in one document

### Gate 2: Command Registry Exists

- one canonical command registry artifact exists
- registry entries expose enough routing metadata for humans and AI

### Gate 3: Recognition Packet Can Route

- AI recognition packet can discover top commands and runtime flow from the registry
- major operator paths no longer require rereading the full CLI reference first

### Gate 4: Boundaries Stay Honest

- command meanings remain stable
- Discovery and Need Validation authority boundaries remain unchanged
- backend-neutrality remains intact

## Verification Plan

Local verification baseline:

- command registry artifact validates
- recognition packet references the registry
- major operator paths are discoverable through registry-driven summaries

Verification evidence should include:

- a direction review record for `v3.5`
- command registry validation evidence
- a benchmark or narrow contract check for command-routing coverage

Council verification:

- Product Council confirms operator value and prioritization
- Architecture Council confirms registry shape and low-drift maintainability
- Operations Council confirms that the routing layer reduces context cost without creating a second inconsistent CLI source

Human sign-off:

- required before cutting `v3.5.0`

## Risks

- building duplicate documentation instead of canonical routing metadata
- introducing a registry that drifts away from the actual CLI surface
- over-categorizing commands in a way that becomes harder to maintain than the current surface

## Current Recommendation

Proceed with the next narrow release:

- `v3.5.0 = CLI Context Efficiency Layer`
- prioritize command taxonomy, command registry, and recognition-packet routing before adding more command-surface breadth
