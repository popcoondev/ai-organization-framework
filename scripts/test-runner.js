import { spawnSync } from "node:child_process";

function shouldRetry(output) {
  return /SyntaxError:|ENOENT: no such file or directory, read/.test(output);
}

const testFiles = [
  "test/model-adapter.test.js",
  "test/runtime-escalation.test.js",
  "test/runtime-core-1.test.js",
  "test/runtime-core-2.test.js",
  "test/runtime-core-3.test.js",
  "test/runtime-core-4.test.js",
  "test/runtime-situation.test.js"
];

function runOnce(testFile) {
  return spawnSync(process.execPath, [testFile], {
    encoding: "utf8",
    stdio: "pipe",
    timeout: 120000
  });
}

for (const testFile of testFiles) {
  let succeeded = false;
  let lastResult = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = runOnce(testFile);
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    lastResult = result;
    const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
    if (result.status === 0) {
      succeeded = true;
      break;
    }
    if (result.error?.code !== "ETIMEDOUT" && !shouldRetry(combined)) {
      process.exitCode = result.status ?? 1;
      process.exit();
    }
  }

  if (!succeeded) {
    process.exitCode = lastResult?.status ?? 1;
    process.exit();
  }
}

process.exitCode = 0;
