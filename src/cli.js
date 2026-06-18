#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TRANSIENT_CLI_ERROR_PATTERNS = [
  /Unexpected end of input/,
  /Invalid or unexpected token/,
  /ENOENT: no such file or directory, read/,
  /Invalid package config/,
  /missing \) after argument list/
];

function isTransientCliFailure(output) {
  return TRANSIENT_CLI_ERROR_PATTERNS.some((pattern) => pattern.test(output));
}

const cliMainPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "cli-main.js");
const args = [cliMainPath, ...process.argv.slice(2)];
let lastResult = null;

for (let attempt = 0; attempt < 5; attempt += 1) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    stdio: "pipe",
    env: process.env
  });
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
  lastResult = result;

  if (result.status === 0 || !isTransientCliFailure(combined)) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (lastResult && process.exitCode === undefined) {
  if (lastResult.stdout) {
    process.stdout.write(lastResult.stdout);
  }
  if (lastResult.stderr) {
    process.stderr.write(lastResult.stderr);
  }
  process.exitCode = lastResult.status ?? 1;
}
