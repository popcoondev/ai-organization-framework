import fs from "node:fs/promises";
import path from "node:path";

import {
  buildCommandRegistryPayload,
  buildCommandRoutingSummary,
  COMMAND_REGISTRY_FILE
} from "./command-catalog.js";
import { ensureDir, nowIso, withFileMutationLock, writeJsonArtifact } from "./utils.js";
import { validateWithBundledSchema } from "./validation.js";

const TASK_DIRS = ["open", "assigned", "done", "archived", "retired"];
const TASK_STATUS_PRIORITY = { open: 0, assigned: 1, done: 2, archived: 3, retired: 4 };

const GOAL_TYPE_TO_FILE = {
  "north-star": "north-star.json",
  "operating-goal": "operating-goal.json",
  "next-value-slice": "next-value-slice.json"
};

const RECENT_CONFIRMATION_WINDOW_FILE = "recent-confirmation-window.json";
const ALIGNMENT_PULSE_FILE = "alignment-pulse.json";
const FRAMEWORK_SELF_AUDIT_FILE = "framework-self-audit.json";
const RETIRE_REVIEW_FILE = "retire-candidate-review.json";
const CADENCE_TRIGGER_GUIDANCE_FILE = "cadence-trigger-guidance.json";
const CADENCE_FOLLOW_THROUGH_FILE = "cadence-follow-through.json";
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

export function resolveAofRoot(projectRoot) {
  return path.join(path.resolve(projectRoot), ".aof");
}

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

  const orientationPayload = buildProjectOrientationPayload({
    timestamp,
    projectType,
    domainSummary
  });

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

  const orientationPayload = buildProjectOrientationPayload({
    timestamp,
    existing: existingOrientation
  });
  const organizationPayload = buildOrganizationPayload({
    timestamp,
    topology,
    existing: existingOrganization
  });
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

async function listTaskFiles(tasksRoot) {
  const files = [];
  for (const taskDir of TASK_DIRS) {
    const dirPath = path.join(tasksRoot, taskDir);
    await ensureDir(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.startsWith("TASK-") && entry.name.endsWith(".json")) {
        files.push(path.join(dirPath, entry.name));
      }
    }
  }
  return files;
}

