# Decision Record: DEC-MQIP3JV9-ROY1MG

- Record Format Version: 1.0.0
- Created At: 2026-06-17T23:21:38.132Z
- Canonical Markdown Path: .aof/decisions/DEC-MQIP3JV9-ROY1MG.md

## Scope
- Record Format Version: 1.0.0
- Created At: 2026-06-17T23:21:38.132Z
- Canonical Markdown Path: .aof/decisions/DEC-MQIP3JV9-ROY1MG.md
- Scope: requirements-approval
- Stage: planning
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
- Option A: Advance to planning with the current frame
- Option B: Ask another clarification round before planning
- Option C: Stop and request manual intake review

## Decision
- Selected Option: Advance to planning with the current frame
- Decision Summary: Clarification has produced a usable frame and the session can advance to planning.

## Governance
- Governance Model: council-of-three
- Decision Makers: aof-builder-01 (Builder), aof-visionary-01 (Visionary)
- Governance Rule Applied: majority-with-guardian-veto
- Veto Used: No

## Rationale
- Why this option: The request now has enough framed need, intent, and context to plan against.
- Why other options were not selected: Additional clarification is not required for the next planning step, and stopping would discard a usable frame.
- Policy priorities applied: value > quality > safety > speed > cost
- Policy tradeoffs accepted: planning starts once framing is usable, even though future review may still reopen the work

## Execution
- Actions: carry the framed need, intent, and context into planning
- Actions: prepare a Builder-led plan packet
- Actions: keep clarification history available for audit and reopen
- Expected Artifact: planning packet and initial implementation or design plan
- Expected Outcome: the session can enter Builder-led planning with a stable framed request
- Completion Criteria: framed request is recorded and a planning-stage decision exists
- Success Criteria: planning can proceed without reopening clarification immediately
- Completion Approval Scope: requirements-approval
- Success Evaluation Scope: planning-stage startup review

## Forecast Optional
- Forecast Required: false
- Forecast Summary: not required before initial planning begins
- Uncertainty Notes: planning may still reopen clarification if feasibility or risk gaps emerge

## Actor Notes Optional
- Actor Performance Notes: not evaluated yet
- Capacity Notes: not evaluated yet
- Fit Notes: Builder-led planning is now appropriate because the framing gate is complete
- Protocol Thread ID: SESS-MQIOS2S3-GKB1T4

## Routing Optional
- Routing Mode: deep-path
- Max Retries: 2
- Escalation Target: human-maintainer
- Context Snapshot ID: CTX-MQIOSEGL-BJOJO8

## Review
- Change Trigger: clarification answers completed the initial frame
- Review Trigger: when planning yields a proposal or reopens clarification
- Review Date or Condition: at planning completion or on new blocking ambiguity
- Re-open Conditions: new conflicting signal, weak planning feasibility, or policy conflict

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
