import fs from "node:fs/promises";
import path from "node:path";

import {
  buildCommandRegistryPayload,
  buildCommandRoutingSummary,
  COMMAND_REGISTRY_FILE
} from "./command-registry-payload.js";
import { resolveAofRoot } from "./project-paths.js";
import { ensureDir, nowIso, writeJsonArtifact } from "./utils.js";
import { validateWithBundledSchema } from "./validation.js";

const GOAL_TYPE_TO_FILE = {
  "north-star": "north-star.json",
  "operating-goal": "operating-goal.json",
  "next-value-slice": "next-value-slice.json"
};

const RECENT_CONFIRMATION_WINDOW_FILE = "recent-confirmation-window.json";
const PROJECT_BOOTSTRAP_FILE = "project-bootstrap.json";
const PROJECT_ORIENTATION_FILE = "project-orientation.json";
const ORGANIZATION_FILE = "organization.json";
const SKILLS_FILE = "skills.json";
const CAPABILITY_REGISTRY_FILE = "capability-registry.json";
const RESOURCE_INVENTORY_FILE = "resource-inventory.json";
const POLICY_FILE = "policies.json";
const BOOTSTRAP_FORMAT_VERSION = 1;
const PACKAGE_JSON_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "package.json");

let cachedAofVersion = null;

function defaultWriteTargetForTopology(topology) {
  return topology === "managed-project" ? "aof/state" : "main";
}

async function getCurrentAofVersion() {
  if (cachedAofVersion) {
    return cachedAofVersion;
  }

  const packageJson = JSON.parse(await fs.readFile(PACKAGE_JSON_PATH, "utf8"));
  cachedAofVersion = packageJson.version;
  return cachedAofVersion;
}

function buildProjectOrientationPayload({
  timestamp,
  projectType = null,
  domainSummary = null,
  existing = null
}) {
  return {
    orientation_type: "project-orientation",
    project_type: existing?.project_type || projectType || "fill-this-in",
    domain_summary: existing?.domain_summary || domainSummary || "Summarize the product/domain in 1-3 sentences.",
    repo_boundaries: existing?.repo_boundaries || [
      "List the directories or subsystems the AI may work in by default."
    ],
    protected_areas: existing?.protected_areas || [
      "List files, directories, or production surfaces that require explicit human approval."
    ],
    required_commands: existing?.required_commands || [
      "List the minimum local commands the AI should know before editing or verifying this project."
    ],
    verification_entrypoints: existing?.verification_entrypoints || [
      "List the tests, smoke checks, or review steps required before claiming completion."
    ],
    release_constraints: existing?.release_constraints || [
      "List deployment, compliance, or release constraints that shape safe execution."
    ],
    human_owner: existing?.human_owner || "Name the human owner or team responsible for final approval.",
    approval_boundary: existing?.approval_boundary || "Explain which changes the AI may do autonomously and which require explicit human approval.",
    command_registry_ref: `.aof/${COMMAND_REGISTRY_FILE}`,
    command_routing_summary: buildCommandRoutingSummary(),
    updated_at: timestamp
  };
}

function buildGoalPayloads(timestamp, existingGoals = {}) {
  return [
    {
      goal_type: "north-star",
      content: existingGoals["north-star"]?.content || "Describe the long-term project goal this repo serves.",
      updated_at: timestamp,
      agreed_with_human: existingGoals["north-star"]?.agreed_with_human ?? null,
      source_session_id: existingGoals["north-star"]?.source_session_id ?? null,
      source_decision_record_id: existingGoals["north-star"]?.source_decision_record_id ?? null,
      declared_complete_at: existingGoals["north-star"]?.declared_complete_at ?? null
    },
    {
      goal_type: "operating-goal",
      content: existingGoals["operating-goal"]?.content || "Describe the current operating goal for the next execution loop.",
      updated_at: timestamp,
      agreed_with_human: existingGoals["operating-goal"]?.agreed_with_human ?? null,
      source_session_id: existingGoals["operating-goal"]?.source_session_id ?? null,
      source_decision_record_id: existingGoals["operating-goal"]?.source_decision_record_id ?? null,
      declared_complete_at: existingGoals["operating-goal"]?.declared_complete_at ?? null
    },
    {
      goal_type: "next-value-slice",
      content: existingGoals["next-value-slice"]?.content || "Describe the next smallest useful slice to deliver.",
      updated_at: timestamp,
      agreed_with_human: existingGoals["next-value-slice"]?.agreed_with_human ?? null,
      source_session_id: existingGoals["next-value-slice"]?.source_session_id ?? null,
      source_decision_record_id: existingGoals["next-value-slice"]?.source_decision_record_id ?? null,
      declared_complete_at: existingGoals["next-value-slice"]?.declared_complete_at ?? null
    }
  ];
}

