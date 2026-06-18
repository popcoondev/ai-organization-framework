import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";
import { loadCommandRegistry, summarizeCommandRegistry } from "./command-registry-helpers.js";
import { TASK_STATUSES } from "./operator-surface-helpers.js";
import { loadActiveReleaseManifest } from "./release-state-helpers.js";

async function readJson(filePath, label) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function countTaskFiles(tasksRoot, status) {
  try {
    const entries = await fs.readdir(path.join(tasksRoot, status), { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function maybeReadGoal(goalsRoot, fileName) {
  try {
    return await readJson(path.join(goalsRoot, fileName), `goal ${fileName}`);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function summarizeNames(items, idKey, nameKey) {
  return (items ?? []).map((item) => ({
    id: item[idKey],
    name: item[nameKey]
  }));
}

export async function organizationStatusCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const bootstrap = await readJson(path.join(aofRoot, "project-bootstrap.json"), "project bootstrap");
  const organization = await readJson(path.join(aofRoot, "organization.json"), "organization");
  const goalsRoot = path.join(aofRoot, "goals");
  const tasksRoot = path.join(aofRoot, "tasks");

  const [northStar, operatingGoal, nextValueSlice] = await Promise.all([
    maybeReadGoal(goalsRoot, "north-star.json"),
    maybeReadGoal(goalsRoot, "operating-goal.json"),
    maybeReadGoal(goalsRoot, "next-value-slice.json")
  ]);
  const activeReleaseRecord = await loadActiveReleaseManifest(projectRoot);
  const commandRegistryRecord = await loadCommandRegistry(projectRoot);

  const taskCounts = Object.fromEntries(
    await Promise.all(TASK_STATUSES.map(async (status) => [status, await countTaskFiles(tasksRoot, status)]))
  );

  const capabilityLayer = {
    skills_present: await pathExists(path.join(aofRoot, "skills.json")),
    capability_registry_present: await pathExists(path.join(aofRoot, "capability-registry.json")),
    resource_inventory_present: await pathExists(path.join(aofRoot, "resource-inventory.json")),
    policy_set_present: await pathExists(path.join(aofRoot, "policies.json"))
  };

  return {
    ok: true,
    projectRoot,
    aofRoot,
    topology: bootstrap.topology,
    install_mode: bootstrap.install_mode,
    write_target: bootstrap.write_target,
    mission: organization.mission ?? null,
    goals: {
      north_star: northStar?.content ?? null,
      operating_goal: operatingGoal?.content ?? null,
      next_value_slice: nextValueSlice?.content ?? null
    },
    active_release: activeReleaseRecord?.manifest ?? null,
    organization_summary: {
      council_count: (organization.councils ?? []).length,
      team_count: (organization.teams ?? []).length,
      role_count: (organization.roles ?? []).length,
      agent_count: (organization.agents ?? []).length,
      contract_count: (organization.contracts ?? []).length,
      dependency_count: (organization.dependencies ?? []).length
    },
    councils: summarizeNames(organization.councils, "council_id", "name"),
    teams: summarizeNames(organization.teams, "team_id", "name"),
    roles: summarizeNames(organization.roles, "role_id", "name"),
    task_counts: taskCounts,
    capability_layer: capabilityLayer,
    command_surface: {
      command_registry_present: Boolean(commandRegistryRecord),
      ...(commandRegistryRecord ? summarizeCommandRegistry(commandRegistryRecord.registry) : {
        command_count: 0,
        category_counts: {},
        top_commands: []
      })
    }
  };
}
