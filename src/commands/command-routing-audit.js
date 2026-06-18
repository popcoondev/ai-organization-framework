import path from "node:path";

import { writeJsonArtifact } from "../runtime/utils.js";
import { loadBundledSchema, validateAgainstSchema } from "../runtime/validation.js";
import { pathExists, readJson } from "./operator-surface-helpers.js";
import { loadCommandRegistry } from "./command-registry-helpers.js";

function pushCheck(checks, errors, name, condition, detail) {
  const status = condition ? "pass" : "fail";
  checks.push({ name, status, detail });
  if (!condition) {
    errors.push(`${name}: ${detail}`);
  }
}

async function validatePayload(payload) {
  const schema = await loadBundledSchema("aof-command-routing-audit.schema.json");
  validateAgainstSchema(payload, schema, "command routing audit");
}

export async function commandRoutingAuditCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const bootstrap = await readJson(path.join(projectRoot, ".aof", "project-bootstrap.json"), "project bootstrap");
  const orientation = await readJson(path.join(projectRoot, bootstrap.orientation_ref), "project orientation");
  const registryRecord = await loadCommandRegistry(projectRoot);
  const checks = [];
  const errors = [];

  pushCheck(checks, errors, "command registry presence", Boolean(registryRecord), registryRecord?.registryPath ?? "missing");
  if (!registryRecord) {
    const payload = {
      ok: false,
      artifact_type: "command-routing-audit",
      generated_at: new Date().toISOString(),
      project_root: projectRoot,
      checks,
      errors
    };
    await validatePayload(payload);
    const artifactPath = options.artifactPath ? await writeJsonArtifact(options.artifactPath, payload) : null;
    return { ok: false, artifactPath, summary: payload };
  }

  const registry = registryRecord.registry;
  const topCommands = new Set(registry.commands.filter((entry) => entry.top_command).map((entry) => entry.command));
  const categorySet = new Set(registry.commands.map((entry) => entry.category));

  pushCheck(
    checks,
    errors,
    "bootstrap command_registry_ref alignment",
    bootstrap.command_registry_ref === ".aof/command-registry.json",
    bootstrap.command_registry_ref
  );
  pushCheck(
    checks,
    errors,
    "orientation command_registry_ref alignment",
    orientation.command_registry_ref === bootstrap.command_registry_ref,
    `${orientation.command_registry_ref} vs ${bootstrap.command_registry_ref}`
  );
  const detailRefExists = await pathExists(path.resolve(projectRoot, registry.detail_ref));
  pushCheck(
    checks,
    errors,
    "command registry detail ref presence",
    detailRefExists || bootstrap.topology === "managed-project",
    detailRefExists ? registry.detail_ref : `${registry.detail_ref} (bundled runtime reference)`
  );

  const summaryCategories = new Set((orientation.command_routing_summary?.categories ?? []).map((entry) => entry.category));
  for (const category of categorySet) {
    pushCheck(
      checks,
      errors,
      `routing category ${category}`,
      summaryCategories.has(category),
      summaryCategories.has(category) ? "present" : "missing from orientation.command_routing_summary.categories"
    );
  }

  const summaryTopCommands = orientation.command_routing_summary?.top_commands ?? [];
  pushCheck(
    checks,
    errors,
    "routing top command presence",
    summaryTopCommands.length > 0,
    `${summaryTopCommands.length} top commands declared`
  );

  const summaryTopCommandSet = new Set(summaryTopCommands.map((entry) => entry.command));
  for (const entry of summaryTopCommands) {
    pushCheck(
      checks,
      errors,
      `top command ${entry.command}`,
      topCommands.has(entry.command),
      topCommands.has(entry.command) ? entry.command : `${entry.command} not declared as a top command in the registry`
    );
  }

  for (const topCommand of topCommands) {
    pushCheck(
      checks,
      errors,
      `registry top command coverage ${topCommand}`,
      summaryTopCommandSet.has(topCommand),
      summaryTopCommandSet.has(topCommand) ? "present" : "missing from orientation.command_routing_summary.top_commands"
    );
  }

  pushCheck(
    checks,
    errors,
    "routing runtime flow presence",
    Array.isArray(orientation.command_routing_summary?.runtime_flow) && orientation.command_routing_summary.runtime_flow.length > 0,
    `${orientation.command_routing_summary?.runtime_flow?.length ?? 0} flow steps`
  );

  const payload = {
    ok: errors.length === 0,
    artifact_type: "command-routing-audit",
    generated_at: new Date().toISOString(),
    project_root: projectRoot,
    checks,
    errors
  };
  await validatePayload(payload);

  const artifactPath = options.artifactPath ? await writeJsonArtifact(options.artifactPath, payload) : null;
  return {
    ok: payload.ok,
    artifactPath,
    summary: payload
  };
}
