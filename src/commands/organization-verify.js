import fs from "node:fs/promises";
import path from "node:path";

import {
  listExecutionArtifacts,
  resolveCouncilReviewsRoot,
  resolveRoleJoinsRoot,
  resolveRoleResultsRoot,
  resolveTeamOutputsRoot
} from "./execution-artifact-helpers.js";
import { loadTaskState } from "./operator-surface-helpers.js";
import { loadBundledSchema, validateAgainstSchema } from "../runtime/validation.js";

async function readJsonArtifact(filePath, label) {
  const artifactText = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(artifactText);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function loadAndValidateArtifact(projectRoot, relativePath, schemaFileName, label) {
  const artifactPath = path.resolve(projectRoot, relativePath);
  const artifact = await readJsonArtifact(artifactPath, label);
  const schema = await loadBundledSchema(schemaFileName);
  validateAgainstSchema(artifact, schema, label);
  return {
    path: artifactPath,
    relativePath,
    artifact
  };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function createCheckCollector() {
  const checks = [];
  const errors = [];

  return {
    checks,
    errors,
    pass(name, detail) {
      checks.push({ name, status: "pass", detail });
    },
    fail(name, detail) {
      checks.push({ name, status: "fail", detail });
      errors.push(`${name}: ${detail}`);
    }
  };
}

function addId(map, id, kind) {
  map.set(id, kind);
}

function collectActiveOrchestratorTaskEntries(taskState) {
  const activeStatuses = new Set(["open", "assigned"]);
  const entries = [];
  for (const taskEntries of taskState.taskIndex.values()) {
    for (const entry of taskEntries) {
      if (!activeStatuses.has(entry.statusDir)) {
        continue;
      }
      if (entry.payload.origin !== "orchestrator") {
        continue;
      }
      entries.push(entry);
    }
  }
  return entries;
}

function collectKnownTaskIds(taskState) {
  return new Set(taskState.taskIndex.keys());
}

function labelArtifact(payload, fallbackLabel) {
  return payload.role_result_id
    ?? payload.join_id
    ?? payload.team_output_id
    ?? payload.review_packet_id
    ?? fallbackLabel;
}

function checkExecutionArtifactProvenance(collector, entries, artifactKind, knownTaskIds) {
  if (entries.length === 0) {
    collector.pass(`execution provenance ${artifactKind}`, `no ${artifactKind} artifacts are present`);
    return;
  }

  for (const entry of entries) {
    const artifactLabel = labelArtifact(entry.payload, path.basename(entry.filePath, ".json"));
    if (entry.payload.source_task_id) {
      if (knownTaskIds.has(entry.payload.source_task_id)) {
        collector.pass(
          `execution artifact source_task_id ${artifactKind} ${artifactLabel}`,
          entry.payload.source_task_id
        );
      } else {
        collector.fail(
          `execution artifact source_task_id ${artifactKind} ${artifactLabel}`,
          `${entry.payload.source_task_id} does not resolve to a known task`
        );
      }
    } else {
      collector.fail(
        `execution artifact source_task_id ${artifactKind} ${artifactLabel}`,
        `${artifactKind} artifacts must declare source_task_id for reconstruction`
      );
    }

    if (entry.payload.source_parent_session_id) {
      collector.pass(
        `execution artifact source_parent_session_id ${artifactKind} ${artifactLabel}`,
        entry.payload.source_parent_session_id
      );
    } else {
      collector.fail(
        `execution artifact source_parent_session_id ${artifactKind} ${artifactLabel}`,
        `${artifactKind} artifacts must declare source_parent_session_id for orchestrator auditability`
      );
    }
  }
}

function buildOrgReferenceMap(organization) {
  const refs = new Map();

  for (const council of organization.councils ?? []) {
    addId(refs, council.council_id, "council");
  }
  for (const team of organization.teams ?? []) {
    addId(refs, team.team_id, "team");
  }
  for (const role of organization.roles ?? []) {
    addId(refs, role.role_id, "role");
  }
  for (const agent of organization.agents ?? []) {
    addId(refs, agent.agent_id, "agent");
  }

  return refs;
}

function checkReference(collector, name, ref, registry, expectedKinds) {
  const actualKind = registry.get(ref);
  if (!actualKind) {
    collector.fail(name, `${ref} does not resolve to a known ${expectedKinds.join("/")} reference`);
    return;
  }
  if (!expectedKinds.includes(actualKind)) {
    collector.fail(name, `${ref} resolved to ${actualKind}, expected ${expectedKinds.join("/")}`);
    return;
  }
  collector.pass(name, `${ref} -> ${actualKind}`);
}

async function checkArtifactPath(collector, projectRoot, name, relativePath) {
  if (!relativePath) {
    collector.fail(name, "artifact_ref is empty");
    return;
  }

  const artifactPath = path.resolve(projectRoot, relativePath);
  if (!await pathExists(artifactPath)) {
    collector.fail(name, `${relativePath} does not exist`);
    return;
  }

  collector.pass(name, relativePath);
}

export async function organizationVerifyCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const collector = createCheckCollector();
  const [taskState, allRoleResults, allRoleJoins, allTeamOutputs, allCouncilReviews] = await Promise.all([
    loadTaskState(projectRoot),
    listExecutionArtifacts(resolveRoleResultsRoot(projectRoot), "role result"),
    listExecutionArtifacts(resolveRoleJoinsRoot(projectRoot), "role join"),
    listExecutionArtifacts(resolveTeamOutputsRoot(projectRoot), "team output"),
    listExecutionArtifacts(resolveCouncilReviewsRoot(projectRoot), "council review")
  ]);

  let bootstrapRecord;
  try {
    bootstrapRecord = await loadAndValidateArtifact(
      projectRoot,
      ".aof/project-bootstrap.json",
      "aof-project-bootstrap.schema.json",
      "project bootstrap"
    );
    collector.pass("bootstrap schema", ".aof/project-bootstrap.json");
  } catch (error) {
    collector.fail("bootstrap schema", error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      projectRoot,
      checks: collector.checks,
      errors: collector.errors
    };
  }

  const bootstrap = bootstrapRecord.artifact;
  const bootstrapRefs = [
    ["orientation", bootstrap.orientation_ref, "aof-project-orientation.schema.json", "project orientation"],
    ["organization", bootstrap.organization_ref, "aof-organization.schema.json", "organization"],
    ["skills", bootstrap.skills_ref, "aof-skills.schema.json", "skills registry"],
    ["capability_registry", bootstrap.capability_registry_ref, "aof-capability-registry.schema.json", "capability registry"],
    ["resource_inventory", bootstrap.resource_inventory_ref, "aof-resource-inventory.schema.json", "resource inventory"],
    ["policy_set", bootstrap.policy_ref, "aof-policy.schema.json", "policy set"]
  ];

  const loaded = {};
  for (const [key, ref, schemaFileName, label] of bootstrapRefs) {
    try {
      loaded[key] = await loadAndValidateArtifact(projectRoot, ref, schemaFileName, label);
      collector.pass(`${key} schema`, ref);
    } catch (error) {
      collector.fail(`${key} schema`, error instanceof Error ? error.message : String(error));
    }
  }

  if (collector.errors.length > 0) {
    return {
      ok: false,
      projectRoot,
      checks: collector.checks,
      errors: collector.errors
    };
  }

  const orientation = loaded.orientation.artifact;
  const organization = loaded.organization.artifact;
  const skills = loaded.skills.artifact;
  const capabilityRegistry = loaded.capability_registry.artifact;
  const resourceInventory = loaded.resource_inventory.artifact;
  const policySet = loaded.policy_set.artifact;

  collector.pass("orientation type", orientation.orientation_type);

  if (organization.project_ref === bootstrap.orientation_ref) {
    collector.pass("organization project_ref alignment", organization.project_ref);
  } else {
    collector.fail(
      "organization project_ref alignment",
      `organization.project_ref=${organization.project_ref} does not match bootstrap.orientation_ref=${bootstrap.orientation_ref}`
    );
  }

  const alignedRefs = [
    ["skills_ref", organization.skills_ref, bootstrap.skills_ref],
    ["capability_registry_ref", organization.capability_registry_ref, bootstrap.capability_registry_ref],
    ["resource_inventory_ref", organization.resource_inventory_ref, bootstrap.resource_inventory_ref],
    ["policy_ref", organization.policy_ref, bootstrap.policy_ref]
  ];

  for (const [name, orgRef, bootstrapRef] of alignedRefs) {
    if (orgRef === bootstrapRef) {
      collector.pass(`organization ${name} alignment`, orgRef);
    } else {
      collector.fail(`organization ${name} alignment`, `${orgRef} does not match ${bootstrapRef}`);
    }
  }

  const orgRelativePath = bootstrap.organization_ref;
  if (skills.organization_ref === orgRelativePath) {
    collector.pass("skills organization_ref alignment", skills.organization_ref);
  } else {
    collector.fail("skills organization_ref alignment", `${skills.organization_ref} does not match ${orgRelativePath}`);
  }
  if (capabilityRegistry.organization_ref === orgRelativePath) {
    collector.pass("capability registry organization_ref alignment", capabilityRegistry.organization_ref);
  } else {
    collector.fail(
      "capability registry organization_ref alignment",
      `${capabilityRegistry.organization_ref} does not match ${orgRelativePath}`
    );
  }
  if (resourceInventory.organization_ref === orgRelativePath) {
    collector.pass("resource inventory organization_ref alignment", resourceInventory.organization_ref);
  } else {
    collector.fail(
      "resource inventory organization_ref alignment",
      `${resourceInventory.organization_ref} does not match ${orgRelativePath}`
    );
  }
  if (policySet.organization_ref === orgRelativePath) {
    collector.pass("policy set organization_ref alignment", policySet.organization_ref);
  } else {
    collector.fail("policy set organization_ref alignment", `${policySet.organization_ref} does not match ${orgRelativePath}`);
  }

  const orgRefs = buildOrgReferenceMap(organization);
  const capabilityRefs = new Map((capabilityRegistry.capabilities ?? []).map((entry) => [entry.capability_id, "capability"]));
  const resourceRefs = new Map((resourceInventory.resources ?? []).map((entry) => [entry.resource_id, "resource"]));
  const agentOrResourceRefs = new Map([...orgRefs, ...resourceRefs]);
  const policySubjectRefs = new Map([...orgRefs, ...resourceRefs]);

  for (const team of organization.teams ?? []) {
    for (const dependencyRef of team.dependencies ?? []) {
      checkReference(collector, `team dependency ${team.team_id}`, dependencyRef, orgRefs, ["team", "council"]);
    }
  }

  for (const role of organization.roles ?? []) {
    if (role.team_ref) {
      checkReference(collector, `role team_ref ${role.role_id}`, role.team_ref, orgRefs, ["team"]);
    }
    for (const assignment of role.assignments ?? []) {
      if (assignment.assignee_type === "agent") {
        checkReference(collector, `role assignment ${role.role_id}/${assignment.assignment_id}`, assignment.assignee_ref, orgRefs, ["agent"]);
      }
    }
  }

  for (const contract of organization.contracts ?? []) {
    checkReference(collector, `contract owner ${contract.contract_id}`, contract.owner_team_ref, orgRefs, ["team"]);
    if (contract.artifact_ref) {
      await checkArtifactPath(collector, projectRoot, `contract artifact ${contract.contract_id}`, contract.artifact_ref);
    }
  }

  for (const dependency of organization.dependencies ?? []) {
    checkReference(collector, `dependency from_ref ${dependency.from_ref}->${dependency.to_ref}`, dependency.from_ref, orgRefs, ["team", "council", "role", "agent"]);
    checkReference(collector, `dependency to_ref ${dependency.from_ref}->${dependency.to_ref}`, dependency.to_ref, orgRefs, ["team", "council", "role", "agent"]);
  }

  for (const owner of organization.knowledge_owners ?? []) {
    checkReference(collector, `knowledge owner ${owner.knowledge_domain}`, owner.owner_ref, orgRefs, ["team", "council", "role", "agent"]);
  }

  for (const metric of organization.metrics ?? []) {
    checkReference(collector, `metric owner ${metric.metric_id}`, metric.owner_ref, orgRefs, ["team", "council", "role", "agent"]);
  }

  for (const skill of skills.skills ?? []) {
    checkReference(collector, `skill owner ${skill.skill_id}`, skill.owner_ref, orgRefs, ["team", "council", "role", "agent"]);
    for (const roleRef of skill.applicable_role_refs ?? []) {
      checkReference(collector, `skill applicable_role_ref ${skill.skill_id}`, roleRef, orgRefs, ["role"]);
    }
    for (const capabilityRef of skill.required_capability_refs ?? []) {
      checkReference(collector, `skill capability_ref ${skill.skill_id}`, capabilityRef, capabilityRefs, ["capability"]);
    }
    for (const resourceRef of skill.required_resource_refs ?? []) {
      checkReference(collector, `skill resource_ref ${skill.skill_id}`, resourceRef, resourceRefs, ["resource"]);
    }
  }

  for (const capability of capabilityRegistry.capabilities ?? []) {
    checkReference(collector, `capability owner ${capability.capability_id}`, capability.owner_ref, orgRefs, ["team", "council", "role", "agent"]);
    for (const dependsOnRef of capability.depends_on_capability_refs ?? []) {
      checkReference(collector, `capability depends_on ${capability.capability_id}`, dependsOnRef, capabilityRefs, ["capability"]);
    }
    for (const providerRef of capability.provided_by_refs ?? []) {
      checkReference(collector, `capability provided_by ${capability.capability_id}`, providerRef, agentOrResourceRefs, ["agent", "resource"]);
    }
  }

  for (const resource of resourceInventory.resources ?? []) {
    checkReference(collector, `resource owner ${resource.resource_id}`, resource.owner_ref, orgRefs, ["team", "council", "role", "agent"]);
    for (const capabilityRef of resource.provided_capability_refs ?? []) {
      checkReference(collector, `resource capability_ref ${resource.resource_id}`, capabilityRef, capabilityRefs, ["capability"]);
    }
  }

  for (const policy of policySet.policies ?? []) {
    checkReference(collector, `policy owner ${policy.policy_id}`, policy.owner_ref, orgRefs, ["team", "council", "role", "agent"]);
    for (const subjectRef of policy.subject_refs ?? []) {
      checkReference(collector, `policy subject_ref ${policy.policy_id}`, subjectRef, policySubjectRefs, ["team", "council", "role", "agent", "resource"]);
    }
  }

  const activeOrchestratorTasks = collectActiveOrchestratorTaskEntries(taskState);
  if (activeOrchestratorTasks.length === 0) {
    collector.pass("active orchestrator task session discipline", "no active orchestrator-owned tasks require enforcement");
  } else {
    for (const entry of activeOrchestratorTasks) {
      if (entry.payload.orchestrator_session_id) {
        collector.pass(
          `active orchestrator task session ${entry.payload.task_id}`,
          entry.payload.orchestrator_session_id
        );
      } else {
        collector.fail(
          `active orchestrator task session ${entry.payload.task_id}`,
          "active orchestrator-owned tasks must declare orchestrator_session_id"
        );
      }
    }
  }

  const knownTaskIds = collectKnownTaskIds(taskState);
  checkExecutionArtifactProvenance(collector, allRoleResults, "role result", knownTaskIds);
  checkExecutionArtifactProvenance(collector, allRoleJoins, "role join", knownTaskIds);
  checkExecutionArtifactProvenance(collector, allTeamOutputs, "team output", knownTaskIds);
  checkExecutionArtifactProvenance(collector, allCouncilReviews, "council review", knownTaskIds);

  return {
    ok: collector.errors.length === 0,
    projectRoot,
    artifactPaths: {
      bootstrap: bootstrapRecord.path,
      orientation: loaded.orientation.path,
      organization: loaded.organization.path,
      skills: loaded.skills.path,
      capabilityRegistry: loaded.capability_registry.path,
      resourceInventory: loaded.resource_inventory.path,
      policySet: loaded.policy_set.path
    },
    checks: collector.checks,
    errors: collector.errors,
    summary: {
      total_checks: collector.checks.length,
      passed_checks: collector.checks.filter((entry) => entry.status === "pass").length,
      failed_checks: collector.checks.filter((entry) => entry.status === "fail").length
    }
  };
}
