#!/usr/bin/env node

import { answerCommand } from "./commands/answer.js";
import { alignmentPulseCommand } from "./commands/alignment-pulse.js";
import { confirmationWindowRecordCommand } from "./commands/confirmation-window-record.js";
import { councilExecCommand } from "./commands/council-exec.js";
import { councilCommand } from "./commands/council.js";
import { escalationResolveCommand } from "./commands/escalation-resolve.js";
import { goalProjectCommand } from "./commands/goal-project.js";
import { liveVerifyCommand } from "./commands/live-verify.js";
import { outcomeReportCommand } from "./commands/outcome-report.js";
import { packetCommand } from "./commands/packet.js";
import { providerCheckCommand } from "./commands/provider-check.js";
import { runCommand } from "./commands/run.js";
import { signalCommand } from "./commands/signal.js";
import { taskOpenCommand } from "./commands/task-open.js";
import { taskUpdateCommand } from "./commands/task-update.js";
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
  aof answer --session <path> --response "<text>" [--response "<text>"]
  aof outcome-report --session <path> --result <success|partial|failure> [--note "<text>"] [--signal-ref <ref>]
  aof task-open --project <path> --title "<text>" [--description "<text>"] [--origin <origin>] [--orchestrator-session-id <id>] [--assigned-session-id <id>] [--related-decision-record-id <id>] [--operating-goal-ref <ref>] [--triage-notes "<text>"]
  aof task-update --project <path> --task-id <TASK-id> [--status <open|assigned|done|archived|retired>] [--assigned-session-id <id>] [--related-decision-record-id <id>] [--triage-notes "<text>"]
  aof goal-project --project <path> --goal-type <north-star|operating-goal|next-value-slice> --content "<text>" [--agreed-with-human] [--source-session-id <id>] [--source-decision-record-id <id>] [--declared-complete]
  aof confirmation-window-record --project <path> --question "<text>" --answer "<text>" [--expectation-state "<text>"] [--mismatch-state "<text>"] [--scale-direction "<text>"] [--source-session-id <id>] [--source-decision-record-id <id>] [--max-entries <n>]
  aof alignment-pulse --project <path> --question "<text>" --answer "<text>" [--expectation-state "<text>"] [--mismatch-state "<text>"] [--scale-direction "<text>"] [--prioritized-task-id <TASK-id>] [--stale-task-id <TASK-id>] [--retire-candidate-task-id <TASK-id>] [--triage-note "<text>"] [--source-session-id <id>] [--source-decision-record-id <id>] [--max-entries <n>]
  aof live-verify --project <path> [--request "<text>"] [--response "<text>"] [--signal-response "<text>"] [--escalation-response "<text>"] --provider <provider> --artifact-dir <path> [--model <name>] [--base-url <url>] [--api-key-env <name>] [--ping] [--include-middle-stages] [--include-approval] [--include-signal-reopen] [--include-escalation-reopen] [--include-escalation-terminal] [--signal-path <path>] [--timeout-ms <ms>] [--max-retries <n>] [--archive] [--archive-dir <path>] [--archive-max-runs <n>]
  aof verify-archive --project <path> --input <path> [--input <path>] [--archive-dir <path>] [--max-runs <n>]
  aof verify-archive-dashboard --index-input <path> --log-input <path> --artifact-dir <path>
  aof verify-archive-log --input <path> [--input <path>] --artifact-dir <path>
  aof verify-history --input <path> [--input <path>] --artifact-dir <path>
  aof verify-log --input <path> [--input <path>] --artifact-dir <path>
  aof verify-lineage --history-input <path> --log-input <path> --index-input <path> --artifact-dir <path>
  aof verify-dashboard --history-input <path> --log-input <path> --index-input <path> --lineage-input <path> --artifact-dir <path>
  aof verify-dashboard-log --input <path> [--input <path>] --artifact-dir <path>
  aof verify-dashboard-index --log-input <path> --artifact-dir <path>
  aof visibility-serve --status-input <path> --timeline-input <path> --flow-input <path> [--host <host>] [--port <port>] [--title <text>]
  aof packet --session <path> --stage <stage> [--project <path>] [--role <role>]
  aof council --session <path> --stage <stage> [--project <path>] [--role <role>] [--include-optional]
  aof council-exec --session <path> --stage <stage> [--project <path>] [--role <role>] [--include-optional] [--invoke-model] [--provider <provider>] [--model <name>] [--mock-seat-decision <Role=decision>] [--mock-seat-veto <Role=yes|no>] [--write-artifact <path>] [--timeout-ms <ms>] [--max-retries <n>]
  aof provider-check [--provider <provider>] [--model <name>] [--base-url <url>] [--api-key-env <name>] [--ping] [--write-artifact <path>] [--timeout-ms <ms>] [--max-retries <n>]
  aof escalation-resolve --session <path> --resolution <approve|reopen|stop> --note "<text>"
  aof signal --session <path> --signal <path>

