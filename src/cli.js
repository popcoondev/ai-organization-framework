#!/usr/bin/env node

import { answerCommand } from "./commands/answer.js";
import { councilExecCommand } from "./commands/council-exec.js";
import { councilCommand } from "./commands/council.js";
import { packetCommand } from "./commands/packet.js";
import { runCommand } from "./commands/run.js";
import { signalCommand } from "./commands/signal.js";

function printHelp() {
  console.log(`AOF prototype CLI

Usage:
  aof run "<request>" [--project <path>]
  aof answer --session <path> --response "<text>" [--response "<text>"]
  aof packet --session <path> --stage <stage> [--project <path>] [--role <role>]
  aof council --session <path> --stage <stage> [--project <path>] [--role <role>] [--include-optional]
  aof council-exec --session <path> --stage <stage> [--project <path>] [--role <role>] [--include-optional] [--invoke-model] [--provider <provider>] [--model <name>]
  aof signal --session <path> --signal <path>

Examples:
  aof run "初回離脱率を下げたい"
  aof run "初回離脱率を下げたい" --project ./examples/aidlc-template
  aof answer --session ./examples/aidlc-template/.aof/sessions/SESS-001.json --response "新規登録導線全体" --response "登録完了率" --response "認証基盤は変更しない"
  aof packet --session ./examples/aidlc-template/.aof/sessions/SESS-001.json --stage planning
  aof council --session ./examples/aidlc-template/.aof/sessions/SESS-001.json --stage review --include-optional
  aof council-exec --session ./examples/aidlc-template/.aof/sessions/SESS-001.json --stage planning --invoke-model --provider mock
  aof signal --session ./examples/aidlc-template/.aof/sessions/SESS-001.json --signal ./examples/aidlc-template/.aof/signals/SIG-001.json
`);
}

function parseArgs(argv) {
  const [, , command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (command !== "run" && command !== "answer" && command !== "packet" && command !== "signal" && command !== "council" && command !== "council-exec") {
    throw new Error(`Unsupported command: ${command}`);
  }

  if (command === "run" && rest.length === 0) {
    throw new Error("Missing request string for `run`.");
  }

  const options = command === "run"
    ? { project: ".", request: rest[0] }
    : command === "answer"
      ? { session: "", responses: [] }
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
              temperature: undefined
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
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
