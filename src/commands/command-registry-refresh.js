import path from "node:path";

import { buildCommandRegistryPayload } from "../runtime/command-registry-payload.js";
import { nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { loadBundledSchema, validateAgainstSchema } from "../runtime/validation.js";
import { resolveCommandRegistryPath } from "./command-registry-helpers.js";

async function validatePayload(payload) {
  const schema = await loadBundledSchema("aof-command-registry.schema.json");
  validateAgainstSchema(payload, schema, "command registry");
}

export async function commandRegistryRefreshCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const payload = buildCommandRegistryPayload(nowIso());
  await validatePayload(payload);

  const artifactPath = options.artifactPath
    ? path.resolve(projectRoot, options.artifactPath)
    : resolveCommandRegistryPath(projectRoot);
  const writtenPath = await writeJsonArtifact(artifactPath, payload);

  return {
    ok: true,
    projectRoot,
    artifactPath: writtenPath,
    command_count: payload.commands.length,
    categories: [...new Set(payload.commands.map((entry) => entry.category))],
    top_commands: payload.commands.filter((entry) => entry.top_command).map((entry) => entry.command)
  };
}