function buildConfirmationWindowPayload(timestamp, existing = null) {
  return {
    window_type: "recent-confirmation-window",
    updated_at: timestamp,
    entries: Array.isArray(existing?.entries) ? existing.entries : []
  };
}

function buildOrganizationPayload({
  timestamp,
  topology,
  existing = null
}) {
  if (existing) {
    return {
      ...existing,
      skills_ref: existing.skills_ref ?? `.aof/${SKILLS_FILE}`,
      capability_registry_ref: existing.capability_registry_ref ?? `.aof/${CAPABILITY_REGISTRY_FILE}`,
      resource_inventory_ref: existing.resource_inventory_ref ?? `.aof/${RESOURCE_INVENTORY_FILE}`,
      policy_ref: existing.policy_ref ?? `.aof/${POLICY_FILE}`,
      updated_at: timestamp
    };
  }

  return {
    organization_type: "aof-organization",
    organization_format_version: 1,
    mission: "Describe the mission this project organization exists to serve.",
    project_ref: ".aof/context/active/project-orientation.json",
    skills_ref: `.aof/${SKILLS_FILE}`,
    capability_registry_ref: `.aof/${CAPABILITY_REGISTRY_FILE}`,
    resource_inventory_ref: `.aof/${RESOURCE_INVENTORY_FILE}`,
    policy_ref: `.aof/${POLICY_FILE}`,
    topology,
    councils: [
      {
        council_id: "product-council",
        name: "Product Council",
        mission: "Own value, priority, and product direction decisions.",
        approval_policy: "2_of_3",
        responsibilities: ["priority decisions", "scope decisions", "human value alignment"]
      },
      {
        council_id: "architecture-council",
        name: "Architecture Council",
        mission: "Own technical direction, architecture tradeoffs, and integration risk.",
        approval_policy: "2_of_3",
        responsibilities: ["architecture decisions", "contract review", "dependency risk"]
      },
      {
        council_id: "operations-council",
        name: "Operations Council",
        mission: "Own delivery health, verification, cost, and operational safety.",
        approval_policy: "2_of_3",
        responsibilities: ["delivery health", "quality signals", "escalation routing"]
      }
    ],
    teams: [
      {
        team_id: "integration-team",
        name: "Integration Team",
        mission: "Keep contracts and cross-team dependencies explicit.",
        responsibilities: ["API contracts", "event schemas", "cross-team integration"],
        authority: ["request contract clarification", "raise dependency escalations"],
        deliverables: ["contract register", "dependency register"],
        dependencies: []
      },
      {
        team_id: "qa-team",
        name: "QA Team",
        mission: "Protect quality, verification, and release confidence.",
        responsibilities: ["test strategy", "risk review", "acceptance checks"],
        authority: ["request verification evidence", "raise release risk"],
        deliverables: ["verification plan", "quality findings"],
        dependencies: []
      }
    ],
    roles: [
      {
        role_id: "visionary",
        name: "Visionary",
        mission: "Protect intent, value, and strategic direction.",
        authority: ["recommend direction", "challenge misalignment"],
        team_ref: null,
        assignments: []
      },
      {
        role_id: "builder",
        name: "Builder",
        mission: "Protect feasibility, implementation path, and delivery sequencing.",
        authority: ["recommend implementation plan", "challenge infeasible scope"],
        team_ref: null,
        assignments: []
      },
      {
        role_id: "guardian",
        name: "Guardian",
        mission: "Protect risk, quality, safety, and approval boundaries.",
        authority: ["raise risk", "request human approval"],
        team_ref: null,
        assignments: []
      }
    ],
    agents: [],
    contracts: [],
    dependencies: [],
    knowledge_owners: [],
    metrics: [],
    escalation: [
      {
        from: "role",
        to: "team-lead",
        condition: "Role-local authority is insufficient."
      },
      {
        from: "team-lead",
        to: "council",
        condition: "Cross-team, priority, architecture, or risk decision is required."
      },
      {
        from: "council",
        to: "human-authority",
        condition: "Human approval boundary is reached."
      }
    ],
    lifecycle: {
      state: "create",
      allowed_states: ["create", "operate", "measure", "improve", "split", "merge", "archive"]
    },
    updated_at: timestamp
  };
}