Examples:
  aof run "初回離脱率を下げたい"
  aof run "初回離脱率を下げたい" --project ./examples/aidlc-template
  aof answer --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --response "新規登録導線全体" --response "登録完了率" --response "認証基盤は変更しない"
  aof outcome-report --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json --result success --note "登録導線の KPI が改善した" --signal-ref SIG-001
  aof task-open --project ./examples/aidlc-template --title "Add runtime write path" --origin orchestrator --operating-goal-ref v1.8-self-hosting
  aof task-update --project ./examples/aidlc-template --task-id TASK-001 --status done --related-decision-record-id DEC-001
  aof goal-project --project ./examples/aidlc-template --goal-type next-value-slice --content "Add runtime write path for tasks and goals" --agreed-with-human
  aof confirmation-window-record --project ./examples/aidlc-template --question "まだ解くべき問題は同じか" --answer "はい。runtime write path が最優先" --expectation-state "self-hosting gap remains active"
  aof alignment-pulse --project ./examples/aidlc-template --question "まだ解くべき問題は同じか" --answer "はい。task triage cadence を runtime に入れる" --prioritized-task-id TASK-004 --triage-note "cadence-focused pulse after v1.9.0"
  aof live-verify --project ./examples/aidlc-template --provider mock --artifact-dir /tmp/aof-live-verification --include-middle-stages --include-approval --include-signal-reopen --include-escalation-reopen --include-escalation-terminal --timeout-ms 30000 --max-retries 0 --archive --archive-max-runs 10
  aof verify-archive --project ./examples/aidlc-template --input /tmp/aof-live-verification --max-runs 10
  aof verify-archive-dashboard --index-input ./examples/aidlc-template/.aof/artifacts/verification/verification-archive-index.json --log-input ./examples/aidlc-template/.aof/artifacts/verification/archive-log/verification-archive-log.json --artifact-dir /tmp/aof-verification-archive-dashboard
  aof verify-archive-log --input ./examples/aidlc-template/.aof/artifacts/verification/verification-archive-index.json --artifact-dir /tmp/aof-verification-archive-log
  aof verify-history --input /tmp/aof-live-verification --input /tmp/aof-live-verification-second/verification-bundle.json --artifact-dir /tmp/aof-verification-history
  aof verify-log --input /tmp/aof-live-verification --artifact-dir /tmp/aof-verification-log
  aof verify-lineage --history-input /tmp/aof-verification-history/verification-history.json --log-input /tmp/aof-verification-log/verification-log.json --index-input /tmp/aof-verification-log/verification-index.json --artifact-dir /tmp/aof-verification-lineage
  aof verify-dashboard --history-input /tmp/aof-verification-history/verification-history.json --log-input /tmp/aof-verification-log/verification-log.json --index-input /tmp/aof-verification-log/verification-index.json --lineage-input /tmp/aof-verification-lineage/verification-lineage.json --artifact-dir /tmp/aof-verification-dashboard
  aof verify-dashboard-log --input /tmp/aof-verification-dashboard --artifact-dir /tmp/aof-verification-dashboard-log
  aof verify-dashboard-index --log-input /tmp/aof-verification-dashboard-log/verification-dashboard-log.json --artifact-dir /tmp/aof-verification-dashboard-index
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

  if (command !== "run" && command !== "answer" && command !== "outcome-report" && command !== "task-open" && command !== "task-update" && command !== "goal-project" && command !== "confirmation-window-record" && command !== "alignment-pulse" && command !== "live-verify" && command !== "verify-archive" && command !== "verify-archive-dashboard" && command !== "verify-archive-log" && command !== "verify-history" && command !== "verify-log" && command !== "verify-lineage" && command !== "verify-dashboard" && command !== "verify-dashboard-log" && command !== "verify-dashboard-index" && command !== "visibility-serve" && command !== "packet" && command !== "signal" && command !== "council" && command !== "council-exec" && command !== "provider-check" && command !== "escalation-resolve") {
    throw new Error(`Unsupported command: ${command}`);
  }

  if (command === "run" && rest.length === 0) {
    throw new Error("Missing request string for `run`.");
  }

  const options = command === "run"
    ? { project: ".", request: rest[0], routingMode: null }
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
          : command === "escalation-resolve"
            ? { session: "", resolution: "", note: "" }
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
      options.taskId = rest[i + 1] ?? "";
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
    if (part === "--triage-note") {
      options.triageNote = rest[i + 1] ?? "";
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
      options.signal = value;
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

  if (command === "packet") {
    if (!options.session) {
      throw new Error("Missing --session for `packet`.");
    }
    if (!options.stage) {
      throw new Error("Missing --stage for `packet`.