#!/usr/bin/env node

import { answerCommand } from "./commands/answer.js";
import { councilExecCommand } from "./commands/council-exec.js";
import { councilCommand } from "./commands/council.js";
import { escalationResolveCommand } from "./commands/escalation-resolve.js";
import { liveVerifyCommand } from "./commands/live-verify.js";
import { packetCommand } from "./commands/packet.js";
import { providerCheckCommand } from "./commands/provider-check.js";
import { runCommand } from "./commands/run.js";
import { signalCommand } from "./commands/signal.js";
import { verifyHistoryCommand } from "./commands/verify-history.js";
import { verifyDashboardCommand } from "./commands/verify-dashboard.js";
import { verifyDashboardIndexCommand } from "./commands/verify-dashboard-index.js";
import { verifyDashboardLogCommand } from "./commands/verify-dashboard-log.js";
import { verifyArchiveCommand } from "./commands/verify-archive.js";
import { verifyLineageCommand } from "./commands/verify-lineage.js";
import { verifyLogCommand } from "./commands/verify-log.js";

function printHelp() {
  console.log(`AOF prototype CLI

Usage:
  aof run "<request>" [--project <path>] [--fast-track|--deep-path]
  aof answer --session <path> --response "<text>" [--response "<text>"]
  aof live-verify --project <path> [--request "<text>"] [--response "<text>"] [--signal-response "<text>"] [--escalation-response "<text>"] --provider <provider> --artifact-dir <path> [--model <name>] [--base-url <url>] [--api-key-env <name>] [--ping] [--include-middle-stages] [--include-approval] [--include-signal-reopen] [--include-escalation-reopen] [--include-escalation-terminal] [--signal-path <path>] [--timeout-ms <ms>] [--max-retries <n>]
  aof verify-archive --project <path> --input <path> [--input <path>] [--archive-dir <path>]
  aof verify-history --input <path> [--input <path>] --artifact-dir <path>
  aof verify-log --input <path> [--input <path>] --artifact-dir <path>
  aof verify-lineage --history-input <path> --log-input <path> --index-input <path> --artifact-dir <path>
  aof verify-dashboard --history-input <path> --log-input <path> --index-input <path> --lineage-input <path> --artifact-dir <path>
  aof verify-dashboard-log --input <path> [--input <path>] --artifact-dir <path>
  aof verify-dashboard-index --log-input <path> --artifact-dir <path>
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
  aof live-verify --project ./examples/aidlc-template --provider mock --artifact-dir /tmp/aof-live-verification --include-middle-stages --include-approval --include-signal-reopen --include-escalation-reopen --include-escalation-terminal --timeout-ms 30000 --max-retries 0
  aof verify-archive --project ./examples/aidlc-template --input /tmp/aof-live-verification
  aof verify-history --input /tmp/aof-live-verification --input /tmp/aof-live-verification-second/verification-bundle.json --artifact-dir /tmp/aof-verification-history
  aof verify-log --input /tmp/aof-live-verification --artifact-dir /tmp/aof-verification-log
  aof verify-lineage --history-input /tmp/aof-verification-history/verification-history.json --log-input /tmp/aof-verification-log/verification-log.json --index-input /tmp/aof-verification-log/verification-index.json --artifact-dir /tmp/aof-verification-lineage
  aof verify-dashboard --history-input /tmp/aof-verification-history/verification-history.json --log-input /tmp/aof-verification-log/verification-log.json --index-input /tmp/aof-verification-log/verification-index.json --lineage-input /tmp/aof-verification-lineage/verification-lineage.json --artifact-dir /tmp/aof-verification-dashboard
  aof verify-dashboard-log --input /tmp/aof-verification-dashboard --artifact-dir /tmp/aof-verification-dashboard-log
  aof verify-dashboard-index --log-input /tmp/aof-verification-dashboard-log/verification-dashboard-log.json --artifact-dir /tmp/aof-verification-dashboard-index
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

  if (command !== "run" && command !== "answer" && command !== "live-verify" && command !== "verify-archive" && command !== "verify-history" && command !== "verify-log" && command !== "verify-lineage" && command !== "verify-dashboard" && command !== "verify-dashboard-log" && command !== "verify-dashboard-index" && command !== "packet" && command !== "signal" && command !== "council" && command !== "council-exec" && command !== "provider-check" && command !== "escalation-resolve") {
    throw new Error(`Unsupported command: ${command}`);
  }

  if (command === "run" && rest.length === 0) {
    throw new Error("Missing request string for `run`.");
  }

  const options = command === "run"
    ? { project: ".", request: rest[0], routingMode: null }
    : command === "answer"
      ? { session: "", responses: [] }
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
            escalationStopNote: ""
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
            archiveDir: ""
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
  }

  if (command === "verify-archive") {
    if (!options.project) {
      throw new Error("Missing --project for `verify-archive`.");
    }
    if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
      throw new Error("At least one --input is required for `verify-archive`.");
    }
  }

  if (command === "verify-history" || command === "verify-log" || command === "verify-dashboard-log") {
    if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
      throw new Error(`At least one --input is required for \`${command}\`.`);
    }
    if (!options.artifactDir) {
      throw new Error(`Missing --artifact-dir for \`${command}\`.`);
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

    if (parsed.command === "answer") {
      const result = await answerCommand(parsed.options);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (parsed.command === "live-verify") {
      const result = await liveVerifyCommand(parsed.options);
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