function buildSkillsPayload(timestamp) {
  return {
    skills_type: "aof-skills",
    skills_format_version: 1,
    organization_ref: `.aof/${ORGANIZATION_FILE}`,
    skills: [],
    updated_at: timestamp
  };
}

function buildCapabilityRegistryPayload(timestamp) {
  return {
    capability_registry_type: "aof-capability-registry",
    capability_registry_format_version: 1,
    organization_ref: `.aof/${ORGANIZATION_FILE}`,
    capabilities: [],
    updated_at: timestamp
  };
}

function buildResourceInventoryPayload(timestamp) {
  return {
    resource_inventory_type: "aof-resource-inventory",
    resource_inventory_format_version: 1,
    organization_ref: `.aof/${ORGANIZATION_FILE}`,
    resources: [],
    updated_at: timestamp
  };
}

function buildPolicyPayload(timestamp) {
  return {
    policy_set_type: "aof-policy-set",
    policy_set_format_version: 1,
    organization_ref: `.aof/${ORGANIZATION_FILE}`,
    policies: [],
    updated_at: timestamp
  };
}

async function ensureBootstrapSkeleton(aofRoot) {
  const dirs = [
    "decisions",
    "sessions",
    path.join("context", "active"),
    path.join("context", "summaries"),
    path.join("context", "snapshots"),
    path.join("context", "archive"),
    path.join("context", "threads"),
    path.join("tasks", "open"),
    path.join("tasks", "assigned"),
    path.join("tasks", "done"),
    path.join("tasks", "archived"),
    path.join("tasks", "retired"),
    path.join("prompts", "orchestrator"),
    path.join("prompts", "council"),
    path.join("prompts", "discovery"),
    path.join("prompts", "steward"),
    "goals"
  ];

  for (const relativeDir of dirs) {
    await ensureDir(path.join(aofRoot, relativeDir));
  }
}

