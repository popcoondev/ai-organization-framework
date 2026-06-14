#!/usr/bin/env node

import { answerCommand } from "./commands/answer.js";
import { alignmentPulseCommand } from "./commands/alignment-pulse.js";
import { allocationPlanRecordCommand } from "./commands/allocation-plan-record.js";
import { anomalyLogRecordCommand } from "./commands/anomaly-log-record.js";
import { assumptionMapRecordCommand } from "./commands/assumption-map-record.js";
import { policyEvaluationReportCommand } from "./commands/policy-evaluation-report.js";
import { breakthroughLibraryRegisterCommand } from "./commands/breakthrough-library-register.js";
import { breakthroughPatternRecordCommand } from "./commands/breakthrough-pattern-record.js";
import { cadenceFollowThroughCommand } from "./commands/cadence-follow-through.js";
import { cadenceTriggerGuideCommand } from "./commands/cadence-trigger-guide.js";
import { confirmationWindowRecordCommand } from "./commands/confirmation-window-record.js";
import { councilReviewPacketCommand } from "./commands/council-review-packet.js";
import { councilExecCommand } from "./commands/council-exec.js";
import { councilCommand } from "./commands/council.js";
import { decisionVerifyCommand } from "./commands/decision-verify.js";
import { decisionRegisterCommand } from "./commands/decision-register.js";
import { discoveryJudgmentPacketCommand } from "./commands/discovery-judgment-packet.js";
import { discoveryHandoffRecordCommand } from "./commands/discovery-handoff-record.js";
import { discoveryQuestionSetRecordCommand } from "./commands/discovery-question-set-record.js";
import { contractRegisterCommand } from "./commands/contract-register.js";
import { dependencyGraphCommand } from "./commands/dependency-graph.js";
import { escalationResolveCommand } from "./commands/escalation-resolve.js";
import { executionLineageCommand } from "./commands/execution-lineage.js";
import { goalProjectCommand } from "./commands/goal-project.js";
import { initProjectCommand } from "./commands/init-project.js";
import { learningLoopSnapshotCommand } from "./commands/learning-loop-snapshot.js";
import { liveVerifyCommand } from "./commands/live-verify.js";
import { organizationStatusCommand } from "./commands/organization-status.js";
import { organizationAuditCommand } from "./commands/organization-audit.js";
import { organizationVerifyCommand } from "./commands/organization-verify.js";
import { outcomeReportCommand } from "./commands/outcome-report.js";
import { packetCommand } from "./commands/packet.js";
import { providerCheckCommand } from "./commands/provider-check.js";
import { retireCandidateReviewCommand } from "./commands/retire-candidate-review.js";
import { resourceClaimRecordCommand } from "./commands/resource-claim-record.js";
import { roleJoinRecordCommand } from "./commands/role-join-record.js";
import { roleResultRecordCommand } from "./commands/role-result-record.js";
import { runtimeLoopProofCommand } from "./commands/runtime-loop-proof.js";
import { runCommand } from "./commands/run.js";
import { selfAuditRecordCommand } from "./commands/self-audit-record.js";
import { signalCommand } from "./commands/signal.js";
import { taskOpenCommand } from "./commands/task-open.js";
import { taskUpdateCommand } from "./commands/task-update.js";
import { teamOutputRecordCommand } from "./commands/team-output-record.js";
import { upgradeProjectCommand } from "./commands/upgrade-project.js";
import { verifyHistoryCommand } from "./commands/verify-history.js";
import { verifyDashboardCommand } from "./commands/verify-dashboard.js";
import { verifyDashboardIndexCommand } from "./commands/verify-dashboard-index.js";
import { verifyDashboardLogCommand } from "./commands/verify-dashboard-log.js";
import { verifyArchiveCommand } from "./commands/verify-archive.js";
import { verifyArchiveDashboardCommand } from "./commands/verify-archive-dashboard.js";
import { verifyArchiveLogCommand } from "./commands/verify-archive-log.js";
import { verifyLineageCommand } from "./commands/verify-lineage.js";
import { verifyLogCommand } from "./commands/verify-log.js";
import { visibilityServeCommand } from "./commands/visibility-serve.js";

