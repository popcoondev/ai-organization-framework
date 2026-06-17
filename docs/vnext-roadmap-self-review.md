# AOF 2.3 To 3.0 Roadmap Self-Review

Date: `2026-06-14`

## Verdict

The revised roadmap is internally consistent with the current repository state and with the released `v2.2.0` capability-layer baseline.

No blocking contradiction was found.

## What Was Checked

### 1. `v2.2` Boundary Consistency

Checked against:

- `docs/v2.2-release-definition.md`
- `docs/v2.2-integration-boundary.md`

Result:

- The roadmap does not claim autonomous workforce runtime in `v2.3`, `v2.4`, or `v2.5`.
- `v2.3` remains an operationalization of existing artifacts, which is consistent with `v2.2 = represent / validate / inspect`.
- The first release that crosses into governed runtime claims is `v3.0`, which matches the documented boundary.

### 2. Existing Planning Artifact Consistency

Checked against:

- `docs/vnext-requirements-analysis.md`
- `docs/vnext-release-plan.md`
- `docs/vnext-aof21-planning-summary.md`

Result:

- The roadmap keeps the central product direction: AOF as an AI Organization Operating System.
- The roadmap refines the `v3.0` target from a broader aspiration to a more execution-ready and time-realistic bar.
- This is an allowed update because it improves realizability without contradicting previous planning artifacts.

### 3. Current `main` Compatibility

Checked against:

- current `main` contents after the `v2.2` forward-port
- preserved cadence-related workflows and commands
- preserved `vnext` planning docs

Result:

- The roadmap does not require rolling back cadence surfaces already on `main`.
- The roadmap treats current `main` additions as foundation, not noise.
- No proposed `2.x` step assumes deletion of active planning or cadence artifacts.

### 4. Organization Artifact Consistency

Checked against:

- `.aof/organization.json`
- `.aof/capability-registry.json`
- `organization-verify`

Result:

- The revised roadmap continues to use councils, teams, contracts, dependencies, policy, capability, and resource layers that already exist in the self-hosting organization artifact.
- No roadmap step assumes a concept that is absent from the current model without introducing an intermediate release first.

### 5. Speed And Scope Realism

Result:

- The previous roadmap jumped too quickly from planning proof to broad runtime ambition.
- The new sequence is more implementable:
  - `v2.3`: operator surfaces
  - `v2.4`: execution contracts
  - `v2.5`: governed allocation
  - `v3.0`: backend-neutral organization runtime
- This sequence preserves momentum while reducing the risk of an incoherent `v3.0`.

## Risks Still Present

- `v2.3` can still bloat if it tries to solve all reporting surfaces at once.
- `v2.4` may accidentally drift into backend-specific execution assumptions unless packet contracts stay neutral.
- `v2.5` policy evaluation must avoid pretending to be full runtime enforcement.
- `v3.0` should not overclaim autonomous multi-agent behavior beyond what the backend contracts can actually support.

## Recommendation

Adopt the revised roadmap as the current planning baseline.

If a further refinement is needed next, it should focus on:

- narrowing `v2.3` to the smallest set of operator surfaces that unlock daily use
- defining a minimal `v2.4` execution packet contract before adding more runtime commands