async function loadJsonFileOrNull(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function initializeProjectBootstrap({
  projectRoot,
  topology,
  writeTarget = null,
  projectType = null,
  domainSummary = null,
  installMode = "runtime-on"
}) {
  if (!["self-hosting", "managed-project"].includes(topology)) {
    throw new Error(`Unsupported topology: ${topology}`);
  }
  if (!["runtime-on", "framing-only"].includes(installMode)) {
    throw new Error(`Unsupported install mode: ${installMode}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  await ensureBootstrapSkeleton(aofRoot);

  const timestamp = nowIso();
  const normalizedWriteTarget = writeTarget || defaultWriteTargetForTopology(topology);
  const aofVersion = await getCurrentAofVersion();

  const bootstrapPayload = {
    bootstrap_type: "aof-project-bootstrap",
    bootstrap_format_version: BOOTSTRAP_FORMAT_VERSION,
    aof_version: aofVersion,
    topology,
    install_mode: installMode,
    write_target: normalizedWriteTarget,
    orientation_ref: `.aof/context/active/${PROJECT_ORIENTATION_FILE}`,
    organization_ref: `.aof/${ORGANIZATION_FILE}`,
    command_registry_ref: `.aof/${COMMAND_REGISTRY_FILE}`,
    skills_ref: `.aof/${SKILLS_FILE}`,
    capability_registry_ref: `.aof/${CAPABILITY_REGISTRY_FILE}`,
    resource_inventory_ref: `.aof/${RESOURCE_INVENTORY_FILE}`,
    policy_ref: `.aof/${POLICY_FILE}`,
    goals_ref: ".aof/goals",
    tasks_ref: ".aof/tasks",
    prompts_ref: ".aof/prompts",
    updated_at: timestamp
  };

  const orientationPayload = buildProjectOrientationPayload({ timestamp, projectType, domainSummary });
  const goalPayloads = buildGoalPayloads(timestamp);
  const confirmationWindowPayload = buildConfirmationWindowPayload(timestamp);
  const organizationPayload = buildOrganizationPayload({ timestamp, topology });
  const commandRegistryPayload = buildCommandRegistryPayload(timestamp);
  const skillsPayload = buildSkillsPayload(timestamp);
  const capabilityRegistryPayload = buildCapabilityRegistryPayload(timestamp);
  const resourceInventoryPayload = buildResourceInventoryPayload(timestamp);
  const policyPayload = buildPolicyPayload(timestamp);

  await validateWithBundledSchema(bootstrapPayload, "aof-project-bootstrap.schema.json", "project bootstrap");
  await validateWithBundledSchema(orientationPayload, "aof-project-orientation.schema.json", "project orientation");
  await validateWithBundledSchema(organizationPayload, "aof-organization.schema.json", "organization");
  await validateWithBundledSchema(commandRegistryPayload, "aof-command-registry.schema.json", "command registry");
  await validateWithBundledSchema(skillsPayload, "aof-skills.schema.json", "skills registry");
  await validateWithBundledSchema(capabilityRegistryPayload, "aof-capability-registry.schema.json", "capability registry");
  await validateWithBundledSchema(resourceInventoryPayload, "aof-resource-inventory.schema.json", "resource inventory");
  await validateWithBundledSchema(policyPayload, "aof-policy.schema.json", "policy set");
  for (const goalPayload of goalPayloads) {
    await validateWithBundledSchema(goalPayload, "aof-goals.schema.json", "goal projection");
  }
  await validateWithBundledSchema(confirmationWindowPayload, "aof-confirmation-window.schema.json", "recent confirmation window");

  const bootstrapPath = path.join(aofRoot, PROJECT_BOOTSTRAP_FILE);
  const orientationPath = path.join(aofRoot, "context", "active", PROJECT_ORIENTATION_FILE);
  const organizationPath = path.join(aofRoot, ORGANIZATION_FILE);
  const commandRegistryPath = path.join(aofRoot, COMMAND_REGISTRY_FILE);
  const skillsPath = path.join(aofRoot, SKILLS_FILE);
  const capabilityRegistryPath = path.join(aofRoot, CAPABILITY_REGISTRY_FILE);
  const resourceInventoryPath = path.join(aofRoot, RESOURCE_INVENTORY_FILE);
  const policyPath = path.join(aofRoot, POLICY_FILE);
  await writeJsonArtifact(bootstrapPath, bootstrapPayload);
  await writeJsonArtifact(orientationPath, orientationPayload);
  await writeJsonArtifact(organizationPath, organizationPayload);
  await writeJsonArtifact(commandRegistryPath, commandRegistryPayload);
  await writeJsonArtifact(skillsPath, skillsPayload);
  await writeJsonArtifact(capabilityRegistryPath, capabilityRegistryPayload);
  await writeJsonArtifact(resourceInventoryPath, resourceInventoryPayload);
  await writeJsonArtifact(policyPath, policyPayload);

  const goalPaths = {};
  for (const goalPayload of goalPayloads) {
    const fileName = GOAL_TYPE_TO_FILE[goalPayload.goal_type];
    const filePath = path.join(aofRoot, "goals", fileName);
    await writeJsonArtifact(filePath, goalPayload);
    goalPaths[goalPayload.goal_type] = filePath;
  }

  const confirmationWindowPath = path.join(aofRoot, "context", "active", RECENT_CONFIRMATION_WINDOW_FILE);
  await writeJsonArtifact(confirmationWindowPath, confirmationWindowPayload);

  return {
    ok: true,
    projectRoot: path.resolve(projectRoot),
    aofRoot,
    topology,
    installMode,
    writeTarget: normalizedWriteTarget,
    artifacts: {
      bootstrapPath,
      orientationPath,
      organizationPath,
      commandRegistryPath,
      skillsPath,
      capabilityRegistryPath,
      resourceInventoryPath,
      policyPath,
      goalPaths,
      confirmationWindowPath
    }
  };
}

export async function upgradeProjectBootstrap({
  projectRoot,
  writeTarget = null,
  installMode = null
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  await ensureBootstrapSkeleton(aofRoot);

  const bootstrapPath = path.join(aofRoot, PROJECT_BOOTSTRAP_FILE);
  const existingBootstrap = await loadJsonFileOrNull(bootstrapPath);
  if (!existingBootstrap) {
    throw new Error(`Cannot upgrade AOF bootstrap because ${bootstrapPath} does not exist. Run \`aof init\` first.`);
  }

  const topology = existingBootstrap.topology;
  if (!["self-hosting", "managed-project"].includes(topology)) {
    throw new Error(`Cannot upgrade bootstrap with unsupported topology: ${topology}`);
  }

  const timestamp = nowIso();
  const aofVersion = await getCurrentAofVersion();
  const normalizedInstallMode = installMode || existingBootstrap.install_mode || "runtime-on";
  const normalizedWriteTarget = writeTarget || existingBootstrap.write_target || defaultWriteTargetForTopology(topology);
  const orientationPath = path.join(aofRoot, "context", "active", PROJECT_ORIENTATION_FILE);
  const organizationPath = path.join(aofRoot, ORGANIZATION_FILE);
  const skillsPath = path.join(aofRoot, SKILLS_FILE);
  const capabilityRegistryPath = path.join(aofRoot, CAPABILITY_REGISTRY_FILE);
  const resourceInventoryPath = path.join(aofRoot, RESOURCE_INVENTORY_FILE);
  const policyPath = path.join(aofRoot, POLICY_FILE);
  const confirmationWindowPath = path.join(aofRoot, "context", "active", RECENT_CONFIRMATION_WINDOW_FILE);

  const existingOrientation = await loadJsonFileOrNull(orientationPath);
  const existingOrganization = await loadJsonFileOrNull(organizationPath);
  const existingConfirmationWindow = await loadJsonFileOrNull(confirmationWindowPath);
  const existingGoals = {};
  for (const [goalType, fileName] of Object.entries(GOAL_TYPE_TO_FILE)) {
    const filePath = path.join(aofRoot, "goals", fileName);
    existingGoals[goalType] = await loadJsonFileOrNull(filePath);
  }

  const bootstrapPayload = {
    bootstrap_type: "aof-project-bootstrap",
    bootstrap_format_version: BOOTSTRAP_FORMAT_VERSION,
    aof_version: aofVersion,
    topology,
    install_mode: normalizedInstallMode,
    write_target: normalizedWriteTarget,
    orientation_ref: `.aof/context/active/${PROJECT_ORIENTATION_FILE}`,
    organization_ref: `.aof/${ORGANIZATION_FILE}`,
    command_registry_ref: `.aof/${COMMAND_REGISTRY_FILE}`,
    skills_ref: `.aof/${SKILLS_FILE}`,
    capability_registry_ref: `.aof/${CAPABILITY_REGISTRY_FILE}`,
    resource_inventory_ref: `.aof/${RESOURCE_INVENTORY_FILE}`,
    policy_ref: `.aof/${POLICY_FILE}`,
    goals_ref: ".aof/goals",
    tasks_ref: ".aof/tasks",
    prompts_ref: ".aof/prompts",
    updated_at: timestamp
  };

  const orientationPayload = buildProjectOrientationPayload({ timestamp, existing: existingOrientation });
  const organizationPayload = buildOrganizationPayload({ timestamp, topology, existing: existingOrganization });
  const goalPayloads = buildGoalPayloads(timestamp, existingGoals);
  const confirmationWindowPayload = buildConfirmationWindowPayload(timestamp, existingConfirmationWindow);
  const commandRegistryPayload = buildCommandRegistryPayload(timestamp);
  const existingSkills = await loadJsonFileOrNull(skillsPath);
  const existingCapabilityRegistry = await loadJsonFileOrNull(capabilityRegistryPath);
  const existingResourceInventory = await loadJsonFileOrNull(resourceInventoryPath);
  const existingPolicySet = await loadJsonFileOrNull(policyPath);
  const skillsPayload = existingSkills ? { ...existingSkills, updated_at: timestamp } : buildSkillsPayload(timestamp);
  const capabilityRegistryPayload = existingCapabilityRegistry
    ? { ...existingCapabilityRegistry, updated_at: timestamp }
    : buildCapabilityRegistryPayload(timestamp);
  const resourceInventoryPayload = existingResourceInventory
    ? { ...existingResourceInventory, updated_at: timestamp }
    : buildResourceInventoryPayload(timestamp);
  const policyPayload = existingPolicySet ? { ...existingPolicySet, updated_at: timestamp } : buildPolicyPayload(timestamp);

  await validateWithBundledSchema(bootstrapPayload, "aof-project-bootstrap.schema.json", "project bootstrap");
  await validateWithBundledSchema(orientationPayload, "aof-project-orientation.schema.json", "project orientation");
  await validateWithBundledSchema(organizationPayload, "aof-organization.schema.json", "organization");
  await validateWithBundledSchema(commandRegistryPayload, "aof-command-registry.schema.json", "command registry");
  await validateWithBundledSchema(skillsPayload, "aof-skills.schema.json", "skills registry");
  await validateWithBundledSchema(capabilityRegistryPayload, "aof-capability-registry.schema.json", "capability registry");
  await validateWithBundledSchema(resourceInventoryPayload, "aof-resource-inventory.schema.json", "resource inventory");
  await validateWithBundledSchema(policyPayload, "aof-policy.schema.json", "policy set");
  for (const goalPayload of goalPayloads) {
    await validateWithBundledSchema(goalPayload, "aof-goals.schema.json", "goal projection");
  }
  await validateWithBundledSchema(confirmationWindowPayload, "aof-confirmation-window.schema.json", "recent confirmation window");

  await writeJsonArtifact(bootstrapPath, bootstrapPayload);
  await writeJsonArtifact(orientationPath, orientationPayload);
  await writeJsonArtifact(organizationPath, organizationPayload);
  await writeJsonArtifact(path.join(aofRoot, COMMAND_REGISTRY_FILE), commandRegistryPayload);
  await writeJsonArtifact(skillsPath, skillsPayload);
  await writeJsonArtifact(capabilityRegistryPath, capabilityRegistryPayload);
  await writeJsonArtifact(resourceInventoryPath, resourceInventoryPayload);
  await writeJsonArtifact(policyPath, policyPayload);

  const goalPaths = {};
  for (const goalPayload of goalPayloads) {
    const fileName = GOAL_TYPE_TO_FILE[goalPayload.goal_type];
    const filePath = path.join(aofRoot, "goals", fileName);
    await writeJsonArtifact(filePath, goalPayload);
    goalPaths[goalPayload.goal_type] = filePath;
  }

  await writeJsonArtifact(confirmationWindowPath, confirmationWindowPayload);

  return {
    ok: true,
    projectRoot: path.resolve(projectRoot),
    aofRoot,
    topology,
    installMode: normalizedInstallMode,
    writeTarget: normalizedWriteTarget,
    artifacts: {
      bootstrapPath,
      orientationPath,
      organizationPath,
      commandRegistryPath: path.join(aofRoot, COMMAND_REGISTRY_FILE),
      skillsPath,
      capabilityRegistryPath,
      resourceInventoryPath,
      policyPath,
      goalPaths,
      confirmationWindowPath
    }
  };
}