async function listTaskFilesForStatus(tasksRoot, status) {
  const canonicalIndex = await buildCanonicalTaskIndex(tasksRoot);
  return [...canonicalIndex.values()]
    .filter((entry) => entry.canonical.payload.status === status)
    .map((entry) => entry.canonical.filePath);
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

async function readTaskRecord(filePath) {
  return {
    filePath,
    payload: JSON.parse(await fs.readFile(filePath, "utf8"))
  };
}

function compareTaskRecords(a, b) {
  const updatedAtA = String(a.payload.updated_at ?? "");
  const updatedAtB = String(b.payload.updated_at ?? "");
  if (updatedAtA !== updatedAtB) {
    return updatedAtB.localeCompare(updatedAtA);
  }
  return (TASK_STATUS_PRIORITY[b.payload.status] ?? -1) - (TASK_STATUS_PRIORITY[a.payload.status] ?? -1);
}

async function buildCanonicalTaskIndex(tasksRoot) {
  const files = await listTaskFiles(tasksRoot);
  const records = await Promise.all(files.map((filePath) => readTaskRecord(filePath)));
  const grouped = new Map();

  for (const record of records) {
    const taskId = record.payload.task_id;
    if (!grouped.has(taskId)) {
      grouped.set(taskId, []);
    }
    grouped.get(taskId).push(record);
  }

  const canonicalIndex = new Map();
  for (const [taskId, candidates] of grouped.entries()) {
    const sorted = [...candidates].sort(compareTaskRecords);
    canonicalIndex.set(taskId, {
      canonical: sorted[0],
      candidates: sorted
    });
  }

  return canonicalIndex;
}

async function findTaskRecord(tasksRoot, taskId) {
  const canonicalIndex = await buildCanonicalTaskIndex(tasksRoot);
  return canonicalIndex.get(taskId) ?? null;
}

async function nextTaskId(tasksRoot) {
  const files = await listTaskFiles(tasksRoot);
  let maxId = 0;
  for (const filePath of files) {
    const match = path.basename(filePath).match(/^TASK-(\d+)\.json$/);
    if (!match) {
      continue;
    }
    maxId = Math.max(maxId, Number(match[1]));
  }
  return `TASK-${String(maxId + 1).padStart(3, "0")}`;
}

function deriveTaskMutationLockPath(tasksRoot) {
  return path.join(tasksRoot, ".task-mutation.lock");
}

export async function createOpenTask({
  projectRoot,
  title,
  description = null,
  origin = null,
  orchestratorSessionId = null,
  assignedSessionIds = [],
  relatedDecisionRecordId = null,
  operatingGoalRef = null,
  triageNotes = null
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const openRoot = path.join(tasksRoot, "open");
  await ensureDir(openRoot);
  return withFileMutationLock(
    deriveTaskMutationLockPath(tasksRoot),
    `Concurrent task mutation is not allowed for this project. Wait until the current task update completes: ${projectRoot}`,
    async () => {
      const taskId = await nextTaskId(tasksRoot);
      const timestamp = nowIso();
      const payload = {
        task_id: taskId,
        title,
        description,
        status: "open",
        origin,
        orchestrator_session_id: orchestratorSessionId,
        assigned_session_ids: assignedSessionIds,
        related_decision_record_id: relatedDecisionRecordId,
        operating_goal_ref: operatingGoalRef,
        created_at: timestamp,
        updated_at: timestamp,
        assigned_at: null,
        done_at: null,
        retired_at: null,
        last_triaged_at: null,
        stale_candidate_at: null,
        retire_candidate_at: null,
        triage_notes: triageNotes
      };

      await validateWithBundledSchema(payload, "aof-task.schema.json", "task");
      const taskPath = path.join(openRoot, `${taskId}.json`);
      await writeJsonArtifact(taskPath, payload);
      return {
        ok: true,
        taskId,
        taskPath,
        payload
      };
    },
    { wait: true, retryDelayMs: 10, timeoutMs: 5000 }
  );
}

export async function updateTaskArtifact({
  projectRoot,
  taskId,
  status = null,
  assignedSessionIds,
  relatedDecisionRecordId,
  triageNotes,
  lastTriagedAt,
  staleCandidateAt,
  retireCandidateAt
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  return withFileMutationLock(
    deriveTaskMutationLockPath(tasksRoot),
    `Concurrent task mutation is not allowed for this project. Wait until the current task update completes: ${projectRoot}`,
    async () => {
      const taskRecord = await findTaskRecord(tasksRoot, taskId);
      if (!taskRecord) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const current = taskRecord.canonical.payload;
      const nextStatus = status ?? current.status;
      if (!TASK_DIRS.includes(nextStatus)) {
        throw new Error(`Unsupported task status: ${nextStatus}`);
      }

      const timestamp = nowIso();
      const payload = {
        ...current,
        status: nextStatus,
        assigned_session_ids: assignedSessionIds ?? current.assigned_session_ids ?? [],
        related_decision_record_id: relatedDecisionRecordId ?? current.related_decision_record_id ?? null,
        triage_notes: triageNotes ?? current.triage_notes ?? null,
        updated_at: timestamp,
        assigned_at: nextStatus === "assigned"
          ? current.assigned_at ?? timestamp
          : current.assigned_at ?? null,
        done_at: nextStatus === "done"
          ? current.done_at ?? timestamp
          : current.done_at ?? null,
        retired_at: nextStatus === "retired"
          ? current.retired_at ?? timestamp
          : current.retired_at ?? null,
        last_triaged_at: lastTriagedAt ?? current.last_triaged_at ?? null,
        stale_candidate_at: staleCandidateAt !== undefined ? staleCandidateAt : current.stale_candidate_at ?? null,
        retire_candidate_at: retireCandidateAt !== undefined ? retireCandidateAt : current.retire_candidate_at ?? null
      };

      await validateWithBundledSchema(payload, "aof-task.schema.json", "task");
      const nextPath = path.join(tasksRoot, nextStatus, `${taskId}.json`);
      await ensureDir(path.dirname(nextPath));
      await writeJsonArtifact(nextPath, payload);
      await Promise.all(
        taskRecord.candidates
          .map((candidate) => candidate.filePath)
          .filter((candidatePath) => path.resolve(candidatePath) !== path.resolve(nextPath))
          .map((candidatePath) => fs.rm(candidatePath, { force: true }))
      );

      return {
        ok: true,
        taskId,
        taskPath: nextPath,
        payload
      };
    },
    { wait: true, retryDelayMs: 10, timeoutMs: 5000 }
  );
}

export async function listTaskArtifacts({
  projectRoot,
  status = "open"
}) {
  if (!TASK_DIRS.includes(status)) {
    throw new Error(`Unsupported task status: ${status}`);
  }
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const files = await listTaskFilesForStatus(tasksRoot, status);
  const payloads = await Promise.all(
    files.map(async (filePath) => ({
      taskPath: filePath,
      payload: JSON.parse(await fs.readFile(filePath, "utf8"))
    }))
  );
  return {
    ok: true,
    status,
    tasks: payloads
  };
}

export async function writeGoalProjection({
  projectRoot,
  goalType,
  content,
  agreedWithHuman = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  declaredComplete = false
}) {
  const fileName = GOAL_TYPE_TO_FILE[goalType];
  if (!fileName) {
    throw new Error(`Unsupported goal type: ${goalType}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  const goalsRoot = path.join(aofRoot, "goals");
  await ensureDir(goalsRoot);
  const timestamp = nowIso();
  const payload = {
    goal_type: goalType,
    content,
    updated_at: timestamp,
    agreed_with_human: agreedWithHuman,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId,
    declared_complete_at: declaredComplete ? timestamp : null
  };

  await validateWithBundledSchema(payload, "aof-goals.schema.json", "goal projection");
  const goalPath = path.join(goalsRoot, fileName);
  await writeJsonArtifact(goalPath, payload);
  return {
    ok: true,
    goalType,
    goalPath,
    payload
  };
}

export async function loadGoalProjection({ projectRoot, goalType }) {
  const fileName = GOAL_TYPE_TO_FILE[goalType];
  if (!fileName) {
    throw new Error(`Unsupported goal type: ${goalType}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  const goalPath = path.join(aofRoot, "goals", fileName);
  try {
    const raw = await fs.readFile(goalPath, "utf8");
    return {
      ok: true,
      goalType,
      goalPath,
      payload: JSON.parse(raw)
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        ok: true,
        goalType,
        goalPath,
        payload: null
      };
    }
    throw error;
  }
}

export async function recordRecentConfirmation({
  projectRoot,
  question,
  answer,
  expectationState = null,
  mismatchState = null,
  scaleDirection = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);
  const windowPath = path.join(activeContextRoot, RECENT_CONFIRMATION_WINDOW_FILE);

  let existing = {
    window_type: "recent-confirmation-window",
    updated_at: nowIso(),
    entries: []
  };

  try {
    const currentText = await fs.readFile(windowPath, "utf8");
    existing = JSON.parse(currentText);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const recordedAt = nowIso();
  const nextEntries = [
    ...(existing.entries ?? []),
    {
      question,
      answer,
      recorded_at: recordedAt,
      expectation_state: expectationState,
      mismatch_state: mismatchState,
      scale_direction: scaleDirection,
      source_session_id: sourceSessionId,
      source_decision_record_id: sourceDecisionRecordId
    }
  ].slice(-Math.max(1, maxEntries));

  const payload = {
    window_type: "recent-confirmation-window",
    updated_at: recordedAt,
    entries: nextEntries
  };

  await validateWithBundledSchema(payload, "aof-confirmation-window.schema.json", "confirmation window");
  await writeJsonArtifact(windowPath, payload);
  return {
    ok: true,
    windowPath,
    payload
  };
}

export async function recordAlignmentPulse({
  projectRoot,
  question,
  answer,
  expectationState = null,
  mismatchState = null,
  scaleDirection = null,
  prioritizedTaskIds = [],
  staleTaskIds = [],
  retireCandidateTaskIds = [],
  triageNote = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const openTasks = await listTaskArtifacts({ projectRoot, status: "open" });
  const openTaskIds = openTasks.tasks.map((task) => task.payload.task_id);
  const timestamp = nowIso();

  const pulsePayload = {
    pulse_type: "alignment-pulse",
    triggered_at: timestamp,
    question,
    answer,
    expectation_state: expectationState,
    mismatch_state: mismatchState,
    scale_direction: scaleDirection,
    open_task_ids: openTaskIds,
    prioritized_task_ids: prioritizedTaskIds,
    stale_task_ids: staleTaskIds,
    retire_candidate_task_ids: retireCandidateTaskIds,
    triage_note: triageNote,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(pulsePayload, "aof-alignment-pulse.schema.json", "alignment pulse");
  const pulsePath = path.join(activeContextRoot, ALIGNMENT_PULSE_FILE);
  await writeJsonArtifact(pulsePath, pulsePayload);

  const triagedTasks = await Promise.all(
    openTaskIds.map((taskId) => {
      const isPrioritized = prioritizedTaskIds.includes(taskId);
      const isStale = staleTaskIds.includes(taskId);
      const isRetireCandidate = retireCandidateTaskIds.includes(taskId);
      const tags = [
        isPrioritized ? "prioritized" : null,
        isStale ? "stale" : null,
        isRetireCandidate ? "retire-candidate" : null
      ].filter(Boolean);
      const nextTriageNote = triageNote
        ? tags.length > 0
          ? `${triageNote} [${tags.join(", ")}]`
          : triageNote
        : tags.length > 0
          ? `alignment pulse classification [${tags.join(", ")}]`
          : null;

      return updateTaskArtifact({
        projectRoot,
        taskId,
        status: "open",
        triageNotes: nextTriageNote,
        lastTriagedAt: timestamp,
        staleCandidateAt: isStale ? timestamp : null,
        retireCandidateAt: isRetireCandidate ? timestamp : null
      });
    })
  );

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question,
    answer,
    expectationState,
    mismatchState,
    scaleDirection,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  const guidanceRefreshResult = await generateCadenceTriggerGuidance({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  return {
    ok: true,
    pulsePath,
    pulsePayload,
    triagedTasks,
    confirmationResult,
    guidanceRefreshResult
  };
}

export async function recordFrameworkSelfAudit({
  projectRoot,
  auditId,
  scope,
  summary,
  detectedGap,
  resultState = null,
  nextAction,
  relatedTaskIds = [],
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  nextValueSliceContent = null,
  maxEntries = 3
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const recordedAt = nowIso();
  const payload = {
    audit_type: "framework-self-audit",
    recorded_at: recordedAt,
    audit_id: auditId,
    scope,
    summary,
    detected_gap: detectedGap,
    result_state: resultState,
    next_action: nextAction,
    related_task_ids: relatedTaskIds,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-self-audit.schema.json", "framework self-audit");
  const auditPath = path.join(activeContextRoot, FRAMEWORK_SELF_AUDIT_FILE);
  await writeJsonArtifact(auditPath, payload);

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "framework self-audit で次に残る gap は何か",
    answer: detectedGap,
    expectationState: summary,
    mismatchState: detectedGap,
    scaleDirection: nextAction,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  let nextValueSliceResult = null;
  if (nextValueSliceContent) {
    nextValueSliceResult = await writeGoalProjection({
      projectRoot,
      goalType: "next-value-slice",
      content: nextValueSliceContent,
      agreedWithHuman: null,
      sourceSessionId,
      sourceDecisionRecordId,
      declaredComplete: false
    });
  }

  const guidanceRefreshResult = await generateCadenceTriggerGuidance({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  return {
    ok: true,
    auditPath,
    payload,
    confirmationResult,
    nextValueSliceResult,
    guidanceRefreshResult
  };
}

export async function recordRetireCandidateReview({
  projectRoot,
  resolution,
  taskIds,
  note,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3
}) {
  if (!["retire", "keep-open"].includes(resolution)) {
    throw new Error(`Unsupported retire-candidate resolution: ${resolution}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const recordedAt = nowIso();
  const payload = {
    review_type: "retire-candidate-review",
    recorded_at: recordedAt,
    resolution,
    reviewed_task_ids: taskIds,
    note,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-retire-review.schema.json", "retire candidate review");
  const reviewPath = path.join(activeContextRoot, RETIRE_REVIEW_FILE);
  await writeJsonArtifact(reviewPath, payload);

  const updatedTasks = await Promise.all(
    taskIds.map(async (taskId) => {
      const nextStatus = resolution === "retire" ? "retired" : "open";
      const nextTriageNote = resolution === "retire"
        ? `${note} [retired]`
        : `${note} [kept-open]`;

      return updateTaskArtifact({
        projectRoot,
        taskId,
        status: nextStatus,
        triageNotes: nextTriageNote,
        lastTriagedAt: recordedAt,
        staleCandidateAt: resolution === "keep-open" ? null : undefined,
        retireCandidateAt: resolution === "keep-open" ? null : recordedAt
      });
    })
  );

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "retire candidate review で何を決めたか",
    answer: note,
    expectationState: resolution === "retire"
      ? "retire-candidate task was retired through runtime-backed review"
      : "retire-candidate task stayed open after runtime-backed review",
    mismatchState: null,
    scaleDirection: resolution === "retire"
      ? "continue with the remaining open tasks"
      : "keep the task visible in the next cadence review",
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  const guidanceRefreshResult = await generateCadenceTriggerGuidance({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  return {
    ok: true,
    reviewPath,
    payload,
    updatedTasks,
    confirmationResult,
    guidanceRefreshResult
  };
}

export async function generateCadenceTriggerGuidance({
  projectRoot,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3,
  recordConfirmation = true
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const openTasks = await listTaskArtifacts({ projectRoot, status: "open" });
  const retireReviewCandidateIds = openTasks.tasks
    .filter((task) => Boolean(task.payload.retire_candidate_at))
    .map((task) => task.payload.task_id);

  const alignmentPulse = await loadJsonFileOrNull(path.join(activeContextRoot, ALIGNMENT_PULSE_FILE));
  const selfAudit = await loadJsonFileOrNull(path.join(activeContextRoot, FRAMEWORK_SELF_AUDIT_FILE));

  const recommendedActions = [];
  const suggestedCommands = [];
  if (!alignmentPulse) {
    recommendedActions.push("run alignment-pulse");
    suggestedCommands.push({
      action: "run alignment-pulse",
      command: "node ./src/cli.js alignment-pulse --project . --question \"まだ解くべき問題は同じか\" --answer \"はい\"",
      reason: "No active alignment-pulse artifact is present."
    });
  }
  // A fresh alignment pulse is enough to avoid forcing a parallel self-audit
  // while a retire-review action is still the primary follow-through item.
  if (!selfAudit && (!alignmentPulse || (retireReviewCandidateIds.length === 0 && openTasks.tasks.length === 0))) {
    recommendedActions.push("run self-audit-record");
    suggestedCommands.push({
      action: "run self-audit-record",
      command: "node ./src/cli.js self-audit-record --project . --audit-id FSA-XXX --scope \"cadence review\" --summary \"current cadence state\" --detected-gap \"remaining gap\" --next-action \"next operating move\"",
      reason: "No active framework-self-audit artifact is present."
    });
  }
  if (retireReviewCandidateIds.length > 0) {
    recommendedActions.push("run retire-candidate-review");
    suggestedCommands.push({
      action: "run retire-candidate-review",
      command: `node ./src/cli.js retire-candidate-review --project . --resolution keep-open ${retireReviewCandidateIds.map((taskId) => `--task-id ${taskId}`).join(" ")} --note "Reviewed during cadence guidance follow-through"`,
      reason: `${retireReviewCandidateIds.length} open task(s) are marked as retire candidates.`
    });
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("keep normal cadence monitoring");
    suggestedCommands.push({
      action: "keep normal cadence monitoring",
      command: "No immediate cadence command is required.",
      reason: "Active cadence surfaces are present and there are no retire-review candidates."
    });
  }

  const actionableCount = recommendedActions.filter((action) => action !== "keep normal cadence monitoring").length;
  const triggerState = actionableCount === 0 ? "idle" : "follow-through-recommended";
  const batchingMode = actionableCount === 0
    ? "none"
    : actionableCount === 1
      ? "single-action"
      : "batched-follow-through";
  const policyReason = actionableCount === 0
    ? "No unresolved cadence trigger was detected."
    : batchingMode === "single-action"
      ? "One cadence action is sufficient to restore follow-through."
      : "Multiple cadence actions are simultaneously recommended, so batching reduces operator overhead.";

  const summary = retireReviewCandidateIds.length > 0
    ? `Retire review is recommended for ${retireReviewCandidateIds.length} open task(s).`
    : recommendedActions.includes("keep normal cadence monitoring")
      ? "Current cadence surfaces are present; continue normal cadence monitoring."
      : `Cadence guidance recommends: ${recommendedActions.join(", ")}.`;

  const recordedAt = nowIso();
  const payload = {
    guidance_type: "cadence-trigger-guidance",
    recorded_at: recordedAt,
    open_task_count: openTasks.tasks.length,
    retire_review_candidate_ids: retireReviewCandidateIds,
    trigger_state: triggerState,
    batching_mode: batchingMode,
    policy_reason: policyReason,
    recommended_actions: recommendedActions,
    suggested_commands: suggestedCommands,
    summary,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-trigger-guidance.schema.json", "cadence trigger guidance");
  const guidancePath = path.join(activeContextRoot, CADENCE_TRIGGER_GUIDANCE_FILE);
  await writeJsonArtifact(guidancePath, payload);

  const confirmationResult = recordConfirmation
    ? await recordRecentConfirmation({
        projectRoot,
        question: "cadence guidance では次に何をすべきか",
        answer: summary,
        expectationState: "cadence surfaces are runtime-backed and can be inspected through a guidance artifact",
        mismatchState: recommendedActions.includes("keep normal cadence monitoring") ? null : summary,
        scaleDirection: recommendedActions.join("; "),
        sourceSessionId,
        sourceDecisionRecordId,
        maxEntries
      })
    : null;

  return {
    ok: true,
    guidancePath,
    payload,
    confirmationResult
  };
}

export async function executeCadenceFollowThrough({
  projectRoot,
  resolution = null,
  note = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const guidancePath = path.join(activeContextRoot, CADENCE_TRIGGER_GUIDANCE_FILE);
  const guidance = await loadJsonFileOrNull(guidancePath);
  if (!guidance) {
    throw new Error("No active cadence-trigger-guidance artifact is present.");
  }

  const recordedAt = nowIso();
  let executedAction = "noop";
  let skippedReason = null;
  let taskIds = [];
  let executionResult = null;

  if (guidance.trigger_state === "idle") {
    skippedReason = "Guidance is idle; no cadence follow-through action is required.";
  } else if (guidance.batching_mode === "batched-follow-through") {
    skippedReason = "Guidance currently recommends batched follow-through; execute the suggested actions deliberately.";
  } else if (guidance.recommended_actions.includes("run retire-candidate-review")) {
    if (!["retire", "keep-open"].includes(resolution ?? "")) {
      throw new Error("Single-action retire follow-through requires --resolution <retire|keep-open>.");
    }
    if (!note) {
      throw new Error("Single-action retire follow-through requires --note.");
    }
    executedAction = "run retire-candidate-review";
    taskIds = guidance.retire_review_candidate_ids ?? [];
    executionResult = await recordRetireCandidateReview({
      projectRoot,
      resolution,
      taskIds,
      note,
      sourceSessionId,
      sourceDecisionRecordId,
      maxEntries
    });
  } else {
    skippedReason = "Current single-action follow-through is only implemented for retire-candidate-review.";
  }

  const payload = {
    follow_through_type: "cadence-follow-through",
    recorded_at: recordedAt,
    guidance_trigger_state: guidance.trigger_state,
    guidance_batching_mode: guidance.batching_mode,
    executed_action: executedAction,
    resolution,
    task_ids: taskIds,
    note,
    skipped_reason: skippedReason,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-follow-through.schema.json", "cadence follow-through");
  const followThroughPath = path.join(activeContextRoot, CADENCE_FOLLOW_THROUGH_FILE);
  await writeJsonArtifact(followThroughPath, payload);

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "cadence follow-through で何を実行したか",
    answer: skippedReason ?? `${executedAction} was executed through cadence follow-through`,
    expectationState: skippedReason ? "cadence follow-through remained operator-mediated" : "single-action cadence follow-through can now execute through runtime",
    mismatchState: skippedReason,
    scaleDirection: skippedReason ? "keep refining bundled or autonomous follow-through" : "focus next on autonomous timing and bundled execution",
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  return {
    ok: true,
    followThroughPath,
    payload,
    executionResult,
    confirmationResult
  };
}