function printHelp() {
  console.log(`AOF prototype CLI

Usage:
  aof run "<request>" [--project <path>] [--fast-track|--deep-path]
  aof init [--project <path>] --topology <self-hosting|managed-project> [--write-target <target>] [--project-type <type>] [--domain-summary "<text>"] [--install-mode <runtime-on|framing-only>]
  aof upgrade [--project <path>] [--write-target <target>] [--install-mode <runtime-on|framing-only>]
  aof answer --session <path> --response "<text>" [--response "<text>"]
  aof outcome-report --session <path> --result <success|partial|failure> [--note "<text>"] [--signal-ref <ref>]
  aof allocation-plan-record --project <path> --subject-ref <ref> --target-role-ref <ref> [--target-role-ref <ref>] [--candidate-resource-ref <ref>] --recommended-allocation-json '<json>' [--recommended-allocation-json '<json>'] [--unfilled-role-ref <ref>] [--policy-ref <ref>] [--risk-note "<text>"] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof policy-evaluation-report --project <path> --subject-ref <ref> --evaluation-scope "<text>" --overall-outcome <allowed|requires-approval|requires-review|escalate|denied> [--policy-ref <ref>] --result-json '<json>' [--result-json '<json>'] [--recommended-action "<text>"] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof resource-claim-record --project <path> --subject-ref <ref> --resource-ref <ref> --claimant-role-ref <ref> --claim-scope "<text>" --claim-status <requested|approved|denied|released> [--approval-policy-ref <ref>] --justification "<text>" [--allocation-plan-ref <path>] [--policy-evaluation-ref <path>] [--expires-at <date-time>] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof task-open --project <path> --title "<text>" [--description "<text>"] [--origin <origin>] [--orchestrator-session-id <id>] [--assigned-session-id <id>] [--related-decision-record-id <id>] [--operating-goal-ref <ref>] [--triage-notes "<text>"]
  aof task-update --project <path> --task-id <TASK-id> [--status <open|assigned|done|archived|retired>] [--assigned-session-id <id>] [--related-decision-record-id <id>] [--triage-notes "<text>"]
  aof goal-project --project <path> --goal-type <north-star|operating-goal|next-value-slice> --content "<text>" [--agreed-with-human] [--source-session-id <id>] [--source-decision-record-id <id>] [--declared-complete]
  aof confirmation-window-record --project <path> --question "<text>" --answer "<text>" [--expectation-state "<text>"] [--mismatch-state "<text>"] [--scale-direction "<text>"] [--source-session-id <id>] [--source-decision-record-id <id>] [--max-entries <n>]
  aof alignment-pulse --project <path> --question "<text>" --answer "<text>" [--expectation-state "<text>"] [--mismatch-state "<text>"] [--scale-direction "<text>"] [--prioritized-task-id <TASK-id>] [--stale-task-id <TASK-id>] [--retire-candidate-task-id <TASK-id>] [--triage-note "<text>"] [--source-session-id <id>] [--source-decision-record-id <id>] [--max-entries <n>]
  aof cadence-trigger-guide --project <path> [--source-session-id <id>] [--source-decision-record-id <id>] [--max-entries <n>]
  aof cadence-follow-through --project <path> [--resolution <retire|keep-open>] [--note "<text>"] [--source-session-id <id>] [--source-decision-record-id <id>] [--max-entries <n>]
  aof self-audit-record --project <path> --audit-id <id> --scope "<text>" --summary "<text>" --detected-gap "<text>" --next-action "<text>" [--result-state <active|stable|escalate>] [--related-task-id <TASK-id>] [--source-session-id <id>] [--source-decision-record-id <id>] [--next-value-slice "<text>"] [--max-entries <n>]
  aof retire-candidate-review --project <path> --resolution <retire|keep-open> --task-id <TASK-id> [--task-id <TASK-id>] --note "<text>" [--source-session-id <id>] [--source-decision-record-id <id>] [--max-entries <n>]
  aof live-verify --project <path> [--request "<text>"] [--response "<text>"] [--signal-response "<text>"] [--escalation-response "<text>"] --provider <provider> --artifact-dir <path> [--model <name>] [--base-url <url>] [--api-key-env <name>] [--ping] [--include-middle-stages] [--include-approval] [--include-signal-reopen] [--include-escalation-reopen] [--include-escalation-terminal] [--signal-path <path>] [--timeout-ms <ms>] [--max-retries <n>] [--archive] [--archive-dir <path>] [--archive-max-runs <n>]
  aof decision-verify [--project <path>]
  aof decision-register [--project <path>]
  aof discovery-question-set-record --project <path> --discovery-objective "<text>" --key-question "<text>" [--key-question "<text>"] --target-user-or-market-slice "<text>" [--target-assumption "<text>"] [--target-anomaly "<text>"] [--signal "<text>"] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--note "<text>"] [--write-artifact <path>]
  aof breakthrough-pattern-record --project <path> --source-domain "<text>" --triggering-tension "<text>" --broken-assumption "<text>" --enabling-tool-or-method "<text>" --transfer-hypothesis "<text>" --expected-relevance "<text>" [--evidence-ref <path>] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--note "<text>"] [--write-artifact <path>]
  aof breakthrough-library-register [--project <path>]
  aof assumption-map-record --project <path> --subject "<text>" --assumption-json '<json>' [--assumption-json '<json>'] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof anomaly-log-record --project <path> --subject "<text>" --anomaly-json '<json>' [--anomaly-json '<json>'] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof discovery-judgment-packet --project <path> --council-id <id> --judgment-status <continue-exploration|pivot|synthesize-handoff|stop> --decision-summary "<text>" --rationale "<text>" --desirability-assessment "<text>" --feasibility-assessment "<text>" --risk-assessment "<text>" --evidence-quality-state <weak|mixed|sufficient|strong|contested> --recommended-next-step "<text>" [--question-set-ref <path>] [--artifact-ref <path>] [--follow-up-question "<text>"] [--promotion-ready] [--handoff-required] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof discovery-handoff-record --project <path> --selected-need "<text>" --intended-user-or-segment "<text>" --context-summary "<text>" --hypothesis "<text>" [--evidence-ref <path>] [--rejected-alternative "<text>"] [--explicit-risk "<text>"] [--delivery-validation "<text>"] --need "<text>" --intent "<text>" --context "<text>" [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof role-result-record --project <path> --role <role> --stage <stage> --session-id <id> --status <completed|blocked|partial> --recommendation "<text>" --rationale "<text>" [--signal "<text>"] [--artifact-ref <path>] [--decision-required] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--blocking-reason "<text>"] [--missing-input "<text>"] [--confidence <0-1>] [--write-artifact <path>]
  aof role-join-record --project <path> --stage <stage> --expected-role <role> [--expected-role <role>] [--received-role <role>] [--missing-role <role>] --aggregate-state <ready-for-orchestrator-decision|waiting-for-missing-roles|blocked-by-signal|degraded-partial-join> --recommended-next-step "<text>" [--blocking-signal "<text>"] [--received-session-id <id>] [--join-status <open|resolved|escalated>] [--summary "<text>"] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--decision-record-ref <path>] [--write-artifact <path>]
  aof team-output-record --project <path> --team-id <id> --stage <stage> --expected-role <role> [--expected-role <role>] [--received-role <role>] [--missing-role <role>] --aggregate-state <ready-for-council-review|waiting-for-missing-roles|blocked-by-signal|degraded-partial-team-output> --recommended-next-step "<text>" [--role-result-ref <path>] [--artifact-ref <path>] [--blocking-signal "<text>"] [--decision-required] [--summary "<text>"] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof council-review-packet --project <path> --council-id <id> --stage <stage> --review-status <approved|changes-requested|blocked|deferred> --decision-summary "<text>" --rationale "<text>" --recommendation "<text>" [--team-output-ref <path>] [--role-result-ref <path>] [--evidence-ref <path>] [--follow-up-task-id <TASK-id>] [--escalation-required] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof runtime-loop-proof --project <path> [--request "<text>"] [--response "<text>"] [--response "<text>"] [--provider <provider>] [--routing-mode <fast-track|deep-path>] [--source-task-id <TASK-id>] [--write-artifact <path>]
  aof execution-lineage [--project <path>] [--source-parent-session-id <id>] [--source-task-id <TASK-id>] [--stage <stage>]
  aof learning-loop-snapshot [--project <path>]
  aof contract-register [--project <path>]
  aof dependency-graph [--project <path>]
  aof metrics-snapshot [--project <path>]
  aof organization-audit [--project <path>]
  aof organization-status [--project <path>]
  aof organization-analytics-snapshot [--project <path>]
  aof organization-verify [--project <path>]
  aof roadmap-status [--project <path>]
  aof verify-archive --project <path> --input <path> [--input <path>] [--archive-dir <path>] [--max-runs <n>]
  aof verify-archive-dashboard --index-input <path> --log-input <path> --artifact-dir <path>
  aof verify-archive-log --input <path> [--input <path>] --artifact-dir <path>
  aof verify-history --input <path> [--input <path>] --artifact-dir <path>
  aof verify-log --input <path> [--input <path>] --artifact-dir <path>
  aof verify-lineage --history-input <path> --log-input <path> --index-input <path> --artifact-dir <path>
  aof verify-dashboard --history-input <path> --log-input <path> --index-input <path> --lineage-input <path> --artifact-dir <path>
  aof verify-dashboard-log --input <path> [--input <path>] --artifact-dir <path>
  aof verify-dashboard-index --log-input <path> --artifact-dir <path>
  aof visibility-export [--project <path>] [--artifact-dir <path>]
  aof visibility-serve --status-input <path> --timeline-input <path> --flow-input <path> [--host <host>] [--port <port>] [--title <text>]
  aof packet --session <path> --stage <stage> [--project <path>] [--role <role>]
  aof council --session <path> --stage <stage> [--project <path>] [--role <role>] [--include-optional]
  aof council-exec --session <path> --stage <stage> [--project <path>] [--role <role>] [--include-optional] [--invoke-model] [--provider <provider>] [--model <name>] [--mock-seat-decision <Role=decision>] [--mock-seat-veto <Role=yes|no>] [--write-artifact <path>] [--timeout-ms <ms>] [--max-retries <n>]
  aof provider-check [--provider <provider>] [--model <name>] [--base-url <url>] [--api-key-env <name>] [--ping] [--write-artifact <path>] [--timeout-ms <ms>] [--max-retries <n>]
  aof escalation-resolve --session <path> --resolution <approve|reopen|stop> --note "<text>"
  aof signal --session <path> --signal <path>

Examples:
  aof run "初回離脱率を下げたい"
  aof init --project . --topology managed-project --project-type web-app --domain-summary "Internal operations dashboard"
  aof upgrade --project . --install-mode runtime-on
  aof run "初回離脱率を下げたい" --project ./examples/aidlc-template
  aof answer --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --response "新規登録導線全体" --response "登録完了率" --response "認証基盤は変更しない"
  aof outcome-report --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --result success --note "登録導線の KPI が改善した" --signal-ref SIG-001
  aof allocation-plan-record --project . --subject-ref TASK-010 --target-role-ref builder --candidate-resource-ref resource-repo-main --candidate-resource-ref resource-npm-test --recommended-allocation-json '{"role_ref":"builder","primary_resource_ref":"resource-repo-main","supporting_resource_refs":["resource-npm-test"],"rationale":"repo access and verification support are both needed","capability_refs":["cap-contract-alignment"],"constraint_refs":["policy-main-branch-access"],"workload_state":"available","approval_required":true}' --policy-ref policy-main-branch-access --risk-note "main-branch writes remain review-gated" --source-task-id TASK-010
  aof policy-evaluation-report --project . --subject-ref TASK-010 --evaluation-scope "allocation recommendation review" --overall-outcome requires-review --policy-ref policy-main-branch-access --result-json '{"policy_id":"policy-main-branch-access","effect":"require-review","outcome":"requires-review","reason":"repository writes stay review-gated","blocking":false}' --recommended-action "Route allocation through review before execution." --source-task-id TASK-010
  aof resource-claim-record --project . --subject-ref TASK-010 --resource-ref resource-repo-main --claimant-role-ref builder --claim-scope "temporary repository write access for v2.5 implementation slice" --claim-status requested --approval-policy-ref policy-main-branch-access --justification "allocation plan recommends repo access but policy requires review before use" --allocation-plan-ref .aof/artifacts/allocation/plans/APL-001.json --policy-evaluation-ref .aof/artifacts/allocation/policy-evaluations/PER-001.json --source-task-id TASK-010
  aof task-open --project ./examples/aidlc-template --title "Add runtime write path" --origin orchestrator --operating-goal-ref v1.8-self-hosting
  aof task-update --project ./examples/aidlc-template --task-id TASK-001 --status done --related-decision-record-id DEC-001
  aof goal-project --project ./examples/aidlc-template --goal-type next-value-slice --content "Add runtime write path for tasks and goals" --agreed-with-human
  aof confirmation-window-record --project ./examples/aidlc-template --question "まだ解くべき問題は同じか" --answer "はい。runtime write path が最優先" --expectation-state "self-hosting gap remains active"
  aof alignment-pulse --project ./examples/aidlc-template --question "まだ解くべき問題は同じか" --answer "はい。task triage cadence を runtime に入れる" --prioritized-task-id TASK-004 --triage-note "cadence-focused pulse after v1.9.0"
  aof cadence-trigger-guide --project ./examples/aidlc-template --source-session-id SESS-ORCH-001 --source-decision-record-id DEC-004
  aof cadence-follow-through --project ./examples/aidlc-template --resolution keep-open --note "Retain the task after guided follow-through"
  aof self-audit-record --project ./examples/aidlc-template --audit-id FSA-007 --scope "post-pulse cadence review" --summary "task triage cadence is now runtime-backed" --detected-gap "self-audit cadence is still weaker than pulse-backed task triage" --next-action "make self-audit cadence refresh through the same operating loop" --related-task-id TASK-004 --next-value-slice "Extend TASK-004 into runtime-backed self-audit cadence"
  aof retire-candidate-review --project ./examples/aidlc-template --resolution keep-open --task-id TASK-004 --note "Retain the task for the next cadence slice"
  aof live-verify --project ./examples/aidlc-template --provider mock --artifact-dir /tmp/aof-live-verification --include-middle-stages --include-approval --include-signal-reopen --include-escalation-reopen --include-escalation-terminal --timeout-ms 30000 --max-retries 0 --archive --archive-max-runs 10
  aof decision-verify --project ./examples/aidlc-template
  aof decision-register --project ./examples/aidlc-template
  aof discovery-question-set-record --project . --discovery-objective "Identify the highest-value onboarding friction to investigate" --key-question "Which user segment drops before activation?" --key-question "Which assumption is weakest?" --target-user-or-market-slice "newly invited workspace admins" --target-assumption "activation is blocked by permissions confusion" --signal "pivot if interviews contradict funnel analytics"
  aof breakthrough-pattern-record --project . --source-domain "aviation safety" --triggering-tension "rare failures were hidden by success-path reporting" --broken-assumption "aggregate success metrics are enough" --enabling-tool-or-method "incident review discipline" --transfer-hypothesis "retain anomaly evidence in product discovery" --expected-relevance "improve early problem framing" --evidence-ref docs/research/incident-notes.md
  aof breakthrough-library-register --project .
  aof assumption-map-record --project . --subject "activation funnel discovery" --assumption-json '{"assumption":"workspace admins understand permission setup","assumption_type":"user","confidence":0.4,"evidence_state":"weak","break_test_question":"What percentage can explain setup without help?"}'
  aof anomaly-log-record --project . --subject "activation funnel discovery" --anomaly-json '{"observed_anomaly":"high-intent admins abandon after invite acceptance","why_it_matters":"intent is present but setup still fails","challenged_assumption":"drop-off is caused by low motivation","follow_up_recommendation":"interview recent abandons","evidence_refs":["docs/research/funnel-notes.md"]}'
  aof discovery-judgment-packet --project . --council-id discovery-council --judgment-status synthesize-handoff --decision-summary "The question is narrow enough to hand off." --rationale "Discovery reduced the problem to permission setup confusion." --desirability-assessment "The problem is painful for a clear segment." --feasibility-assessment "A small onboarding intervention is plausible." --risk-assessment "Evidence is still limited but sufficient for delivery-side validation." --evidence-quality-state sufficient --recommended-next-step "Create a delivery handoff packet." --question-set-ref .aof/artifacts/discovery/question-sets/DQS-001.json --artifact-ref .aof/artifacts/discovery/assumption-maps/ASM-001.json --follow-up-question "Which validation metric should gate rollout?" --promotion-ready --handoff-required
  aof discovery-handoff-record --project . --selected-need "Reduce activation failure for invited admins" --intended-user-or-segment "newly invited workspace admins" --context-summary "analytics and interviews indicate confusion during permission setup" --hypothesis "clearer permission framing will improve activation completion" --evidence-ref docs/research/funnel-notes.md --rejected-alternative "focus on invite email copy first" --explicit-risk "sample size is still small" --delivery-validation "validate permission-step comprehension before UI rollout" --need "Reduce activation failure for invited admins" --intent "Ship the smallest validated onboarding change" --context "Discovery narrowed the problem to permission setup confusion"
  aof role-result-record --project . --role Builder --stage planning --session-id SESS-001 --status completed --recommendation "merge into team packet" --rationale "implementation path is coherent" --signal "needs Guardian review" --artifact-ref docs/spec.md --decision-required --source-task-id TASK-012 --source-parent-session-id SESS-PARENT-001
  aof role-join-record --project . --stage planning --expected-role Builder --expected-role Guardian --expected-role Visionary --received-role Builder --received-role Guardian --aggregate-state waiting-for-missing-roles --recommended-next-step "wait for Visionary result" --received-session-id SESS-BUILD-001 --received-session-id SESS-GUARD-001 --source-task-id TASK-011 --source-parent-session-id SESS-PARENT-001
  aof team-output-record --project . --team-id runtime-team --stage planning --expected-role Builder --expected-role Guardian --received-role Builder --aggregate-state waiting-for-missing-roles --recommended-next-step "wait for Guardian result" --role-result-ref .aof/artifacts/execution/role-results/RRES-001.json --blocking-signal "guardian pending" --source-task-id TASK-012 --source-parent-session-id SESS-PARENT-001
  aof council-review-packet --project . --council-id architecture-council --stage review --review-status changes-requested --decision-summary "execution packet shape is close but missing Guardian evidence" --rationale "approval requires both execution and risk viewpoints" --recommendation "request Guardian output and resubmit" --team-output-ref .aof/artifacts/execution/team-outputs/TOUT-001.json --role-result-ref .aof/artifacts/execution/role-results/RRES-001.json --follow-up-task-id TASK-012
  aof runtime-loop-proof --project . --provider mock --source-task-id TASK-011
  aof execution-lineage --project . --source-task-id TASK-012
  aof learning-loop-snapshot --project .
  aof contract-register --project .
  aof dependency-graph --project .
  aof metrics-snapshot --project .
  aof organization-audit --project .
  aof organization-status --project .
  aof organization-analytics-snapshot --project .
  aof organization-verify --project ./examples/aidlc-template
  aof roadmap-status --project .
  aof verify-archive --project ./examples/aidlc-template --input /tmp/aof-live-verification --max-runs 10
  aof verify-archive-dashboard --index-input ./examples/aidlc-template/.aof/artifacts/verification/verification-archive-index.json --log-input ./examples/aidlc-template/.aof/artifacts/verification/archive-log/verification-archive-log.json --artifact-dir /tmp/aof-verification-archive-dashboard
  aof verify-archive-log --input ./examples/aidlc-template/.aof/artifacts/verification/verification-archive-index.json --artifact-dir /tmp/aof-verification-archive-log
  aof verify-history --input /tmp/aof-live-verification --input /tmp/aof-live-verification-second/verification-bundle.json --artifact-dir /tmp/aof-verification-history
  aof verify-log --input /tmp/aof-live-verification --artifact-dir /tmp/aof-verification-log
  aof verify-lineage --history-input /tmp/aof-verification-history/verification-history.json --log-input /tmp/aof-verification-log/verification-log.json --index-input /tmp/aof-verification-log/verification-index.json --artifact-dir /tmp/aof-verification-lineage
  aof verify-dashboard --history-input /tmp/aof-verification-history/verification-history.json --log-input /tmp/aof-verification-log/verification-log.json --index-input /tmp/aof-verification-log/verification-index.json --lineage-input /tmp/aof-verification-lineage/verification-lineage.json --artifact-dir /tmp/aof-verification-dashboard
  aof verify-dashboard-log --input /tmp/aof-verification-dashboard --artifact-dir /tmp/aof-verification-dashboard-log
  aof verify-dashboard-index --log-input /tmp/aof-verification-dashboard-log/verification-dashboard-log.json --artifact-dir /tmp/aof-verification-dashboard-index
  aof visibility-export --project .
  aof visibility-serve --status-input /tmp/aof-visibility/status-card.json --timeline-input /tmp/aof-visibility/timeline-feed.json --flow-input /tmp/aof-visibility/flow-snapshot.json --port 4174
  aof packet --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --stage planning
  aof council --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --stage review --include-optional
  aof council-exec --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --stage planning --invoke-model --provider mock
  aof council-exec --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --stage planning --invoke-model --provider mock --write-artifact /tmp/aof-council-exec.json --timeout-ms 30000 --max-retries 0
  aof council-exec --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --stage approval --invoke-model --provider mock --mock-seat-decision Builder=reject
  aof provider-check --provider mock
  aof provider-check --provider openai-compatible --model gpt-4.1-mini --base-url https://api.openai.com/v1 --api-key-env OPENAI_API_KEY --ping
  aof provider-check --provider openai-compatible --model gpt-4.1-mini --base-url https://api.openai.com/v1 --api-key-env OPENAI_API_KEY --ping --write-artifact /tmp/aof-provider-check.json --timeout-ms 30000 --max-retries 0
  aof escalation-resolve --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --resolution reopen --note "Needs wider review"
  aof signal --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --signal ./examples/aidlc-template/.aof/signals/SIG-001.json
`);
}

