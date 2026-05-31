import { spawnSync } from "node:child_process";

function shouldRetry(output) {
  return /SyntaxError:/.test(output);
}

const args = ["--test", "--test-isolation=none", "--test-concurrency=1"];
let lastResult = null;

for (let attempt = 0; attempt < 3; attempt += 1) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    stdio: "pipe",
    timeout: 120000
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  lastResult = result;
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
  if (result.status === 0 || (result.error?.code !== "ETIMEDOUT" && !shouldRetry(combined))) {
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (lastResult && process.exitCode === undefined) {
  process.exitCode = lastResult.status ?? 1;
}
