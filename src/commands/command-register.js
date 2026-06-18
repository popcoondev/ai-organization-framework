import path from "node:path";

import { loadCommandRegistry, summarizeCommandRegistry } from "./command-registry-helpers.js";

export async function commandRegisterCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const record = await loadCommandRegistry(projectRoot);
  if (!record) {
    throw new Error("command registry is missing. Run `aof command-registry-refresh --project <path>` or `aof upgrade`.");
  }

  return {
    ok: true,
    projectRoot,
    registry_path: record.registryPath,
    detail_ref: record.registry.detail_ref,
    ...summarizeCommandRegistry(record.registry),
    commands: record.registry.commands
  };
}