function parseArgs(argv) {
  const [, , command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (command !== "run" && command !== "init" && command !== "upgrade" && command !== "answer" && command !== "outcome-report" && command !== "allocation-plan-record" && command !== "policy-evaluation-report" && command !== "resource-claim-record" && command !== "task-open" && command !== "task-update" && command !== "goal-project" && command !== "confirmation-window-record" && command !== "alignment-pulse" && command !== "cadence-trigger-guide" && command !== "cadence-follow-through" && command !== "self-audit-record" && command !== "retire-candidate-review" && command !== "live-verify" && command !== "decision-verify" && command !== "decision-register" && command !== "discovery-question-set-record" && command !== "breakthrough-pattern-record" && command !== "breakthrough-library-register" && command !== "assumption-map-record" && command !== "anomaly-log-record" && command !== "discovery-judgment-packet" && command !== "discovery-handoff-record" && command !== "learning-loop-snapshot" && command !== "contract-register" && command !== "dependency-graph" && command !== "metrics-snapshot" && command !== "organization-audit" && command !== "organization-status" && command !== "organization-analytics-snapshot" && command !== "organization-verify" && command !== "roadmap-status" && command !== "verify-archive" && command !== "verify-archive-dashboard" && command !== "verify-archive-log" && command !== "verify-history" && command !== "verify-log" && command !== "verify-lineage" && command !== "verify-dashboard" && command !== "verify-dashboard-log" && command !== "verify-dashboard-index" && command !== "visibility-export" && command !== "visibility-serve" && command !== "packet" && command !== "signal" && command !== "council" && command !== "council-exec" && command !== "provider-check" && command !== "escalation-resolve" && command !== "role-result-record" && command !== "role-join-record" && command !== "team-output-record" && command !== "council-review-packet" && command !== "runtime-loop-proof" && command !== "execution-lineage") {
    throw new Error(`Unsupported command: ${command}`);
  }

  if (command === "run" && rest.length === 0) {
    throw new Error("Missing request string for `run`.");
  }

  const options = command === "run"
    ? { project: ".", request: rest[0], routingMode: null }
    : command === "init"
      ? {
          project: ".",
          topology: "",
          writeTarget: "",
          projectType: "",
          domainSummary: "",
          installMode: "runtime-on"
        }
    : command === "upgrade"
      ? {
          project: ".",
          writeTarget: "",
          installMode: ""
        }
    : command === "answer"
      ? { session: "", responses: [] }
      : command === "outcome-report"
        ? { session: "", result: "", note: "", signalRef: "" }
      : command === "task-open"
        ? {
            project: ".",
            title: "",
            description: "",
            origin: "",
            orchestratorSessionId: "",
            assignedSessionIds: [],
            relatedDecisionRecordId: "",
            operatingGoalRef: "",
            triageNotes: ""
          }
      : command === "goal-project"
        ? {
            project: ".",
            goalType: "",
            content: "",
            agreedWithHuman: null,
            sourceSessionId: "",
            sourceDecisionRecordId: "",
            declaredComplete: false
          }
      : command === "task-update"
        ? {
            project: ".",
            taskId: "",
            status: "",
            assignedSessionIds: [],
            relatedDecisionRecordId: "",
            triageNotes: ""
          }
      : command === "confirmation-window-record"
        ? {
            project: ".",
            question: "",
            answer: "",
            expectationState: "",
            mismatchState: "",
            scaleDirection: "",
            sourceSessionId: "",
            sourceDecisionRecordId: "",
            maxEntries: 3
          }
      : command === "alignment-pulse"
        ? {
            project: ".",
            question: "",
            answer: "",
            expectationState: "",
            mismatchState: "",
            scaleDirection: "",
            prioritizedTaskIds: [],
            staleTaskIds: [],
            retireCandidateTaskIds: [],
            triageNote: "",
            sourceSessionId: "",
            sourceDecisionRecordId: "",
            maxEntries: 3
          }
      : command === "cadence-trigger-guide"
        ? {
            project: ".",
            sourceSessionId: "",
            sourceDecisionRecordId: "",
            maxEntries: 3
          }
      : command === "cadence-follow-through"
        ? {
            project: ".",
            resolution: "",
            note: "",
            sourceSessionId: "",
            sourceDecisionRecordId: "",
            maxEntries: 3
          }
      : command === "self-audit-record"
        ? {
            project: ".",
            auditId: "",
            scope: "",
            summary: "",
            detectedGap: "",
            resultState: "",
            nextAction: "",
            relatedTaskIds: [],
            sourceSessionId: "",
            sourceDecisionRecordId: "",
            nextValueSliceContent: "",
            maxEntries: 3
          }
      : command === "retire-candidate-review"
        ? {
            project: ".",
            resolution: "",
            taskIds: [],
            note: "",
            sourceSessionId: "",
            sourceDecisionRecordId: "",
            maxEntries: 3
          }
      : command === "live-verify"
        ? {
            project: ".",
            request: "初回離脱率を下げたい",
            responses: [],
            signalResponses: [],
            escalationResumeResponses: [],
            routingMode: null,
            provider: "",
            model: "",
            baseUrl: "",
            apiKey: "",
            apiKeyEnv: "",
            timeoutMs: undefined,
            maxRetries: undefined,
            temperature: undefined,
            ping: false,
            artifactDir: "",
            includeMiddleStages: false,
            includeApproval: false,
            includeSignalReopen: false,
            includeEscalationReopen: false,
            includeEscalationTerminal: false,
            signalPath: "",
            escalationReopenNote: "",
            escalationApproveNote: "",
            escalationStopNote: "",
            archiveVerification: false,
            archiveDir: "",
            archiveMaxRuns: undefined
          }
      : command === "organization-verify"
        ? {
            project: "."
          }
      : command === "decision-verify"
        ? {
            project: "."
          }
      : command === "decision-register"
        ? {
            project: "."
          }
      : command === "learning-loop-snapshot"
        ? {
            project: "."
          }
      : command === "contract-register"
        ? {
            project: "."
          }
      : command === "dependency-graph"
        ? {
            project: "."
          }
      : command === "metrics-snapshot"
        ? {
            project: "."
          }
      : command === "organization-audit"
        ? {
            project: "."
          }
      : command === "organization-status"
        ? {
            project: "."
          }
      : command === "organization-analytics-snapshot"
        ? {
            project: "."
          }
      : command === "roadmap-status"
        ? {
            project: "."
          }
      : command === "verify-history"
        ? {
            inputs: [],
            artifactDir: ""
          }
      : command === "verify-archive"
        ? {
            project: ".",
            inputs: [],
            archiveDir: "",
            maxRuns: undefined
          }
      : command === "verify-archive-dashboard"
        ? {
            indexInput: "",
            logInput: "",
            artifactDir: ""
          }
      : command === "verify-archive-log"
        ? {
            inputs: [],
            artifactDir: ""
          }
      : command === "verify-log"
        ? {
            inputs: [],
            artifactDir: ""
          }
      : command === "verify-lineage"
        ? {
            historyInput: "",
            logInput: "",
            indexInput: "",
            artifactDir: ""
          }
      : command === "verify-dashboard"
        ? {
            historyInput: "",
            logInput: "",
            indexInput: "",
            lineageInput: "",
            artifactDir: ""
          }
      : command === "verify-dashboard-log"
        ? {
            inputs: [],
            artifactDir: ""
          }
      : command === "verify-dashboard-index"
        ? {
            logInput: "",
            artifactDir: ""
          }
      : command === "visibility-serve"
        ? {
            statusInput: "",
            timelineInput: "",
            flowInput: "",
            host: "127.0.0.1",
            port: 4174,
            title: "AOF Visibility Viewer"
          }
      : command === "visibility-export"
        ? {
            project: ".",
            artifactDir: ""
          }
      : command === "packet"
        ? { project: "", session: "", stage: "", role: "" }
        : command === "council" || command === "council-exec"
          ? {
              project: "",
              session: "",
              stage: "",
              role: "",
              includeOptional: false,
              invokeModel: false,
              provider: "",
              model: "",
              baseUrl: "",
              apiKey: "",
              apiKeyEnv: "",
              timeoutMs: undefined,
              maxRetries: undefined,
              mockSeatDecisions: [],
              mockSeatVetos: [],
              temperature: undefined,
              artifactPath: ""
            }
          : command === "provider-check"
            ? {
                provider: "",
                model: "",
                baseUrl: "",
                apiKey: "",
                apiKeyEnv: "",
                timeoutMs: undefined,
                maxRetries: undefined,
                temperature: undefined,
                ping: false,
                artifactPath: ""
              }
          : command === "allocation-plan-record"
            ? {
                project: ".",
                allocationPlanId: "",
                subjectRef: "",
                targetRoleRefs: [],
                candidateResourceRefs: [],
                recommendedAllocations: [],
                unfilledRoleRefs: [],
                policyRefs: [],
                riskNotes: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                sourceParentSessionId: "",
                artifactPath: ""
              }
          : command === "policy-evaluation-report"
            ? {
                project: ".",
                evaluationId: "",
                subjectRef: "",
                evaluationScope: "",
                policyRefs: [],
                overallOutcome: "",
                results: [],
                recommendedActions: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                sourceParentSessionId: "",
                artifactPath: ""
              }
          : command === "resource-claim-record"
            ? {
                project: ".",
                claimId: "",
                subjectRef: "",
                resourceRef: "",
                claimantRoleRef: "",
                claimScope: "",
                claimStatus: "",
                approvalPolicyRefs: [],
                justification: "",
                allocationPlanRef: "",
                policyEvaluationRef: "",
                expiresAt: "",
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                sourceParentSessionId: "",
                artifactPath: ""
              }
          : command === "escalation-resolve"
            ? { session: "", resolution: "", note: "" }
          : command === "role-result-record"
            ? {
                project: ".",
                roleResultId: "",
                role: "",
                stage: "",
                sessionId: "",
                status: "",
                recommendation: "",
                rationale: "",
                signals: [],
                artifactRefs: [],
                decisionRequired: false,
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                sourceParentSessionId: "",
                blockingReason: "",
                missingInputs: [],
                confidence: undefined,
                artifactPath: ""
              }
          : command === "discovery-question-set-record"
            ? {
                project: ".",
                questionSetId: "",
                discoveryObjective: "",
                keyQuestions: [],
                targetAssumptions: [],
                targetAnomalies: [],
                targetUserOrMarketSlice: "",
                stopContinuePivotSignals: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                notes: "",
                artifactPath: ""
              }
          : command === "breakthrough-pattern-record"
            ? {
                project: ".",
                patternId: "",
                sourceDomain: "",
                triggeringTension: "",
                brokenAssumption: "",
                enablingToolOrMethod: "",
                transferHypothesis: "",
                expectedRelevance: "",
                evidenceRefs: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                notes: "",
                artifactPath: ""
              }
          : command === "breakthrough-library-register"
            ? {
                project: "."
              }
          : command === "assumption-map-record"
            ? {
                project: ".",
                assumptionMapId: "",
                subject: "",
                assumptions: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "anomaly-log-record"
            ? {
                project: ".",
                anomalyLogId: "",
                subject: "",
                anomalies: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "discovery-judgment-packet"
            ? {
                project: ".",
                judgmentId: "",
                councilId: "",
                judgmentStatus: "",
                decisionSummary: "",
                rationale: "",
                desirabilityAssessment: "",
                feasibilityAssessment: "",
                riskAssessment: "",
                evidenceQualityState: "",
                recommendedNextStep: "",
                questionSetRefs: [],
                artifactRefs: [],
                followUpQuestions: [],
                promotionReady: false,
                handoffRequired: false,
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "discovery-handoff-record"
            ? {
                project: ".",
                handoffId: "",
                selectedNeed: "",
                intendedUserOrSegment: "",
                contextSummary: "",
                hypothesis: "",
                evidenceRefs: [],
                rejectedAlternatives: [],
                explicitRisks: [],
                deliveryValidationRequirements: [],
                need: "",
                intent: "",
                context: "",
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "team-output-record"
            ? {
                project: ".",
                teamOutputId: "",
                teamId: "",
                stage: "",
                expectedRoles: [],
                receivedRoles: [],
                missingRoles: [],
                aggregateState: "",
                blockingSignals: [],
                recommendedNextStep: "",
                joinedRoleResultRefs: [],
                artifactRefs: [],
                decisionRequired: false,
                summary: "",
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                sourceParentSessionId: "",
                artifactPath: ""
              }
          : command === "council-review-packet"
            ? {
                project: ".",
                reviewPacketId: "",
                councilId: "",
                stage: "",
                reviewStatus: "",
                decisionSummary: "",
                rationale: "",
                recommendation: "",
                teamOutputRefs: [],
                roleResultRefs: [],
                evidenceRefs: [],
                followUpTaskIds: [],
                escalationRequired: false,
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                sourceParentSessionId: "",
                artifactPath: ""
              }
          : command === "execution-lineage"
            ? {
                project: ".",
                sourceParentSessionId: "",
                sourceTaskId: "",
                stage: ""
              }
          : { session: "", signal: "" };

  for (let i = command === "run" ? 1 : 0; i < rest.length; i += 1) {
    const part = rest[i];
    if (part === "--project") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --project.");
      }
      options.project = value;
      i += 1;
      continue;
    }
    if (part === "--topology") {
      options.topology = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--write-target") {
      options.writeTarget = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--project-type") {
      options.projectType = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--domain-summary") {
      options.domainSummary = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--install-mode") {
      options.installMode = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--fast-track") {
      options.routingMode = "fast-track";
      continue;
    }
    if (part === "--deep-path") {
      options.routingMode = "deep-path";
      continue;
    }
    if (part === "--session") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --session.");
      }
      options.session = value;
      i += 1;
      continue;
    }
    if (part === "--response") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --response.");
      }
      options.responses.push(value);
      i += 1;
      continue;
    }
    if (part === "--result") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --result.");
      }
      options.result = value;
      i += 1;
      continue;
    }
    if (part === "--title") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --title.");
      }
      options.title = value;
      i += 1;
      continue;
    }
    if (part === "--description") {
      options.description = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--origin") {
      options.origin = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--orchestrator-session-id") {
      options.orchestratorSessionId = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--assigned-session-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --assigned-session-id.");
      }
      options.assignedSessionIds.push(value);
      i += 1;
      continue;
    }
    if (part === "--related-decision-record-id") {
      options.relatedDecisionRecordId = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--operating-goal-ref") {
      options.operatingGoalRef = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--triage-notes") {
      options.triageNotes = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--task-id") {
      if (Array.isArray(options.taskIds)) {
        const value = rest[i + 1];
        if (!value) {
          throw new Error("Missing value after --task-id.");
        }
        options.taskIds.push(value);
      } else {
        options.taskId = rest[i + 1] ?? "";
      }
      i += 1;
      continue;
    }
    if (part === "--status") {
      options.status = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--goal-type") {
      options.goalType = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--content") {
      options.content = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--agreed-with-human") {
      options.agreedWithHuman = true;
      continue;
    }
    if (part === "--source-session-id") {
      options.sourceSessionId = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--source-decision-record-id") {
      options.sourceDecisionRecordId = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--question") {
      options.question = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--answer") {
      options.answer = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--expectation-state") {
      options.expectationState = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--mismatch-state") {
      options.mismatchState = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--scale-direction") {
      options.scaleDirection = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--prioritized-task-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --prioritized-task-id.");
      }
      options.prioritizedTaskIds.push(value);
      i += 1;
      continue;
    }
    if (part === "--stale-task-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --stale-task-id.");
      }
      options.staleTaskIds.push(value);
      i += 1;
      continue;
    }
    if (part === "--retire-candidate-task-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --retire-candidate-task-id.");
      }
      options.retireCandidateTaskIds.push(value);
      i += 1;
      continue;
    }
    if (part === "--related-task-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --related-task-id.");
      }
      options.relatedTaskIds.push(value);
      i += 1;
      continue;
    }
    if (part === "--triage-note") {
      options.triageNote = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--audit-id") {
      options.auditId = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--scope") {
      options.scope = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--summary") {
      options.summary = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--detected-gap") {
      options.detectedGap = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--result-state") {
      options.resultState = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--next-action") {
      options.nextAction = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--next-value-slice") {
      options.nextValueSliceContent = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--note") {
      options.note = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--max-entries") {
      const raw = rest[i + 1] ?? "";
      options.maxEntries = Number(raw);
      i += 1;
      continue;
    }
    if (part === "--declared-complete") {
      options.declaredComplete = true;
      continue;
    }
    if (part === "--input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --input.");
      }
      options.inputs.push(value);
      i += 1;
      continue;
    }
    if (part === "--history-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --history-input.");
      }
      options.historyInput = value;
      i += 1;
      continue;
    }
    if (part === "--log-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --log-input.");
      }
      options.logInput = value;
      i += 1;
      continue;
    }
    if (part === "--index-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --index-input.");
      }
      options.indexInput = value;
      i += 1;
      continue;
    }
    if (part === "--lineage-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --lineage-input.");
      }
      options.lineageInput = value;
      i += 1;
      continue;
    }
    if (part === "--status-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --status-input.");
      }
      options.statusInput = value;
      i += 1;
      continue;
    }
    if (part === "--timeline-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --timeline-input.");
      }
      options.timelineInput = value;
      i += 1;
      continue;
    }
    if (part === "--flow-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --flow-input.");
      }
      options.flowInput = value;
      i += 1;
      continue;
    }
    if (part === "--signal-response") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --signal-response.");
      }
      options.signalResponses.push(value);
      i += 1;
      continue;
    }
    if (part === "--escalation-response") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --escalation-response.");
      }
      options.escalationResumeResponses.push(value);
      i += 1;
      continue;
    }
    if (part === "--request") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --request.");
      }
      options.request = value;
      i += 1;
      continue;
    }
    if (part === "--subject-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --subject-ref.");
      }
      options.subjectRef = value;
      i += 1;
      continue;
    }
    if (part === "--resource-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --resource-ref.");
      }
      options.resourceRef = value;
      i += 1;
      continue;
    }
    if (part === "--claimant-role-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --claimant-role-ref.");
      }
      options.claimantRoleRef = value;
      i += 1;
      continue;
    }
    if (part === "--claim-scope") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --claim-scope.");
      }
      options.claimScope = value;
      i += 1;
      continue;
    }
    if (part === "--claim-status") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --claim-status.");
      }
      options.claimStatus = value;
      i += 1;
      continue;
    }
    if (part === "--evaluation-scope") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --evaluation-scope.");
      }
      options.evaluationScope = value;
      i += 1;
      continue;
    }
    if (part === "--justification") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --justification.");
      }
      options.justification = value;
      i += 1;
      continue;
    }
    if (part === "--overall-outcome") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --overall-outcome.");
      }
      options.overallOutcome = value;
      i += 1;
      continue;
    }
    if (part === "--allocation-plan-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --allocation-plan-ref.");
      }
      options.allocationPlanRef = value;
      i += 1;
      continue;
    }
    if (part === "--policy-evaluation-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --policy-evaluation-ref.");
      }
      options.policyEvaluationRef = value;
      i += 1;
      continue;
    }
    if (part === "--expires-at") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --expires-at.");
      }
      options.expiresAt = value;
      i += 1;
      continue;
    }
    if (part === "--stage") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --stage.");
      }
      options.stage = value;
      i += 1;
      continue;
    }
    if (part === "--role") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --role.");
      }
      options.role = value;
      i += 1;
      continue;
    }
    if (part === "--signal") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --signal.");
      }
      if (Array.isArray(options.signals)) {
        options.signals.push(value);
      } else if (Array.isArray(options.stopContinuePivotSignals)) {
        options.stopContinuePivotSignals.push(value);
      } else {
        options.signal = value;
      }
      i += 1;
      continue;
    }
    if (part === "--session-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --session-id.");
      }
      options.sessionId = value;
      i += 1;
      continue;
    }
    if (part === "--team-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --team-id.");
      }
      options.teamId = value;
      i += 1;
      continue;
    }
    if (part === "--council-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --council-id.");
      }
      options.councilId = value;
      i += 1;
      continue;
    }
    if (part === "--review-status") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --review-status.");
      }
      options.reviewStatus = value;
      i += 1;
      continue;
    }
    if (part === "--judgment-status") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --judgment-status.");
      }
      options.judgmentStatus = value;
      i += 1;
      continue;
    }
    if (part === "--decision-summary") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --decision-summary.");
      }
      options.decisionSummary = value;
      i += 1;
      continue;
    }
    if (part === "--discovery-objective") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --discovery-objective.");
      }
      options.discoveryObjective = value;
      i += 1;
      continue;
    }
    if (part === "--key-question") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --key-question.");
      }
      options.keyQuestions.push(value);
      i += 1;
      continue;
    }
    if (part === "--target-assumption") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --target-assumption.");
      }
      options.targetAssumptions.push(value);
      i += 1;
      continue;
    }
    if (part === "--target-role-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --target-role-ref.");
      }
      options.targetRoleRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--candidate-resource-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --candidate-resource-ref.");
      }
      options.candidateResourceRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--target-anomaly") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --target-anomaly.");
      }
      options.targetAnomalies.push(value);
      i += 1;
      continue;
    }
    if (part === "--target-user-or-market-slice") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --target-user-or-market-slice.");
      }
      options.targetUserOrMarketSlice = value;
      i += 1;
      continue;
    }
    if (part === "--source-domain") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --source-domain.");
      }
      options.sourceDomain = value;
      i += 1;
      continue;
    }
    if (part === "--triggering-tension") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --triggering-tension.");
      }
      options.triggeringTension = value;
      i += 1;
      continue;
    }
    if (part === "--broken-assumption") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --broken-assumption.");
      }
      options.brokenAssumption = value;
      i += 1;
      continue;
    }
    if (part === "--enabling-tool-or-method") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --enabling-tool-or-method.");
      }
      options.enablingToolOrMethod = value;
      i += 1;
      continue;
    }
    if (part === "--transfer-hypothesis") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --transfer-hypothesis.");
      }
      options.transferHypothesis = value;
      i += 1;
      continue;
    }
    if (part === "--expected-relevance") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --expected-relevance.");
      }
      options.expectedRelevance = value;
      i += 1;
      continue;
    }
    if (part === "--assumption-json") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --assumption-json.");
      }
      options.assumptions.push(JSON.parse(value));
      i += 1;
      continue;
    }
    if (part === "--recommended-allocation-json") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --recommended-allocation-json.");
      }
      options.recommendedAllocations.push(JSON.parse(value));
      i += 1;
      continue;
    }
    if (part === "--result-json") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --result-json.");
      }
      options.results.push(JSON.parse(value));
      i += 1;
      continue;
    }
    if (part === "--anomaly-json") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --anomaly-json.");
      }
      options.anomalies.push(JSON.parse(value));
      i += 1;
      continue;
    }
    if (part === "--unfilled-role-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --unfilled-role-ref.");
      }
      options.unfilledRoleRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--subject" && (command === "assumption-map-record" || command === "anomaly-log-record")) {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --subject.");
      }
      options.subject = value;
      i += 1;
      continue;
    }
    if (part === "--selected-need") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --selected-need.");
      }
      options.selectedNeed = value;
      i += 1;
      continue;
    }
    if (part === "--intended-user-or-segment") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --intended-user-or-segment.");
      }
      options.intendedUserOrSegment = value;
      i += 1;
      continue;
    }
    if (part === "--context-summary") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --context-summary.");
      }
      options.contextSummary = value;
      i += 1;
      continue;
    }
    if (part === "--hypothesis") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --hypothesis.");
      }
      options.hypothesis = value;
      i += 1;
      continue;
    }
    if (part === "--rejected-alternative") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --rejected-alternative.");
      }
      options.rejectedAlternatives.push(value);
      i += 1;
      continue;
    }
    if (part === "--risk-note") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --risk-note.");
      }
      options.riskNotes.push(value);
      i += 1;
      continue;
    }
    if (part === "--explicit-risk") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --explicit-risk.");
      }
      options.explicitRisks.push(value);
      i += 1;
      continue;
    }
    if (part === "--recommended-action") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --recommended-action.");
      }
      options.recommendedActions.push(value);
      i += 1;
      continue;
    }
    if (part === "--delivery-validation") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --delivery-validation.");
      }
      options.deliveryValidationRequirements.push(value);
      i += 1;
      continue;
    }
    if (part === "--desirability-assessment") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --desirability-assessment.");
      }
      options.desirabilityAssessment = value;
      i += 1;
      continue;
    }
    if (part === "--feasibility-assessment") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --feasibility-assessment.");
      }
      options.feasibilityAssessment = value;
      i += 1;
      continue;
    }
    if (part === "--risk-assessment") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --risk-assessment.");
      }
      options.riskAssessment = value;
      i += 1;
      continue;
    }
    if (part === "--evidence-quality-state") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --evidence-quality-state.");
      }
      options.evidenceQualityState = value;
      i += 1;
      continue;
    }
    if (part === "--note" && (command === "discovery-question-set-record" || command === "breakthrough-pattern-record")) {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --note.");
      }
      options.notes = value;
      i += 1;
      continue;
    }
    if (part === "--recommendation") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --recommendation.");
      }
      options.recommendation = value;
      i += 1;
      continue;
    }
    if (part === "--rationale") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --rationale.");
      }
      options.rationale = value;
      i += 1;
      continue;
    }
    if (part === "--decision-required") {
      options.decisionRequired = true;
      continue;
    }
    if (part === "--escalation-required") {
      options.escalationRequired = true;
      continue;
    }
    if (part === "--promotion-ready") {
      options.promotionReady = true;
      continue;
    }
    if (part === "--handoff-required") {
      options.handoffRequired = true;
      continue;
    }
    if (part === "--artifact-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --artifact-ref.");
      }
      options.artifactRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--policy-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --policy-ref.");
      }
      options.policyRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--approval-policy-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --approval-policy-ref.");
      }
      options.approvalPolicyRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--question-set-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --question-set-ref.");
      }
      options.questionSetRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--follow-up-question") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --follow-up-question.");
      }
      options.followUpQuestions.push(value);
      i += 1;
      continue;
    }
    if (part === "--role-result-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --role-result-ref.");
      }
      if (Array.isArray(options.joinedRoleResultRefs)) {
        options.joinedRoleResultRefs.push(value);
      } else if (Array.isArray(options.roleResultRefs)) {
        options.roleResultRefs.push(value);
      }
      i += 1;
      continue;
    }
    if (part === "--team-output-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --team-output-ref.");
      }
      options.teamOutputRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--evidence-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --evidence-ref.");
      }
      options.evidenceRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--expected-role") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --expected-role.");
      }
      options.expectedRoles.push(value);
      i += 1;
      continue;
    }
    if (part === "--received-role") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --received-role.");
      }
      options.receivedRoles.push(value);
      i += 1;
      continue;
    }
    if (part === "--missing-role") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --missing-role.");
      }
      options.missingRoles.push(value);
      i += 1;
      continue;
    }
    if (part === "--aggregate-state") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --aggregate-state.");
      }
      options.aggregateState = value;
      i += 1;
      continue;
    }
    if (part === "--blocking-signal") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --blocking-signal.");
      }
      options.blockingSignals.push(value);
      i += 1;
      continue;
    }
    if (part === "--recommended-next-step") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --recommended-next-step.");
      }
      options.recommendedNextStep = value;
      i += 1;
      continue;
    }
    if (part === "--source-task-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --source-task-id.");
      }
      options.sourceTaskId = value;
      i += 1;
      continue;
    }
    if (part === "--source-parent-session-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --source-parent-session-id.");
      }
      options.sourceParentSessionId = value;
      i += 1;
      continue;
    }
    if (part === "--blocking-reason") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --blocking-reason.");
      }
      options.blockingReason = value;
      i += 1;
      continue;
    }
    if (part === "--missing-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --missing-input.");
      }
      options.missingInputs.push(value);
      i += 1;
      continue;
    }
    if (part === "--confidence") {
      const raw = rest[i + 1] ?? "";
      options.confidence = Number(raw);
      i += 1;
      continue;
    }
    if (part === "--follow-up-task-id") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --follow-up-task-id.");
      }
      options.followUpTaskIds.push(value);
      i += 1;
      continue;
    }
    if (part === "--signal-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --signal-ref.");
      }
      options.signalRef = value;
      i += 1;
      continue;
    }
    if (part === "--resolution") {
      options.resolution = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--note") {
      options.note = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--include-optional") {
      options.includeOptional = true;
      continue;
    }
    if (part === "--invoke-model") {
      options.invokeModel = true;
      continue;
    }
    if (part === "--provider") {
      options.provider = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--model") {
      options.model = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--base-url") {
      options.baseUrl = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--host") {
      options.host = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--port") {
      const raw = rest[i + 1] ?? "";
      options.port = Number(raw);
      i += 1;
      continue;
    }
    if (part === "--title") {
      options.title = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--api-key") {
      options.apiKey = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--api-key-env") {
      options.apiKeyEnv = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (part === "--temperature") {
      const raw = rest[i + 1] ?? "";
      options.temperature = Number(raw);
      i += 1;
      continue;
    }
    if (part === "--timeout-ms") {
      const raw = rest[i + 1] ?? "";
      options.timeoutMs = Number(raw);
      i += 1;
      continue;
    }
    if (part === "--max-retries") {
      const raw = rest[i + 1] ?? "";
      options.maxRetries = Number(raw);
      i += 1;
      continue;
    }
    if (part === "--mock-seat-decision") {
      const value = rest[i + 1] ?? "";
      options.mockSeatDecisions.push(value);
      i += 1;
      continue;
    }
    if (part === "--mock-seat-veto") {
      const value = rest[i + 1] ?? "";
      options.mockSeatVetos.push(value);
      i += 1;
      continue;
    }
    if (part === "--ping") {
      options.ping = true;
      continue;
    }
    if (part === "--include-approval") {
      options.includeApproval = true;
      continue;
    }
    if (part === "--include-signal-reopen") {
      options.includeSignalReopen = true;
      continue;
    }
    if (part === "--include-escalation-reopen") {
      options.includeEscalationReopen = true;
      continue;
    }
    if (part === "--include-escalation-terminal") {
      options.includeEscalationTerminal = true;
      continue;
    }
    if (part === "--include-middle-stages") {
      options.includeMiddleStages = true;
      continue;
    }
    if (part === "--archive") {
      options.archiveVerification = true;
      continue;
    }
    if (part === "--signal-path") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --signal-path.");
      }
      options.signalPath = value;
      i += 1;
      continue;
    }
    if (part === "--escalation-note") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --escalation-note.");
      }
      options.escalationReopenNote = value;
      i += 1;
      continue;
    }
    if (part === "--write-artifact") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --write-artifact.");
      }
      options.artifactPath = value;
      i += 1;
      continue;
    }
    if (part === "--artifact-dir") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --artifact-dir.");
      }
      options.artifactDir = value;
      i += 1;
      continue;
    }
    if (part === "--archive-dir") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --archive-dir.");
      }
      options.archiveDir = value;
      i += 1;
      continue;
    }
    if (part === "--archive-max-runs") {
      const raw = rest[i + 1] ?? "";
      options.archiveMaxRuns = Number(raw);
      i += 1;
      continue;
    }
    if (part === "--max-runs") {
      const raw = rest[i + 1] ?? "";
      options.maxRuns = Number(raw);
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${part}`);
  }

  if (command === "answer") {
    if (!options.session) {
      throw new Error("Missing --session for `answer`.");
    }
    if (options.responses.length === 0) {
      throw new Error("At least one --response is required for `answer`.");
    }
  }

  if (command === "init") {
    if (!options.topology) {
      throw new Error("Missing --topology for `init`.");
    }
    if (!["self-hosting", "managed-project"].includes(options.topology)) {
      throw new Error("Invalid --topology for `init`.");
    }
    if (options.installMode && !["runtime-on", "framing-only"].includes(options.installMode)) {
      throw new Error("Invalid --install-mode for `init`.");
    }
  }

  if (command === "upgrade" && options.installMode && !["runtime-on", "framing-only"].includes(options.installMode)) {
    throw new Error("Invalid --install-mode for `upgrade`.");
  }

  if (command === "outcome-report") {
    if (!options.session) {
      throw new Error("Missing --session for `outcome-report`.");
    }
    if (!options.result) {
      throw new Error("Missing --result for `outcome-report`.");
    }
    if (!["success", "partial", "failure"].includes(options.result)) {
      throw new Error("Invalid --result for `outcome-report`.");
    }
  }

  if (command === "task-open") {
    if (!options.title) {
      throw new Error("Missing --title for `task-open`.");
    }
  }

  if (command === "goal-project") {
    if (!options.goalType) {
      throw new Error("Missing --goal-type for `goal-project`.");
    }
    if (!["north-star", "operating-goal", "next-value-slice"].includes(options.goalType)) {
      throw new Error("Invalid --goal-type for `goal-project`.");
    }
    if (!options.content) {
      throw new Error("Missing --content for `goal-project`.");
    }
  }

  if (command === "task-update") {
    if (!options.taskId) {
      throw new Error("Missing --task-id for `task-update`.");
    }
    if (options.status && !["open", "assigned", "done", "archived", "retired"].includes(options.status)) {
      throw new Error("Invalid --status for `task-update`.");
    }
  }

  if (command === "confirmation-window-record") {
    if (!options.question) {
      throw new Error("Missing --question for `confirmation-window-record`.");
    }
    if (!options.answer) {
      throw new Error("Missing --answer for `confirmation-window-record`.");
    }
    if (!Number.isInteger(options.maxEntries) || options.maxEntries <= 0) {
      throw new Error("Invalid --max-entries for `confirmation-window-record`.");
    }
  }

  if (command === "alignment-pulse") {
    if (!options.question) {
      throw new Error("Missing --question for `alignment-pulse`.");
    }
    if (!options.answer) {
      throw new Error("Missing --answer for `alignment-pulse`.");
    }
    if (!Number.isInteger(options.maxEntries) || options.maxEntries <= 0) {
      throw new Error("Invalid --max-entries for `alignment-pulse`.");
    }
  }

  if (command === "cadence-trigger-guide") {
    if (!Number.isInteger(options.maxEntries) || options.maxEntries <= 0) {
      throw new Error("Invalid --max-entries for `cadence-trigger-guide`.");
    }
  }

  if (command === "cadence-follow-through") {
    if (options.resolution && !["retire", "keep-open"].includes(options.resolution)) {
      throw new Error("Invalid --resolution for `cadence-follow-through`.");
    }
    if (!Number.isInteger(options.maxEntries) || options.maxEntries <= 0) {
      throw new Error("Invalid --max-entries for `cadence-follow-through`.");
    }
  }

  if (command === "self-audit-record") {
    if (!options.auditId) {
      throw new Error("Missing --audit-id for `self-audit-record`.");
    }
    if (!options.scope) {
      throw new Error("Missing --scope for `self-audit-record`.");
    }
    if (!options.summary) {
      throw new Error("Missing --summary for `self-audit-record`.");
    }
    if (!options.detectedGap) {
      throw new Error("Missing --detected-gap for `self-audit-record`.");
    }
    if (!options.nextAction) {
      throw new Error("Missing --next-action for `self-audit-record`.");
    }
    if (options.resultState && !["active", "stable", "escalate"].includes(options.resultState)) {
      throw new Error("Invalid --result-state for `self-audit-record`.");
    }
    if (!Number.isInteger(options.maxEntries) || options.maxEntries <= 0) {
      throw new Error("Invalid --max-entries for `self-audit-record`.");
    }
  }

  if (command === "retire-candidate-review") {
    if (!["retire", "keep-open"].includes(options.resolution)) {
      throw new Error("Invalid --resolution for `retire-candidate-review`.");
    }
    if (!options.taskIds.length) {
      throw new Error("Missing --task-id for `retire-candidate-review`.");
    }
    if (!options.note) {
      throw new Error("Missing --note for `retire-candidate-review`.");
    }
    if (!Number.isInteger(options.maxEntries) || options.maxEntries <= 0) {
      throw new Error("Invalid --max-entries for `retire-candidate-review`.");
    }
  }

  if (command === "packet") {
    if (!options.session) {
      throw new Error("Missing --session for `packet`.");
    }
    if (!options.stage) {
      throw new Error("Missing --stage for `packet`.");
    }
  }

  if (command === "signal") {
    if (!options.session) {
      throw new Error("Missing --session for `signal`.");
    }
    if (!options.signal) {
      throw new Error("Missing --signal for `signal`.");
    }
  }

  if (command === "escalation-resolve") {
    if (!options.session) {
      throw new Error("Missing --session for `escalation-resolve`.");
    }
    if (!options.resolution) {
      throw new Error("Missing --resolution for `escalation-resolve`.");
    }
    if (!["approve", "reopen", "stop"].includes(options.resolution)) {
      throw new Error("Invalid --resolution for `escalation-resolve`.");
    }
  }

  if (command === "council" || command === "council-exec") {
    if (!options.session) {
      throw new Error(`Missing --session for \`${command}\`.`);
    }
    if (!options.stage) {
      throw new Error(`Missing --stage for \`${command}\`.`);
    }
    if (Number.isNaN(options.temperature)) {
      throw new Error(`Invalid --temperature for \`${command}\`.`);
    }
    if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
      throw new Error(`Invalid --timeout-ms for \`${command}\`.`);
    }
    if (options.maxRetries !== undefined && (!Number.isInteger(options.maxRetries) || options.maxRetries < 0)) {
      throw new Error(`Invalid --max-retries for \`${command}\`.`);
    }
    for (const pair of [...options.mockSeatDecisions, ...options.mockSeatVetos]) {
      if (!pair.includes("=")) {
        throw new Error(`Invalid seat override '${pair}' for \`${command}\`. Use Role=value.`);
      }
    }
  }

  if (command === "provider-check") {
    if (Number.isNaN(options.temperature)) {
      throw new Error("Invalid --temperature for `provider-check`.");
    }
    if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
      throw new Error("Invalid --timeout-ms for `provider-check`.");
    }
    if (options.maxRetries !== undefined && (!Number.isInteger(options.maxRetries) || options.maxRetries < 0)) {
      throw new Error("Invalid --max-retries for `provider-check`.");
    }
  }

  if (command === "live-verify") {
    if (!options.provider) {
      throw new Error("Missing --provider for `live-verify`.");
    }
    if (!options.artifactDir) {
      throw new Error("Missing --artifact-dir for `live-verify`.");
    }
    if (Number.isNaN(options.temperature)) {
      throw new Error("Invalid --temperature for `live-verify`.");
    }
    if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
      throw new Error("Invalid --timeout-ms for `live-verify`.");
    }
    if (options.maxRetries !== undefined && (!Number.isInteger(options.maxRetries) || options.maxRetries < 0)) {
      throw new Error("Invalid --max-retries for `live-verify`.");
    }
    if (options.archiveMaxRuns !== undefined && (!Number.isInteger(options.archiveMaxRuns) || options.archiveMaxRuns <= 0)) {
      throw new Error("Invalid --archive-max-runs for `live-verify`.");
    }
  }

  if (command === "verify-archive") {
    if (!options.project) {
      throw new Error("Missing --project for `verify-archive`.");
    }
    if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
      throw new Error("At least one --input is required for `verify-archive`.");
    }
    if (options.maxRuns !== undefined && (!Number.isInteger(options.maxRuns) || options.maxRuns <= 0)) {
      throw new Error("Invalid --max-runs for `verify-archive`.");
    }
  }

  if (command === "verify-history" || command === "verify-archive-log" || command === "verify-log" || command === "verify-dashboard-log") {
    if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
      throw new Error(`At least one --input is required for \`${command}\`.`);
    }
    if (!options.artifactDir) {
      throw new Error(`Missing --artifact-dir for \`${command}\`.`);
    }
  }

  if (command === "verify-archive-dashboard") {
    if (!options.indexInput || !options.logInput) {
      throw new Error("Missing --index-input or --log-input for `verify-archive-dashboard`.");
    }
    if (!options.artifactDir) {
      throw new Error("Missing --artifact-dir for `verify-archive-dashboard`.");
    }
  }

  if (command === "verify-lineage") {
    if (!options.historyInput || !options.logInput || !options.indexInput) {
      throw new Error("Missing --history-input, --log-input, or --index-input for `verify-lineage`.");
    }
    if (!options.artifactDir) {
      throw new Error("Missing --artifact-dir for `verify-lineage`.");
    }
  }

  if (command === "verify-dashboard") {
    if (!options.historyInput || !options.logInput || !options.indexInput || !options.lineageInput) {
      throw new Error("Missing --history-input, --log-input, --index-input, or --lineage-input for `verify-dashboard`.");
    }
    if (!options.artifactDir) {
      throw new Error("Missing --artifact-dir for `verify-dashboard`.");
    }
  }

  if (command === "verify-dashboard-index") {
    if (!options.logInput) {
      throw new Error("Missing --log-input for `verify-dashboard-index`.");
    }
    if (!options.artifactDir) {
      throw new Error("Missing --artifact-dir for `verify-dashboard-index`.");
    }
  }

  if (command === "visibility-serve") {
    if (!options.statusInput || !options.timelineInput || !options.flowInput) {
      throw new Error("Missing --status-input, --timeline-input, or --flow-input for `visibility-serve`.");
    }
    if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
      throw new Error("Invalid --port for `visibility-serve`.");
    }
  }

  if (command === "visibility-export") {
    if (!options.project) {
      throw new Error("Missing --project for `visibility-export`.");
    }
  }

  if (command === "role-result-record") {
    if (!options.role) {
      throw new Error("Missing --role for `role-result-record`.");
    }
    if (!options.stage) {
      throw new Error("Missing --stage for `role-result-record`.");
    }
    if (!options.sessionId) {
      throw new Error("Missing --session-id for `role-result-record`.");
    }
    if (!options.status) {
      throw new Error("Missing --status for `role-result-record`.");
    }
    if (!["completed", "blocked", "partial"].includes(options.status)) {
      throw new Error("Invalid --status for `role-result-record`.");
    }
    if (!options.recommendation) {
      throw new Error("Missing --recommendation for `role-result-record`.");
    }
    if (!options.rationale) {
      throw new Error("Missing --rationale for `role-result-record`.");
    }
    if (options.confidence !== undefined && (!Number.isFinite(options.confidence) || options.confidence < 0 || options.confidence > 1)) {
      throw new Error("Invalid --confidence for `role-result-record`.");
    }
  }

  if (command === "role-join-record") {
    if (!options.stage) {
      throw new Error("Missing --stage for `role-join-record`.");
    }
    if (!Array.isArray(options.expectedRoles) || options.expectedRoles.length === 0) {
      throw new Error("At least one --expected-role is required for `role-join-record`.");
    }
    if (!options.aggregateState) {
      throw new Error("Missing --aggregate-state for `role-join-record`.");
    }
    if (!options.recommendedNextStep) {
      throw new Error("Missing --recommended-next-step for `role-join-record`.");
    }
    if (options.joinStatus && !["open", "resolved", "escalated"].includes(options.joinStatus)) {
      throw new Error("Invalid --join-status for `role-join-record`.");
    }
  }

  if (command === "runtime-loop-proof") {
    if (!options.project) {
      throw new Error("Missing --project for `runtime-loop-proof`.");
    }
    if (options.routingMode && !["fast-track", "deep-path"].includes(options.routingMode)) {
      throw new Error("Invalid --routing-mode for `runtime-loop-proof`.");
    }
  }

  if (command === "allocation-plan-record") {
    if (!options.subjectRef) {
      throw new Error("Missing --subject-ref for `allocation-plan-record`.");
    }
    if (!Array.isArray(options.targetRoleRefs) || options.targetRoleRefs.length === 0) {
      throw new Error("At least one --target-role-ref is required for `allocation-plan-record`.");
    }
    if (!Array.isArray(options.recommendedAllocations) || options.recommendedAllocations.length === 0) {
      throw new Error("At least one --recommended-allocation-json is required for `allocation-plan-record`.");
    }
  }

  if (command === "policy-evaluation-report") {
    if (!options.subjectRef) {
      throw new Error("Missing --subject-ref for `policy-evaluation-report`.");
    }
    if (!options.evaluationScope) {
      throw new Error("Missing --evaluation-scope for `policy-evaluation-report`.");
    }
    if (!options.overallOutcome) {
      throw new Error("Missing --overall-outcome for `policy-evaluation-report`.");
    }
    if (!["allowed", "requires-approval", "requires-review", "escalate", "denied"].includes(options.overallOutcome)) {
      throw new Error("Invalid --overall-outcome for `policy-evaluation-report`.");
    }
    if (!Array.isArray(options.results) || options.results.length === 0) {
      throw new Error("At least one --result-json is required for `policy-evaluation-report`.");
    }
  }

  if (command === "resource-claim-record") {
    if (!options.subjectRef) {
      throw new Error("Missing --subject-ref for `resource-claim-record`.");
    }
    if (!options.resourceRef) {
      throw new Error("Missing --resource-ref for `resource-claim-record`.");
    }
    if (!options.claimantRoleRef) {
      throw new Error("Missing --claimant-role-ref for `resource-claim-record`.");
    }
    if (!options.claimScope) {
      throw new Error("Missing --claim-scope for `resource-claim-record`.");
    }
    if (!options.claimStatus) {
      throw new Error("Missing --claim-status for `resource-claim-record`.");
    }
    if (!["requested", "approved", "denied", "released"].includes(options.claimStatus)) {
      throw new Error("Invalid --claim-status for `resource-claim-record`.");
    }
    if (!options.justification) {
      throw new Error("Missing --justification for `resource-claim-record`.");
    }
  }

  if (command === "discovery-question-set-record") {
    if (!options.discoveryObjective) {
      throw new Error("Missing --discovery-objective for `discovery-question-set-record`.");
    }
    if (!Array.isArray(options.keyQuestions) || options.keyQuestions.length === 0) {
      throw new Error("At least one --key-question is required for `discovery-question-set-record`.");
    }
    if (!options.targetUserOrMarketSlice) {
      throw new Error("Missing --target-user-or-market-slice for `discovery-question-set-record`.");
    }
    if (!Array.isArray(options.stopContinuePivotSignals) || options.stopContinuePivotSignals.length === 0) {
      throw new Error("At least one --signal is required for `discovery-question-set-record`.");
    }
  }

  if (command === "breakthrough-pattern-record") {
    if (!options.sourceDomain) {
      throw new Error("Missing --source-domain for `breakthrough-pattern-record`.");
    }
    if (!options.triggeringTension) {
      throw new Error("Missing --triggering-tension for `breakthrough-pattern-record`.");
    }
    if (!options.brokenAssumption) {
      throw new Error("Missing --broken-assumption for `breakthrough-pattern-record`.");
    }
    if (!options.enablingToolOrMethod) {
      throw new Error("Missing --enabling-tool-or-method for `breakthrough-pattern-record`.");
    }
    if (!options.transferHypothesis) {
      throw new Error("Missing --transfer-hypothesis for `breakthrough-pattern-record`.");
    }
    if (!options.expectedRelevance) {
      throw new Error("Missing --expected-relevance for `breakthrough-pattern-record`.");
    }
  }

  if (command === "assumption-map-record") {
    if (!options.subject) {
      throw new Error("Missing --subject for `assumption-map-record`.");
    }
    if (!Array.isArray(options.assumptions) || options.assumptions.length === 0) {
      throw new Error("At least one --assumption-json is required for `assumption-map-record`.");
    }
  }

  if (command === "anomaly-log-record") {
    if (!options.subject) {
      throw new Error("Missing --subject for `anomaly-log-record`.");
    }
    if (!Array.isArray(options.anomalies) || options.anomalies.length === 0) {
      throw new Error("At least one --anomaly-json is required for `anomaly-log-record`.");
    }
  }

  if (command === "discovery-judgment-packet") {
    if (!options.councilId) {
      throw new Error("Missing --council-id for `discovery-judgment-packet`.");
    }
    if (!options.judgmentStatus) {
      throw new Error("Missing --judgment-status for `discovery-judgment-packet`.");
    }
    if (!["continue-exploration", "pivot", "synthesize-handoff", "stop"].includes(options.judgmentStatus)) {
      throw new Error("Invalid --judgment-status for `discovery-judgment-packet`.");
    }
    if (!options.decisionSummary) {
      throw new Error("Missing --decision-summary for `discovery-judgment-packet`.");
    }
    if (!options.rationale) {
      throw new Error("Missing --rationale for `discovery-judgment-packet`.");
    }
    if (!options.desirabilityAssessment || !options.feasibilityAssessment || !options.riskAssessment) {
      throw new Error("Missing --desirability-assessment, --feasibility-assessment, or --risk-assessment for `discovery-judgment-packet`.");
    }
    if (!options.evidenceQualityState) {
      throw new Error("Missing --evidence-quality-state for `discovery-judgment-packet`.");
    }
    if (!["weak", "mixed", "sufficient", "strong", "contested"].includes(options.evidenceQualityState)) {
      throw new Error("Invalid --evidence-quality-state for `discovery-judgment-packet`.");
    }
    if (!options.recommendedNextStep) {
      throw new Error("Missing --recommended-next-step for `discovery-judgment-packet`.");
    }
  }

  if (command === "discovery-handoff-record") {
    if (!options.selectedNeed) {
      throw new Error("Missing --selected-need for `discovery-handoff-record`.");
    }
    if (!options.intendedUserOrSegment) {
      throw new Error("Missing --intended-user-or-segment for `discovery-handoff-record`.");
    }
    if (!options.contextSummary) {
      throw new Error("Missing --context-summary for `discovery-handoff-record`.");
    }
    if (!options.hypothesis) {
      throw new Error("Missing --hypothesis for `discovery-handoff-record`.");
    }
    if (!options.need || !options.intent || !options.context) {
      throw new Error("Missing --need, --intent, or --context for `discovery-handoff-record`.");
    }
  }

  if (command === "team-output-record") {
    if (!options.teamId) {
      throw new Error("Missing --team-id for `team-output-record`.");
    }
    if (!options.stage) {
      throw new Error("Missing --stage for `team-output-record`.");
    }
    if (!Array.isArray(options.expectedRoles) || options.expectedRoles.length === 0) {
      throw new Error("At least one --expected-role is required for `team-output-record`.");
    }
    if (!options.aggregateState) {
      throw new Error("Missing --aggregate-state for `team-output-record`.");
    }
    if (!options.recommendedNextStep) {
      throw new Error("Missing --recommended-next-step for `team-output-record`.");
    }
  }

  if (command === "council-review-packet") {
    if (!options.councilId) {
      throw new Error("Missing --council-id for `council-review-packet`.");
    }
    if (!options.stage) {
      throw new Error("Missing --stage for `council-review-packet`.");
    }
    if (!options.reviewStatus) {
      throw new Error("Missing --review-status for `council-review-packet`.");
    }
    if (!["approved", "changes-requested", "blocked", "deferred"].includes(options.reviewStatus)) {
      throw new Error("Invalid --review-status for `council-review-packet`.");
    }
    if (!options.decisionSummary) {
      throw new Error("Missing --decision-summary for `council-review-packet`.");
    }
    if (!options.rationale) {
      throw new Error("Missing --rationale for `council-review-packet`.");
    }
    if (!options.recommendation) {
      throw new Error("Missing --recommendation for `council-review-packet`.");
    }
  }

  return { command, options };
}

