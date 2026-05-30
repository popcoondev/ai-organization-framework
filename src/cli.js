#!/usr/bin/env node

import { answerCommand } from "./commands/answer.js";
import { packetCommand } from "./commands/packet.js";
import { runCommand } from "./commands/run.js";

function printHelp() {
  console.log(`AOF prototype CLI

Usage:
  aof run "<request>" [--project <path>]
  aof answer --session <path> --response "<text>" [--response "<text>"]
  aof packet --session <path> [--stage <stage>] [--project <path>]

Examples:
  aof run "初回離脱率を下げたい"
  aof run "初回離脱率を下げたい" --project ./examples/aidlc-template
  aof answer --session ./examples/aidlc-template/.aof/sessions/SESS-001.json --response "新規登録導線全体" --response "登録完了率" --response "認証基盤は変更しない"
  aof packet --session ./examples/aidlc-template/.aof/sessions/SESS-001.json
  aof packet --session ./examples/aidlc-template/.aof/sessions/SESS-001.json --stage planning
`);
}

function parseArgs(argv) {
  const [, , command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (command !== "run" && command !== "answer" && command !== "packet") {
    throw new Error(`Unsupported command: ${command}`);
  }

  if (command === "run" && rest.length === 0) {
    throw new Error("Missing request string for `run`.");
  }

  const options = command === "run"
    ? { project: ".", request: rest[0] }
    : { session: "", responses: [], stage: null };

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
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
