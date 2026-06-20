# v5 Actor Skill Packet Contract

## Purpose

The Actor Skill Packet is the first v5.0 contract for making AOF actors genuinely skillful at runtime.

It is not a decorative character description and it is not a generic prompt. It is the governed assignment packet that tells AOF why a specific actor or role should do a specific piece of work, which skill is being invoked, what capability evidence supports the assignment, which resources and policies apply, what output must be produced, how the work will be reviewed, and how the state should appear in the Human Recognition Interface.

## Boundary

`TASK-048` is the parent v5.0 theme. `TASK-049` defines only the contract.

This contract does not yet implement the writer command, capability scoring runtime, resource/policy gate, benchmark suite, or HRI projection. Those are owned by `TASK-050` through `TASK-054`.

## Canonical Schema

Schema ref:

- `schemas/aof-actor-skill-packet.schema.json`

Canonical packet type:

- `actor-skill-packet`

Format version:

- `packet_format_version: 1`

## Required Fields

An Actor Skill Packet must include:

- `packet_id`: stable packet id.
- `recorded_at`: creation timestamp.
- `source_task_id`: source AOF task.
- `source_parent_session_id`: orchestrator or parent session that produced the packet.
- `objective`: the work objective in operator-readable language.
- `assignment`: selected actor or role, team, execution mode, and assignment rationale.
- `required_skill_refs`: skills being invoked.
- `capability_fit`: capability evidence and fit state.
- `resource_refs`: resources the actor needs.
- `policy_refs`: policies that govern the assignment.
- `expected_output_contract`: required output artifact shape and acceptance criteria.
- `review_criteria`: evaluator, evidence requirement, and blocking criteria.
- `blocker_semantics`: how missing or weak evidence blocks, degrades, escalates, or requests evidence.
- `hri_projection`: what the Human Recognition Interface can show for the actor.
- `status`: draft, ready-for-assignment, blocked, or completed.

## Fit States

`capability_fit[].fit_state` is intentionally narrow:

- `strong`: evidence strongly supports the assignment.
- `sufficient`: evidence is adequate to proceed.
- `weak`: assignment can proceed only with visible risk.
- `missing`: required evidence is absent.
- `blocked`: assignment must not proceed until recovered.

## Blocking Semantics

A packet may block or degrade assignment without inventing new authority.

Allowed consequences:

- `block-assignment`
- `degrade-confidence`
- `require-council-review`
- `request-evidence`

Council and policy authority still live in the existing governance model. The packet makes the reason visible and auditable.

## Human Recognition Interface Mapping

The packet is the runtime source for the actor state shown in HRI:

| Packet field | HRI use |
|---|---|
| `assignment.actor_ref` / `assignment.role_ref` | character identity |
| `objective` | current actor objective |
| `required_skill_refs` | visible skill badge |
| `capability_fit[].fit_state` | confidence / risk state |
| `blocker_semantics` | visible blocker labels |
| `hri_projection.speech_bubble` | character speech bubble |
| `hri_projection.next_action` | next visible action |

HRI must not fabricate actor state that is absent from this packet or another canonical runtime artifact.

## Minimal Valid Example

```json
{
  "packet_type": "actor-skill-packet",
  "packet_format_version": 1,
  "recorded_at": "2026-06-20T10:00:00.000Z",
  "packet_id": "ASP-TASK-049-BUILDER",
  "source_task_id": "TASK-049",
  "source_parent_session_id": "SESS-MQM6-V50-SKILLFUL-ACTOR",
  "source_decision_record_id": null,
  "objective": "Define the v5.0 actor skill packet contract.",
  "assignment": {
    "actor_ref": "codex",
    "role_ref": "builder",
    "team_ref": "runtime-team",
    "assignment_reason": "Builder owns runtime artifact contract implementation.",
    "execution_mode": "single-actor"
  },
  "required_skill_refs": ["skill-schema-review"],
  "capability_fit": [
    {
      "capability_ref": "cap-schema-review",
      "fit_state": "sufficient",
      "evidence_refs": ["schemas/aof-actor-skill-packet.schema.json"],
      "rationale": "The task is contract-first and schema-centered."
    }
  ],
  "resource_refs": ["resource-repo-main"],
  "policy_refs": ["policy-runtime-backed-answer-discipline"],
  "expected_output_contract": {
    "artifact_type": "actor-skill-packet-contract",
    "artifact_schema_ref": "schemas/aof-actor-skill-packet.schema.json",
    "required_sections": ["assignment", "capability_fit", "expected_output_contract", "review_criteria"],
    "acceptance_criteria": ["Schema validates", "HRI projection fields are present"]
  },
  "review_criteria": [
    {
      "criterion": "Packet has enough evidence to explain actor selection.",
      "evaluator_ref": "guardian",
      "evidence_required": "skill, capability, resource, policy, and output contract refs",
      "blocking": true
    }
  ],
  "blocker_semantics": [
    {
      "blocker_code": "missing-skill-evidence",
      "trigger_condition": "required_skill_refs is empty or capability evidence is missing",
      "consequence": "block-assignment",
      "recovery_action": "Add skill and capability evidence before assignment."
    }
  ],
  "hri_projection": {
    "character_label": "Builder",
    "speech_bubble": "I have the schema contract and can start the writer after review.",
    "current_action": "Define actor skill packet contract",
    "confidence_label": "medium",
    "visible_blockers": [],
    "next_action": "Submit contract for Guardian review"
  },
  "status": "draft"
}
```

## Completion Criteria For TASK-049

TASK-049 is complete when:

- the schema exists and validates a minimal packet;
- the schema rejects unknown fields and missing required evidence;
- the contract doc explains boundary, required fields, blocker semantics, and HRI mapping;
- `docs/vnext-roadmap.md` and `docs/vnext-release-plan.md` point to this contract as the first v5.0 implementation step;
- when `TASK-049` is closed, runtime situation assessment advances to `TASK-050` without losing the v5.0 roadmap track.