async function main() {
  try {
    const parsed = parseArgs(process.argv);
    if (parsed.command === "help") {
      printHelp();
      return;
    }

    if (parsed.command === "run") {
      const result = await runCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "init") {
      const result = await initProjectCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "upgrade") {
      const result = await upgradeProjectCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "answer") {
      const result = await answerCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "outcome-report") {
      const result = await outcomeReportCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "allocation-plan-record") {
      const result = await allocationPlanRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "policy-evaluation-report") {
      const result = await policyEvaluationReportCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "resource-claim-record") {
      const result = await resourceClaimRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "task-open") {
      const result = await taskOpenCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "task-update") {
      const result = await taskUpdateCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "goal-project") {
      const result = await goalProjectCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "confirmation-window-record") {
      const result = await confirmationWindowRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "alignment-pulse") {
      const result = await alignmentPulseCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "cadence-trigger-guide") {
      const result = await cadenceTriggerGuideCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "cadence-follow-through") {
      const result = await cadenceFollowThroughCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "self-audit-record") {
      const result = await selfAuditRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "retire-candidate-review") {
      const result = await retireCandidateReviewCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "live-verify") {
      const result = await liveVerifyCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "organization-verify") {
      const result = await organizationVerifyCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "decision-verify") {
      const result = await decisionVerifyCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "decision-register") {
      const result = await decisionRegisterCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "discovery-question-set-record") {
      const result = await discoveryQuestionSetRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "breakthrough-pattern-record") {
      const result = await breakthroughPatternRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "breakthrough-library-register") {
      const result = await breakthroughLibraryRegisterCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "assumption-map-record") {
      const result = await assumptionMapRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "anomaly-log-record") {
      const result = await anomalyLogRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "discovery-judgment-packet") {
      const result = await discoveryJudgmentPacketCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "discovery-handoff-record") {
      const result = await discoveryHandoffRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "learning-loop-snapshot") {
      const result = await learningLoopSnapshotCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "contract-register") {
      const result = await contractRegisterCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "dependency-graph") {
      const result = await dependencyGraphCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "metrics-snapshot") {
      const { metricsSnapshotCommand } = await import("./commands/metrics-snapshot.js");
      const result = await metricsSnapshotCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "organization-audit") {
      const result = await organizationAuditCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "organization-status") {
      const result = await organizationStatusCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "organization-analytics-snapshot") {
      const { organizationAnalyticsSnapshotCommand } = await import("./commands/organization-analytics-snapshot.js");
      const result = await organizationAnalyticsSnapshotCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "roadmap-status") {
      const { roadmapStatusCommand } = await import("./commands/roadmap-status.js");
      const result = await roadmapStatusCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-history") {
      const result = await verifyHistoryCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-archive") {
      const result = await verifyArchiveCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-archive-dashboard") {
      const result = await verifyArchiveDashboardCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-archive-log") {
      const result = await verifyArchiveLogCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-log") {
      const result = await verifyLogCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-lineage") {
      const result = await verifyLineageCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-dashboard") {
      const result = await verifyDashboardCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-dashboard-log") {
      const result = await verifyDashboardLogCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "verify-dashboard-index") {
      const result = await verifyDashboardIndexCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "visibility-export") {
      const { visibilityExportCommand } = await import("./commands/visibility-export.js");
      const result = await visibilityExportCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "visibility-serve") {
      const result = await visibilityServeCommand(parsed.options);
      console.log(JSON.stringify({
        ok: result.ok,
        host: result.host,
        port: result.port,
        title: result.title,
        url: result.url,
        sources: result.sources
      }, null, 2));
      return;
    }

    if (parsed.command === "role-result-record") {
      const result = await roleResultRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "role-join-record") {
      const result = await roleJoinRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "team-output-record") {
      const result = await teamOutputRecordCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "council-review-packet") {
      const result = await councilReviewPacketCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "runtime-loop-proof") {
      const result = await runtimeLoopProofCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "execution-lineage") {
      const result = await executionLineageCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "packet") {
      const result = await packetCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "signal") {
      const result = await signalCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "council") {
      const result = await councilCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "council-exec") {
      const result = await councilExecCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "provider-check") {
      const result = await providerCheckCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "escalation-resolve") {
      const result = await escalationResolveCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
