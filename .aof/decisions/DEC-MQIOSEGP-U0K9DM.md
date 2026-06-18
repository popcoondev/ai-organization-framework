# Decision Record: DEC-MQIOSEGP-U0K9DM

- Record Format Version: 1.0.0
- Created At: 2026-06-17T23:12:57.913Z
- Canonical Markdown Path: .aof/decisions/DEC-MQIOSEGP-U0K9DM.md

## Scope
- Record Format Version: 1.0.0
- Created At: 2026-06-17T23:12:57.913Z
- Canonical Markdown Path: .aof/decisions/DEC-MQIOSEGP-U0K9DM.md
- Scope: requirements-approval
- Stage: clarification
- Organization: AI Organization Framework

## Input
- Request: AOF v3.4 runtimeを使って、CLI context efficiency improvement proposalを評価し、次のrelease goalとして妥当かを判定したい。特に command taxonomy, command registry, AI recognition packet integration が必要かを判断したい。
- Need: 改善対象はAOF CLIの認識効率です。対象範囲は command taxonomy、command registry artifact、AI recognition packet への最小統合、CLI reference から主要コマンドへ到達できる導線整理までです。個別 command の大規模 rename や runtime authority boundary の変更は対象外です。
- Intent: 成功条件は、CLI command を category 単位で読めること、command-registry artifact が存在すること、AI recognition packet から主要 command と runtime flow を短く発見できること、CLI Reference 全文を毎回読まなくても主要 operator path を選べることです。
- Context: context: 改善対象はAOF CLIの認識効率です。対象範囲は command taxonomy、command registry artifact、AI recognition packet への最小統合、CLI reference から主要コマンドへ到達できる導線整理までです。個別 command の大規模 rename や runtime authority boundary の変更は対象外です。 / 変更してはいけない制約は、既存 command の意味を壊さないこと、Discovery と Need Validation の authority boundary を変えないこと、backend-neutrality を維持すること、既存 verification surface を弱めないことです。 | prohibited: 変更してはいけない制約は、既存 command の意味を壊さないこと、Discovery と Need Validation の authority boundary を変えないこと、backend-neutrality を維持すること、既存 verification surface を弱めないことです。 | success: 成功条件は、CLI command を category 単位で読めること、command-registry artifact が存在すること、AI recognition packet から主要 command と runtime flow を短く発見できること、CLI Reference 全文を毎回読まなくても主要 operator path を選べることです。
- Existing Artifacts Reviewed: none
- Background or Prior Decisions: clarification completed in session SESS-MQIOS2S3-GKB1T4
- Clarifications or Assumptions: 今回、何を改善対象とし、どの範囲までを扱いますか => 改善対象はAOF CLIの認識効率です。対象範囲は command taxonomy、command registry artifact、AI recognition packet への最小統合、CLI reference から主要コマンドへ到達できる導線整理までです。個別 command の大規模 rename や runtime authority boundary の変更は対象外です。 / 改善成功は、どの指標または状態で判断しますか => 成功条件は、CLI command を category 単位で読めること、command-registry artifact が存在すること、AI recognition packet から主要 command と runtime flow を短く発見できること、CLI Reference 全文を毎回読まなくても主要 operator path を選べることです。 / 今回、変更してはいけない制約や既存要素はありますか => 変更してはいけない制約は、既存 command の意味を壊さないこと、Discovery と Need Validation の authority boundary を変えないこと、backend-neutrality を維持すること、既存 verification surface を弱めないことです。
- Clarification Summary Optional: runtime は初回の clarification 回答を取り込み、need validation に進める状態になった
- Unresolved Ambiguity Optional: 

## Options Considered
- Option A: Create need validation artifacts before planning
- Option B: Advance directly to planning
- Option C: Stop until more evidence exists

## Decision
- Selected Option: Create need validation artifacts before planning
- Decision Summary: Clarification has produced a usable frame, but planning must wait for need validation and project charter evidence.

## Governance
- Governance Model: council-of-three
- Decision Makers: aof-visionary-01 (Visionary), aof-guardian-01 (Guardian)
- Governance Rule Applied: majority-with-guardian-veto
- Veto Used: No

## Rationale
- Why this option: A framed request is not yet a validated need, so project creation and planning remain gated.
- Why other options were not selected: Direct planning would bypass the need validation policy, and stopping completely would discard a usable frame.
- Policy priorities applied: value > quality > safety > speed > cost
- Policy tradeoffs accepted: speed is deferred until the underlying problem and value claim are validated

## Execution
- Actions: write problem statement and value hypothesis artifacts
- Actions: record alternatives and any required experiment
- Actions: produce a need validation record and project charter before planning
- Expected Artifact: need validation artifact set and project charter
- Expected Outcome: planning only starts after a validated need exists
- Completion Criteria: approved need validation record and project charter are linked into the session
- Success Criteria: the next planning step is grounded in a validated need rather than a raw request
- Completion Approval Scope: requirements-approval
- Success Evaluation Scope: need validation gate review

## Forecast Optional
- Forecast Required: false
- Forecast Summary: not required before need validation completes
- Uncertainty Notes: the stated request may still be reframed, deferred, or rejected

## Actor Notes Optional
- Actor Performance Notes: not evaluated yet
- Capacity Notes: not evaluated yet
- Fit Notes: Visionary and Guardian judgment is required before Builder-led planning begins
- Protocol Thread ID: SESS-MQIOS2S3-GKB1T4

## Routing Optional
- Routing Mode: deep-path
- Max Retries: 2
- Escalation Target: human-maintainer
- Context Snapshot ID: CTX-MQIOSEGL-BJOJO8

## Review
- Change Trigger: clarification answers completed the initial frame
- Review Trigger: when a need validation record and project charter are produced
- Review Date or Condition: before planning starts
- Re-open Conditions: weak evidence, invalid value hypothesis, missing alternatives, or rejected project recommendation

## Escalation Optional
- Escalation Status: none
- Escalation Summary: none
- Approval Outcome Status: none
- Guardian Veto Used Optional: none
- Escalation Resolution: none
- Escalation Resolution Note: none

---

Project Note:
This template controls the markdown shell for the self-hosting AOF project.
