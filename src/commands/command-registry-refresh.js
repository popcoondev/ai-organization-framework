import fs from "node:fs/promises";
import path from "node:path";

import { buildCommandRegistryPayload, buildCommandRoutingSummary } from "../runtime/command-registry-payload.js";
import { nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { loadBundledSchema, validateAgainstSchema, validateWithBundledSchema } from "../runtime/validation.js";
import { resolveCommandRegistryPath } from "./command-registry-helpers.js";


async function refreshOrientationSummary(projectRoot, generatedAt) {
  const bootstrapPath = path.join(projectRoot, ".aof", "project-bootstrap.json");
  let bootstrap;
  try {
    bootstrap = JSON.parse(await fs.readFile(bootstrapPath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const orientationRef = bootstrap.orientation_ref || ".aof/context/active/project-orientation.json";
  const orientationPath = path.resolve(projectRoot, orientationRef);
  let orientation;
  try {
    orientation = JSON.parse(await fs.readFile(orientationPath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  orientation.command_registry_ref = bootstrap.command_registry_ref || orientation.command_registry_ref;
  orientation.command_routing_summary = buildCommandRoutingSummary();
  orientation.updated_at = generatedAt;
  await validateWithBundledSchema(orientation, "aof-project-orientation.schema.json", "project orientation");
  return writeJsonArtifact(orientationPath, orientation);
}

async function validatePayload(payload) {
  const schema = await loadBundledSchema("aof-command-registry.schema.json");
  validateAgainstSchema(payload, schema, "command registry");
}

export async function commandRegistryRefreshCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const generatedAt = nowIso();
  const payload = buildCommandRegistryPayload(generatedAt);
  await validatePayload(payload);

  const artifactPath = options.artifactPath
    ? path.resolve(projectRoot, options.artifactPath)
    : resolveCommandRegistryPath(projectRoot);
  const writtenPath = await writeJsonArtifact(artifactPath, payload);
  const orientationPath = await refreshOrientationSummary(projectRoot, generatedAt);

  return {
    ok: true,
    projectRoot,
    artifactPath: writtenPath,
    orientationPath,
    command_count: payload.commands.length,
    categories: [...new Set(payload.commands.map((entry) => entry.category))],
    top_commands: payload.commands.filter((entry) => entry.top_command).map((entry) => entry.command)
  };
}
