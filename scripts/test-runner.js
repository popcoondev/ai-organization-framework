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
  "test/runtime-core-4.test.js"
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
    const combined = [result.stdout,