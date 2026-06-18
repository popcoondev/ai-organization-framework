import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";
import { loadBundledSchema, validateAgainstSchema } from "../runtime/validation.js";
import { maybeReadJson } from "./operator-surface-helpers.js";

export function resolveCommandRegistryPath(projectRoot) {
  return path.join(resolveAofRoot(projectRoot), "command-registry.json");
}

export async function loadCommandRegistry(projectRoot) {
  const registryPath = resolveCommandRegistryPath(projectRoot);
  const registry = await maybeReadJson(registryPath, "command registry");
  if (!registry) {
    return null;
  }

  const schema = await loadBundledSchema("aof-command-registry.schema.json");
  validateAgainstSchema(registry, schema, "command registry");

  return {
    registryPath,
    registry
  };
}

export function summarizeCommandRegistry(registry) {
  const commands = Array.isArray(registry?.commands) ? registry.commands : [];
  const categoryCounts = {};
  for (const entry of commands) {
    categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
  }
  return {
    command_count: commands.length,
    category_counts: categoryCounts,
    top_commands: commands.filter((entry) => entry.top_command).map((entry) => entry.command)
  };
}
