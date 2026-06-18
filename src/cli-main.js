#!/usr/bin/env node

import { spawnSync } from "node:child_process";

import { buildCommandHandlers } from "./runtime/command-catalog.js";

const COMMAND_HANDLERS = buildCommandHandlers();

const SUPPORTED_COMMANDS = new Set(Object.keys(COMMAND_HANDLERS));
const TRANSIENT_CLI_ERROR_PATTERNS = [
  /Unexpected end of input/,
  /Invalid or unexpected token/,
  /ENOENT: no such file or directory, read/,
  /missing \) after argument list/
];

function isTransientCliError(error) {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
  return TRANSIENT_CLI_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function printUnsupportedNodeWarning() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);
  if (!Number.isFinite(major) || major < 25 || process.env.AOF_SUPPRESS_NODE_WARNING === "1") {
    return;
  }
  console.error(
    `[aof] Warning: Node.js ${process.versions.node} is outside the CI-validated runtime lane. ` +
    "AOF is verified in CI on Node 22, and local parallel standalone CLI runs have shown intermittent read/import instability on Node 25. " +
    "If you see transient `Unexpected end of input` or JSON truncation errors, rerun on Node 22 LTS."
  );
}

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
  aof discovery-handoff-benchmark [--project <path>] [--write-artifact <path>]
  aof release-state-refresh --project <path> --release-version <version> --release-tag <tag> --release-definition-ref <path> --release-notes-ref <path> --release-checklist-ref <path> [--roadmap-ref <path>] [--release-plan-ref <path>] [--mission "<text>"] [--write-artifact <path>]
  aof release-state-audit [--project <path>] [--write-artifact <path>]
  aof problem-statement-record --project <path> --affected-party "<text>" --actual-problem "<text>" --why-it-matters "<text>" --why-now "<text>" --evidence-ref <path> [--evidence-ref <path>] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof value-hypothesis-record --project <path> --expected-value-creation "<text>" --beneficiary "<text>" --supporting-evidence "<text>" [--supporting-evidence "<text>"] --success-criterion "<text>" [--success-criterion "<text>"] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof alternative-analysis-record --project <path> --subject-need "<text>" --alternative-solution "<text>" [--alternative-solution "<text>"] [--non-solution-option "<text>"] [--defer-option "<text>"] --stop-option "<text>" [--stop-option "<text>"] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof experiment-proposal-record --project <path> --assumption-to-test "<text>" --smallest-testable-validation "<text>" --expected-learning "<text>" --expected-cost "<text>" --success-threshold "<text>" [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof project-charter-record --project <path> --validated-need-ref <path> --validated-objective "<text>" --scope-item "<text>" [--scope-item "<text>"] [--constraint "<text>"] --expected-outcome "<text>" [--expected-outcome "<text>"] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof need-validation-record --project <path> --raw-need "<text>" --validation-status <validated|reframed|rejected|deferred|evidence-requested|experiment-required> [--validated-need "<text>"] --decision-summary "<text>" --authority-action <reject-need|defer-need|request-evidence|reframe-need|require-experiment|approve-project-charter> --project-creation-recommendation <do-not-create-project|hold-project|create-project-after-experiment|create-project> --question-answer-json '<json>' [--question-answer-json '<json>'] [--hidden-assumption "<text>"] [--evidence-gap "<text>"] --problem-statement-ref <path> --value-hypothesis-ref <path> --alternative-analysis-ref <path> [--experiment-proposal-ref <path>] [--project-charter-ref <path>] [--discovery-handoff-ref <path>] [--source-task-id <TASK-id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof need-validation-advance --session <path> --need-validation-record <path> [--project-charter-ref <path>]
  aof need-validation-benchmark [--project <path>] [--write-artifact <path>]
  aof mission-control-benchmark [--project <path>] [--write-artifact <path>]
  aof operator-brief [--project <path>] [--write-artifact <path>]
  aof operator-progress [--project <path>] [--write-artifact <path>]
  aof tree-position [--project <path>] [--write-artifact <path>]
  aof evidence-drill-down [--project <path>] [--write-artifact <path>]
  aof evidence-drill-down-benchmark [--project <path>] [--write-artifact <path>]
  aof situation-assess [--project <path>] [--write-artifact <path>]
  aof role-result-record --project <path> --role <role> --stage <stage> --session-id <id> --status <completed|blocked|partial> --recommendation "<text>" --rationale "<text>" [--signal "<text>"] [--artifact-ref <path>] [--decision-required] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--blocking-reason "<text>"] [--missing-input "<text>"] [--confidence <0-1>] [--write-artifact <path>]
  aof role-join-record --project <path> --stage <stage> --expected-role <role> [--expected-role <role>] [--received-role <role>] [--missing-role <role>] --aggregate-state <ready-for-orchestrator-decision|waiting-for-missing-roles|blocked-by-signal|degraded-partial-join> --recommended-next-step "<text>" [--blocking-signal "<text>"] [--received-session-id <id>] [--join-status <open|resolved|escalated>] [--summary "<text>"] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--decision-record-ref <path>] [--write-artifact <path>]
  aof team-output-record --project <path> --team-id <id> --stage <stage> --expected-role <role> [--expected-role <role>] [--received-role <role>] [--missing-role <role>] --aggregate-state <ready-for-council-review|waiting-for-missing-roles|blocked-by-signal|degraded-partial-team-output> --recommended-next-step "<text>" [--role-result-ref <path>] [--artifact-ref <path>] [--blocking-signal "<text>"] [--decision-required] [--summary "<text>"] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof council-review-packet --project <path> --council-id <id> --stage <stage> --review-status <approved|changes-requested|blocked|deferred> --decision-summary "<text>" --rationale "<text>" --recommendation "<text>" [--target-audience "<text>"] [--expected-user-reaction "<text>"] [--blocking-reason "<text>"] [--artifact-change-recommendation "<text>"] [--organization-change-recommendation "<text>"] [--diagnosis-category "<text>"] [--diagnosis-confidence <0-1>] [--diagnosis-evidence-ref <path>] [--human-override-signal "<text>"] [--team-output-ref <path>] [--role-result-ref <path>] [--evidence-ref <path>] [--follow-up-task-id <TASK-id>] [--escalation-required] [--source-task-id <TASK-id>] [--source-parent-session-id <id>] [--source-decision-record-id <id>] [--write-artifact <path>]
  aof runtime-loop-proof --project <path> [--request "<text>"] [--response "<text>"] [--response "<text>"] [--provider <provider>] [--routing-mode <fast-track|deep-path>] [--source-task-id <TASK-id>] [--write-artifact <path>]
  aof execution-lineage [--project <path>] [--source-parent-session-id <id>] [--source-task-id <TASK-id>] [--stage <stage>]
  aof runtime-discipline-benchmark [--project <path>] [--source-task-id <TASK-id>] [--artifact-dir <path>]
  aof learning-loop-snapshot [--project <path>]
  aof contract-register [--project <path>]
  aof dependency-graph [--project <path>]
  aof metrics-snapshot [--project <path>]
  aof organization-audit [--project <path>]
  aof organization-status [--project <path>]
  aof organization-analytics-snapshot [--project <path>]
  aof organization-verify [--project <path>]
  aof command-registry-refresh [--project <path>] [--write-artifact <path>]
  aof command-register [--project <path>]
  aof command-routing-audit [--project <path>] [--write-artifact <path>]
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
  aof visibility-serve --status-input <path> --timeline-input <path> --flow-input <path> [--mission-input <path>] [--progress-input <path>] [--tree-input <path>] [--evidence-input <path>] [--host <host>] [--port <port>] [--title <text>]
  aof visibility-session [--project <path>] [--artifact-dir <path>] [--host <host>] [--port <port>] [--title <text>] [--open-browser]
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
  aof discovery-handoff-benchmark --project . --write-artifact /tmp/aof-discovery-handoff-benchmark.json
  aof release-state-refresh --project . --release-version 3.4.0 --release-tag v3.4.0 --release-definition-ref docs/v3.4-release-definition.md --release-notes-ref docs/v3.4.0-release-notes.md --release-checklist-ref docs/v3.4-release-checklist.md --mission "Keep the self-hosting runtime truthful about the active release baseline after a real release."
  aof release-state-audit --project . --write-artifact /tmp/aof-release-state-audit.json
  aof problem-statement-record --project . --affected-party "newly invited workspace admins" --actual-problem "activation fails during permission setup" --why-it-matters "high-intent admins fail before value is realized" --why-now "activation drop-off is blocking current growth" --evidence-ref docs/research/funnel-notes.md
  aof value-hypothesis-record --project . --expected-value-creation "higher activation completion and faster time to first value" --beneficiary "newly invited workspace admins and the owning workspace" --supporting-evidence "interviews and analytics both indicate permission-step confusion" --success-criterion "activation completion improves" --success-criterion "permission-step comprehension improves"
  aof alternative-analysis-record --project . --subject-need "Reduce activation failure for invited admins" --alternative-solution "clarify permission setup directly in product" --alternative-solution "human-assisted onboarding for high-value accounts" --non-solution-option "tighten qualification and do nothing in-product" --defer-option "wait until more interview evidence is collected" --stop-option "do not create a project if the problem is not reproducible"
  aof experiment-proposal-record --project . --assumption-to-test "permission-step confusion is the primary activation blocker" --smallest-testable-validation "five moderated walkthroughs with revised permission framing" --expected-learning "whether comprehension improves before UI build" --expected-cost "one day of research and lightweight prototype work" --success-threshold "at least four of five participants complete setup without help"
  aof project-charter-record --project . --validated-need-ref .aof/artifacts/need-validation/records/NVR-001.json --validated-objective "Ship the smallest validated intervention that reduces permission-step activation failure" --scope-item "permission-step framing" --scope-item "activation measurement" --constraint "do not redesign the full onboarding flow" --expected-outcome "higher activation completion" --expected-outcome "clearer project scope grounded in validated need"
  aof need-validation-record --project . --raw-need "Improve onboarding" --validation-status validated --validated-need "Reduce activation failure caused by permission-step confusion for newly invited admins" --decision-summary "The raw request was too broad; the validated need is narrower and evidence-backed." --authority-action approve-project-charter --project-creation-recommendation create-project --question-answer-json '{"question":"Who is affected?","answer":"newly invited workspace admins","evidence_state":"sufficient"}' --question-answer-json '{"question":"How can the assumption be tested cheaply?","answer":"run moderated walkthroughs with revised permission framing","evidence_state":"sufficient"}' --hidden-assumption "activation failure was assumed to be motivation-related" --problem-statement-ref .aof/artifacts/need-validation/problem-statements/PST-001.json --value-hypothesis-ref .aof/artifacts/need-validation/value-hypotheses/VHY-001.json --alternative-analysis-ref .aof/artifacts/need-validation/alternative-analyses/ALT-001.json --experiment-proposal-ref .aof/artifacts/need-validation/experiment-proposals/EXP-001.json --project-charter-ref .aof/artifacts/need-validation/project-charters/PCH-001.json --discovery-handoff-ref .aof/artifacts/discovery/handoffs/DHO-001.json
  aof need-validation-advance --session ./.aof/sessions/SESS-001.json --need-validation-record .aof/artifacts/need-validation/records/NVR-001.json
  aof need-validation-benchmark --project . --write-artifact /tmp/aof-need-validation-benchmark.json
  aof mission-control-benchmark --project . --write-artifact /tmp/aof-mission-control-benchmark.json
  aof operator-brief --project . --write-artifact /tmp/aof-operator-brief.json
  aof operator-progress --project . --write-artifact /tmp/aof-operator-progress.json
  aof tree-position --project . --write-artifact /tmp/aof-tree-position.json
  aof evidence-drill-down --project . --write-artifact /tmp/aof-evidence-drill-down.json
  aof evidence-drill-down-benchmark --project . --write-artifact /tmp/aof-evidence-drill-down-benchmark.json
  aof situation-assess --project . --write-artifact /tmp/aof-situation-assessment.json
  aof role-result-record --project . --role Builder --stage planning --session-id SESS-001 --status completed --recommendation "merge into team packet" --rationale "implementation path is coherent" --signal "needs Guardian review" --artifact-ref docs/spec.md --decision-required --source-task-id TASK-012 --source-parent-session-id SESS-PARENT-001
  aof role-join-record --project . --stage planning --expected-role Builder --expected-role Guardian --expected-role Visionary --received-role Builder --received-role Guardian --aggregate-state waiting-for-missing-roles --recommended-next-step "wait for Visionary result" --received-session-id SESS-BUILD-001 --received-session-id SESS-GUARD-001 --source-task-id TASK-011 --source-parent-session-id SESS-PARENT-001
  aof team-output-record --project . --team-id runtime-team --stage planning --expected-role Builder --expected-role Guardian --received-role Builder --aggregate-state waiting-for-missing-roles --recommended-next-step "wait for Guardian result" --role-result-ref .aof/artifacts/execution/role-results/RRES-001.json --blocking-signal "guardian pending" --source-task-id TASK-012 --source-parent-session-id SESS-PARENT-001
  aof council-review-packet --project . --council-id architecture-council --stage review --review-status changes-requested --decision-summary "execution packet shape is close but missing Guardian evidence" --rationale "approval requires both execution and risk viewpoints" --recommendation "request Guardian output and resubmit" --target-audience "release operator" --expected-user-reaction "block until evidence is complete" --blocking-reason "Guardian evidence is missing" --artifact-change-recommendation "show the missing evidence directly in the packet" --organization-change-recommendation "require a human-facing quality check before approval" --diagnosis-category role-gap --diagnosis-confidence 0.8 --diagnosis-evidence-ref .aof/artifacts/execution/team-outputs/TOUT-001.json --human-override-signal "owner judged the packet not yet credible" --team-output-ref .aof/artifacts/execution/team-outputs/TOUT-001.json --role-result-ref .aof/artifacts/execution/role-results/RRES-001.json --follow-up-task-id TASK-012
  aof runtime-loop-proof --project . --provider mock --source-task-id TASK-011
  aof execution-lineage --project . --source-task-id TASK-012
  aof runtime-discipline-benchmark --project . --source-task-id TASK-011
  aof learning-loop-snapshot --project .
  aof contract-register --project .
  aof dependency-graph --project .
  aof metrics-snapshot --project .
  aof organization-audit --project .
  aof organization-status --project .
  aof organization-analytics-snapshot --project .
  aof organization-verify --project ./examples/aidlc-template
  aof command-registry-refresh --project .
  aof command-register --project .
  aof command-routing-audit --project .
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
  aof visibility-serve --status-input /tmp/aof-visibility/status-card.json --timeline-input /tmp/aof-visibility/timeline-feed.json --flow-input /tmp/aof-visibility/flow-snapshot.json --mission-input /tmp/aof-visibility/mission-control.json --progress-input /tmp/aof-visibility/operator-progress.json --tree-input /tmp/aof-visibility/tree-position.json --evidence-input /tmp/aof-visibility/evidence-drill-down.json --port 4174
  aof visibility-session --project . --port 4174 --open-browser
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

  if (!SUPPORTED_COMMANDS.has(command)) {
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
      : command === "command-registry-refresh"
        ? {
            project: ".",
            artifactPath: ""
          }
      : command === "command-register"
        ? {
            project: "."
          }
      : command === "command-routing-audit"
        ? {
            project: ".",
            artifactPath: ""
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
      : command === "situation-assess"
        ? {
            project: ".",
            artifactPath: ""
          }
      : command === "operator-brief"
        ? {
            project: ".",
            artifactPath: ""
          }
      : command === "operator-progress"
        ? {
            project: ".",
            artifactPath: ""
          }
      : command === "tree-position"
        ? {
            project: ".",
            artifactPath: ""
          }
      : command === "evidence-drill-down"
        ? {
            project: ".",
            artifactPath: ""
          }
      : command === "evidence-drill-down-benchmark"
        ? {
            project: ".",
            artifactPath: ""
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
            missionInput: "",
            progressInput: "",
            treeInput: "",
            evidenceInput: "",
            host: "127.0.0.1",
            port: 4174,
            title: "AOF Visibility Viewer"
          }
      : command === "visibility-session"
        ? {
            project: ".",
            artifactDir: "",
            host: "127.0.0.1",
            port: 4174,
            title: "AOF Visibility Viewer",
            openBrowser: false
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
          : command === "discovery-handoff-benchmark"
            ? {
                project: ".",
                artifactPath: ""
              }
          : command === "release-state-refresh"
            ? {
                project: ".",
                releaseVersion: "",
                releaseTag: "",
                releaseDefinitionRef: "",
                releaseNotesRef: "",
                releaseChecklistRef: "",
                roadmapRef: "",
                releasePlanRef: "",
                organizationMission: "",
                artifactPath: ""
              }
          : command === "release-state-audit"
            ? {
                project: ".",
                artifactPath: ""
              }
          : command === "problem-statement-record"
            ? {
                project: ".",
                problemStatementId: "",
                affectedParty: "",
                actualProblem: "",
                whyItMatters: "",
                whyNow: "",
                evidenceRefs: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "value-hypothesis-record"
            ? {
                project: ".",
                valueHypothesisId: "",
                expectedValueCreation: "",
                beneficiary: "",
                supportingEvidence: [],
                successCriteria: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "alternative-analysis-record"
            ? {
                project: ".",
                alternativeAnalysisId: "",
                subjectNeed: "",
                alternativeSolutions: [],
                nonSolutionOptions: [],
                deferOptions: [],
                stopOptions: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "experiment-proposal-record"
            ? {
                project: ".",
                experimentProposalId: "",
                assumptionToTest: "",
                smallestTestableValidation: "",
                expectedLearning: "",
                expectedCost: "",
                successThreshold: "",
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "project-charter-record"
            ? {
                project: ".",
                projectCharterId: "",
                validatedNeedRef: "",
                validatedObjective: "",
                scope: [],
                constraints: [],
                expectedOutcomes: [],
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "need-validation-record"
            ? {
                project: ".",
                validationId: "",
                rawNeed: "",
                validationStatus: "",
                validatedNeed: "",
                decisionSummary: "",
                authorityAction: "",
                projectCreationRecommendation: "",
                validationQuestionsAnswered: [],
                hiddenAssumptions: [],
                evidenceGaps: [],
                problemStatementRef: "",
                valueHypothesisRef: "",
                alternativeAnalysisRef: "",
                experimentProposalRef: "",
                projectCharterRef: "",
                discoveryHandoffRef: "",
                sourceTaskId: "",
                sourceDecisionRecordId: "",
                artifactPath: ""
              }
          : command === "need-validation-advance"
            ? {
                session: "",
                needValidationRecord: "",
                projectCharterRef: ""
              }
          : command === "need-validation-benchmark"
            ? {
                project: ".",
                artifactPath: ""
              }
          : command === "mission-control-benchmark"
            ? {
                project: ".",
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
                targetAudience: "",
                expectedUserReaction: "",
                blockingReasons: [],
                artifactChangeRecommendations: [],
                organizationChangeRecommendations: [],
                diagnosisCategory: "",
                diagnosisConfidence: undefined,
                diagnosisEvidenceRefs: [],
                humanOverrideSignal: "",
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
          : command === "runtime-discipline-benchmark"
            ? {
                project: ".",
                sourceTaskId: "",
                artifactDir: ""
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
    if (part === "--mission-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --mission-input.");
      }
      options.missionInput = value;
      i += 1;
      continue;
    }
    if (part === "--progress-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --progress-input.");
      }
      options.progressInput = value;
      i += 1;
      continue;
    }
    if (part === "--tree-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --tree-input.");
      }
      options.treeInput = value;
      i += 1;
      continue;
    }
    if (part === "--evidence-input") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --evidence-input.");
      }
      options.evidenceInput = value;
      i += 1;
      continue;
    }
    if (part === "--open-browser") {
      options.openBrowser = true;
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
    if (part === "--raw-need") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --raw-need.");
      }
      options.rawNeed = value;
      i += 1;
      continue;
    }
    if (part === "--validation-status") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --validation-status.");
      }
      options.validationStatus = value;
      i += 1;
      continue;
    }
    if (part === "--validated-need") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --validated-need.");
      }
      options.validatedNeed = value;
      i += 1;
      continue;
    }
    if (part === "--authority-action") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --authority-action.");
      }
      options.authorityAction = value;
      i += 1;
      continue;
    }
    if (part === "--project-creation-recommendation") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --project-creation-recommendation.");
      }
      options.projectCreationRecommendation = value;
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
    if (part === "--affected-party") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --affected-party.");
      }
      options.affectedParty = value;
      i += 1;
      continue;
    }
    if (part === "--actual-problem") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --actual-problem.");
      }
      options.actualProblem = value;
      i += 1;
      continue;
    }
    if (part === "--why-it-matters") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --why-it-matters.");
      }
      options.whyItMatters = value;
      i += 1;
      continue;
    }
    if (part === "--why-now") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --why-now.");
      }
      options.whyNow = value;
      i += 1;
      continue;
    }
    if (part === "--expected-value-creation") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --expected-value-creation.");
      }
      options.expectedValueCreation = value;
      i += 1;
      continue;
    }
    if (part === "--beneficiary") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --beneficiary.");
      }
      options.beneficiary = value;
      i += 1;
      continue;
    }
    if (part === "--subject-need") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --subject-need.");
      }
      options.subjectNeed = value;
      i += 1;
      continue;
    }
    if (part === "--assumption-to-test") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --assumption-to-test.");
      }
      options.assumptionToTest = value;
      i += 1;
      continue;
    }
    if (part === "--smallest-testable-validation") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --smallest-testable-validation.");
      }
      options.smallestTestableValidation = value;
      i += 1;
      continue;
    }
    if (part === "--expected-learning") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --expected-learning.");
      }
      options.expectedLearning = value;
      i += 1;
      continue;
    }
    if (part === "--expected-cost") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --expected-cost.");
      }
      options.expectedCost = value;
      i += 1;
      continue;
    }
    if (part === "--success-threshold") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --success-threshold.");
      }
      options.successThreshold = value;
      i += 1;
      continue;
    }
    if (part === "--validated-need-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --validated-need-ref.");
      }
      options.validatedNeedRef = value;
      i += 1;
      continue;
    }
    if (part === "--validated-objective") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --validated-objective.");
      }
      options.validatedObjective = value;
      i += 1;
      continue;
    }
    if (part === "--need-validation-record") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --need-validation-record.");
      }
      options.needValidationRecord = value;
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
    if (part === "--question-answer-json") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --question-answer-json.");
      }
      options.validationQuestionsAnswered.push(JSON.parse(value));
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
    if (part === "--need") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --need.");
      }
      options.need = value;
      i += 1;
      continue;
    }
    if (part === "--release-version") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --release-version.");
      }
      options.releaseVersion = value;
      i += 1;
      continue;
    }
    if (part === "--release-tag") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --release-tag.");
      }
      options.releaseTag = value;
      i += 1;
      continue;
    }
    if (part === "--release-definition-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --release-definition-ref.");
      }
      options.releaseDefinitionRef = value;
      i += 1;
      continue;
    }
    if (part === "--release-notes-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --release-notes-ref.");
      }
      options.releaseNotesRef = value;
      i += 1;
      continue;
    }
    if (part === "--release-checklist-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --release-checklist-ref.");
      }
      options.releaseChecklistRef = value;
      i += 1;
      continue;
    }
    if (part === "--roadmap-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --roadmap-ref.");
      }
      options.roadmapRef = value;
      i += 1;
      continue;
    }
    if (part === "--release-plan-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --release-plan-ref.");
      }
      options.releasePlanRef = value;
      i += 1;
      continue;
    }
    if (part === "--mission") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --mission.");
      }
      options.organizationMission = value;
      i += 1;
      continue;
    }
    if (part === "--intent") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --intent.");
      }
      options.intent = value;
      i += 1;
      continue;
    }
    if (part === "--context") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --context.");
      }
      options.context = value;
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
    if (part === "--alternative-solution") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --alternative-solution.");
      }
      options.alternativeSolutions.push(value);
      i += 1;
      continue;
    }
    if (part === "--non-solution-option") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --non-solution-option.");
      }
      options.nonSolutionOptions.push(value);
      i += 1;
      continue;
    }
    if (part === "--defer-option") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --defer-option.");
      }
      options.deferOptions.push(value);
      i += 1;
      continue;
    }
    if (part === "--stop-option") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --stop-option.");
      }
      options.stopOptions.push(value);
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
    if (part === "--supporting-evidence") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --supporting-evidence.");
      }
      options.supportingEvidence.push(value);
      i += 1;
      continue;
    }
    if (part === "--success-criterion") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --success-criterion.");
      }
      options.successCriteria.push(value);
      i += 1;
      continue;
    }
    if (part === "--scope-item") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --scope-item.");
      }
      options.scope.push(value);
      i += 1;
      continue;
    }
    if (part === "--constraint") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --constraint.");
      }
      options.constraints.push(value);
      i += 1;
      continue;
    }
    if (part === "--expected-outcome") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --expected-outcome.");
      }
      options.expectedOutcomes.push(value);
      i += 1;
      continue;
    }
    if (part === "--hidden-assumption") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --hidden-assumption.");
      }
      options.hiddenAssumptions.push(value);
      i += 1;
      continue;
    }
    if (part === "--evidence-gap") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --evidence-gap.");
      }
      options.evidenceGaps.push(value);
      i += 1;
      continue;
    }
    if (part === "--problem-statement-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --problem-statement-ref.");
      }
      options.problemStatementRef = value;
      i += 1;
      continue;
    }
    if (part === "--value-hypothesis-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --value-hypothesis-ref.");
      }
      options.valueHypothesisRef = value;
      i += 1;
      continue;
    }
    if (part === "--alternative-analysis-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --alternative-analysis-ref.");
      }
      options.alternativeAnalysisRef = value;
      i += 1;
      continue;
    }
    if (part === "--experiment-proposal-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --experiment-proposal-ref.");
      }
      options.experimentProposalRef = value;
      i += 1;
      continue;
    }
    if (part === "--project-charter-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --project-charter-ref.");
      }
      options.projectCharterRef = value;
      i += 1;
      continue;
    }
    if (part === "--discovery-handoff-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --discovery-handoff-ref.");
      }
      options.discoveryHandoffRef = value;
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
      if (Array.isArray(options.blockingReasons)) {
        options.blockingReasons.push(value);
      } else {
        options.blockingReason = value;
      }
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
    if (part === "--target-audience") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --target-audience.");
      }
      options.targetAudience = value;
      i += 1;
      continue;
    }
    if (part === "--expected-user-reaction") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --expected-user-reaction.");
      }
      options.expectedUserReaction = value;
      i += 1;
      continue;
    }
    if (part === "--artifact-change-recommendation") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --artifact-change-recommendation.");
      }
      options.artifactChangeRecommendations.push(value);
      i += 1;
      continue;
    }
    if (part === "--organization-change-recommendation") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --organization-change-recommendation.");
      }
      options.organizationChangeRecommendations.push(value);
      i += 1;
      continue;
    }
    if (part === "--diagnosis-category") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --diagnosis-category.");
      }
      options.diagnosisCategory = value;
      i += 1;
      continue;
    }
    if (part === "--diagnosis-confidence") {
      const raw = rest[i + 1] ?? "";
      options.diagnosisConfidence = Number(raw);
      i += 1;
      continue;
    }
    if (part === "--diagnosis-evidence-ref") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --diagnosis-evidence-ref.");
      }
      options.diagnosisEvidenceRefs.push(value);
      i += 1;
      continue;
    }
    if (part === "--human-override-signal") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value after --human-override-signal.");
      }
      options.humanOverrideSignal = value;
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

  if (command === "visibility-session") {
    if (!options.project) {
      throw new Error("Missing --project for `visibility-session`.");
    }
    if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
      throw new Error("Invalid --port for `visibility-session`.");
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

  if (command === "runtime-discipline-benchmark") {
    if (!options.project) {
      throw new Error("Missing --project for `runtime-discipline-benchmark`.");
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

  if (command === "discovery-handoff-benchmark") {
    if (!options.project) {
      throw new Error("Missing --project for `discovery-handoff-benchmark`.");
    }
  }

  if (command === "release-state-refresh") {
    if (!options.project) {
      throw new Error("Missing --project for `release-state-refresh`.");
    }
    if (!options.releaseVersion || !options.releaseTag || !options.releaseDefinitionRef || !options.releaseNotesRef || !options.releaseChecklistRef) {
      throw new Error("Missing required release refs for `release-state-refresh`.");
    }
  }

  if (command === "release-state-audit") {
    if (!options.project) {
      throw new Error("Missing --project for `release-state-audit`.");
    }
  }

  if (command === "command-registry-refresh" || command === "command-register" || command === "command-routing-audit") {
    if (!options.project) {
      throw new Error(`Missing --project for \`${command}\`.`);
    }
  }

  if (command === "problem-statement-record") {
    if (!options.affectedParty) {
      throw new Error("Missing --affected-party for `problem-statement-record`.");
    }
    if (!options.actualProblem) {
      throw new Error("Missing --actual-problem for `problem-statement-record`.");
    }
    if (!options.whyItMatters || !options.whyNow) {
      throw new Error("Missing --why-it-matters or --why-now for `problem-statement-record`.");
    }
    if (!Array.isArray(options.evidenceRefs) || options.evidenceRefs.length === 0) {
      throw new Error("At least one --evidence-ref is required for `problem-statement-record`.");
    }
  }

  if (command === "value-hypothesis-record") {
    if (!options.expectedValueCreation) {
      throw new Error("Missing --expected-value-creation for `value-hypothesis-record`.");
    }
    if (!options.beneficiary) {
      throw new Error("Missing --beneficiary for `value-hypothesis-record`.");
    }
    if (!Array.isArray(options.supportingEvidence) || options.supportingEvidence.length === 0) {
      throw new Error("At least one --supporting-evidence is required for `value-hypothesis-record`.");
    }
    if (!Array.isArray(options.successCriteria) || options.successCriteria.length === 0) {
      throw new Error("At least one --success-criterion is required for `value-hypothesis-record`.");
    }
  }

  if (command === "alternative-analysis-record") {
    if (!options.subjectNeed) {
      throw new Error("Missing --subject-need for `alternative-analysis-record`.");
    }
    if (!Array.isArray(options.alternativeSolutions) || options.alternativeSolutions.length === 0) {
      throw new Error("At least one --alternative-solution is required for `alternative-analysis-record`.");
    }
    if (!Array.isArray(options.stopOptions) || options.stopOptions.length === 0) {
      throw new Error("At least one --stop-option is required for `alternative-analysis-record`.");
    }
  }

  if (command === "experiment-proposal-record") {
    if (!options.assumptionToTest) {
      throw new Error("Missing --assumption-to-test for `experiment-proposal-record`.");
    }
    if (!options.smallestTestableValidation || !options.expectedLearning || !options.expectedCost || !options.successThreshold) {
      throw new Error("Missing experiment proposal fields for `experiment-proposal-record`.");
    }
  }

  if (command === "project-charter-record") {
    if (!options.validatedNeedRef) {
      throw new Error("Missing --validated-need-ref for `project-charter-record`.");
    }
    if (!options.validatedObjective) {
      throw new Error("Missing --validated-objective for `project-charter-record`.");
    }
    if (!Array.isArray(options.scope) || options.scope.length === 0) {
      throw new Error("At least one --scope-item is required for `project-charter-record`.");
    }
    if (!Array.isArray(options.expectedOutcomes) || options.expectedOutcomes.length === 0) {
      throw new Error("At least one --expected-outcome is required for `project-charter-record`.");
    }
  }

  if (command === "need-validation-record") {
    if (!options.rawNeed) {
      throw new Error("Missing --raw-need for `need-validation-record`.");
    }
    if (!options.validationStatus) {
      throw new Error("Missing --validation-status for `need-validation-record`.");
    }
    if (!["validated", "reframed", "rejected", "deferred", "evidence-requested", "experiment-required"].includes(options.validationStatus)) {
      throw new Error("Invalid --validation-status for `need-validation-record`.");
    }
    if (!options.decisionSummary) {
      throw new Error("Missing --decision-summary for `need-validation-record`.");
    }
    if (!options.authorityAction) {
      throw new Error("Missing --authority-action for `need-validation-record`.");
    }
    if (!["reject-need", "defer-need", "request-evidence", "reframe-need", "require-experiment", "approve-project-charter"].includes(options.authorityAction)) {
      throw new Error("Invalid --authority-action for `need-validation-record`.");
    }
    if (!options.projectCreationRecommendation) {
      throw new Error("Missing --project-creation-recommendation for `need-validation-record`.");
    }
    if (!["do-not-create-project", "hold-project", "create-project-after-experiment", "create-project"].includes(options.projectCreationRecommendation)) {
      throw new Error("Invalid --project-creation-recommendation for `need-validation-record`.");
    }
    if (!Array.isArray(options.validationQuestionsAnswered) || options.validationQuestionsAnswered.length === 0) {
      throw new Error("At least one --question-answer-json is required for `need-validation-record`.");
    }
    if (!options.problemStatementRef || !options.valueHypothesisRef || !options.alternativeAnalysisRef) {
      throw new Error("Missing required artifact refs for `need-validation-record`.");
    }
  }

  if (command === "need-validation-advance") {
    if (!options.session) {
      throw new Error("Missing --session for `need-validation-advance`.");
    }
    if (!options.needValidationRecord) {
      throw new Error("Missing --need-validation-record for `need-validation-advance`.");
    }
  }

  if (command === "need-validation-benchmark") {
    if (!options.project) {
      throw new Error("Missing --project for `need-validation-benchmark`.");
    }
  }

  if (command === "mission-control-benchmark") {
    if (!options.project) {
      throw new Error("Missing --project for `mission-control-benchmark`.");
    }
  }

  if (command === "operator-brief") {
    if (!options.project) {
      throw new Error("Missing --project for `operator-brief`.");
    }
  }

  if (command === "operator-progress") {
    if (!options.project) {
      throw new Error("Missing --project for `operator-progress`.");
    }
  }

  if (command === "tree-position") {
    if (!options.project) {
      throw new Error("Missing --project for `tree-position`.");
    }
  }

  if (command === "evidence-drill-down") {
    if (!options.project) {
      throw new Error("Missing --project for `evidence-drill-down`.");
    }
  }

  if (command === "evidence-drill-down-benchmark") {
    if (!options.project) {
      throw new Error("Missing --project for `evidence-drill-down-benchmark`.");
    }
  }

  if (command === "situation-assess") {
    if (!options.project) {
      throw new Error("Missing --project for `situation-assess`.");
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
    if (
      options.diagnosisConfidence !== undefined
      && (!Number.isFinite(options.diagnosisConfidence) || options.diagnosisConfidence < 0 || options.diagnosisConfidence > 1)
    ) {
      throw new Error("Invalid --diagnosis-confidence for `council-review-packet`.");
    }
  }

  return { command, options };
}

async function main() {
  try {
    printUnsupportedNodeWarning();
    const parsed = parseArgs(process.argv);
    if (parsed.command === "help") {
      printHelp();
      return;
    }
    const handler = COMMAND_HANDLERS[parsed.command];
    if (!handler) {
      throw new Error(`Unsupported command: ${parsed.command}`);
    }
    let lastError = null;
    let output = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const module = await handler.load();
        const commandFn = module[handler.exportName];
        if (typeof commandFn !== "function") {
          throw new Error(`Command export is missing: ${handler.exportName}`);
        }
        const result = await commandFn(parsed.options);
        output = typeof handler.formatResult === "function"
          ? handler.formatResult(result)
          : result;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 2 || !isTransientCliError(error)) {
          throw error;
        }
        await delay(50 * (attempt + 1));
      }
    }

    if (lastError) {
      throw lastError;
    }

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    const retryCount = Number.parseInt(process.env.AOF_CLI_RETRY_COUNT ?? "0", 10) || 0;
    if (retryCount < 2 && isTransientCliError(error)) {
      const nextEnv = {
        ...process.env,
        AOF_CLI_RETRY_COUNT: String(retryCount + 1)
      };
      const retried = spawnSync(process.execPath, process.argv.slice(1), {
        encoding: "utf8",
        stdio: "pipe",
        env: nextEnv
      });
      if (retried.stdout) {
        process.stdout.write(retried.stdout);
      }
      if (retried.stderr) {
        process.stderr.write(retried.stderr);
      }
      process.exitCode = retried.status ?? 1;
      return;
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
