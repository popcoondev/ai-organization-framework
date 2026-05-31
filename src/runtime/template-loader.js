import fs from "node:fs/promises";
import path from "node:path";
import {
  assertArray,
  assertNonEmptyStringArray,
  assertObject,
  assertRelativeAofPath,
  assertString,
  assertStringArray,
  validateWithBundledSchema
} from "./validation.js";
import { parseSimpleYaml } from "./simple-yaml.js";

async function readYaml(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return parseSimpleYaml(text);
}

async function readJson(filePath, label) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateManifest(manifest) {
  await validateWithBundledSchema(manifest, "aof-template.schema.json", "Root manifest");
  assertObject(manifest, "Root manifest");

  const requiredKeys = [
    "format_version",
    "organization",
    "governance",
    "policies",
    "actors",
    "workflows",
    "templates",
    "state"
  ];
  for (const key of requiredKeys) {
    if (!(key in manifest)) {
      throw new Error(`Missing required manifest key: ${key}`);
    }
  }

  assertString(manifest.format_version, "format_version");
  assertRelativeAofPath(manifest.organization, "organization");
  assertRelativeAofPath(manifest.governance, "governance");
  assertRelativeAofPath(manifest.policies, "policies");
  assertNonEmptyStringArray(manifest.actors, "actors");
  for (const actorRef of manifest.actors) {
    assertRelativeAofPath(actorRef, "actor path");
  }

  assertObject(manifest.workflows, "workflows");
  assertString(manifest.workflows.default, "workflows.default");
  assertObject(manifest.workflows.registry, "workflows.registry");
  for (const workflowRef of Object.values(manifest.workflows.registry)) {
    assertRelativeAofPath(workflowRef, "workflow path");
  }

  assertObject(manifest.templates, "templates");
  assertRelativeAofPath(manifest.templates.decision_record_markdown, "templates.decision_record_markdown");
  assertRelativeAofPath(manifest.templates.decision_record_schema, "templates.decision_record_schema");

  assertObject(manifest.state, "state");
  const stateKeys = [
    "sessions",
    "decisions",
    "context_active",
    "context_summaries",
    "context_snapshots",
    "context_archive",
    "signals",
    "artifacts"
  ];
  for (const key of stateKeys) {
    assertRelativeAofPath(manifest.state[key], `state.${key}`);
  }
}

function validateOrganization(organization) {
  assertObject(organization, "organization");
  assertString(organization.organization_id, "organization.organization_id");
  assertString(organization.name, "organization.name");
  if ("language" in organization) {
    assertString(organization.language, "organization.language");
    if (!["ja", "en"].includes(organization.language)) {
      throw new Error("organization.language must be 'ja' or 'en'.");
    }
  }
  if ("clarification" in organization) {
    assertObject(organization.clarification, "organization.clarification");
    if ("use_default_high_stakes_patterns" in organization.clarification &&
      typeof organization.clarification.use_default_high_stakes_patterns !== "boolean") {
      throw new Error("organization.clarification.use_default_high_stakes_patterns must be a boolean.");
    }
    if ("use_default_brownfield_patterns" in organization.clarification &&
      typeof organization.clarification.use_default_brownfield_patterns !== "boolean") {
      throw new Error("organization.clarification.use_default_brownfield_patterns must be a boolean.");
    }
    if ("high_stakes_terms" in organization.clarification) {
      assertStringArray(organization.clarification.high_stakes_terms, "organization.clarification.high_stakes_terms");
    }
    if ("brownfield_terms" in organization.clarification) {
      assertStringArray(organization.clarification.brownfield_terms, "organization.clarification.brownfield_terms");
    }
  }
}

function validateGovernance(governance) {
  assertObject(governance, "governance");
  assertString(governance.model, "governance.model");
  assertObject(governance.decision_rules, "governance.decision_rules");
  assertString(governance.decision_rules.default, "governance.decision_rules.default");
  assertObject(governance.escalation, "governance.escalation");
  assertString(governance.escalation.target, "governance.escalation.target");
  if (typeof governance.escalation.max_retries !== "number" || governance.escalation.max_retries < 0) {
    throw new Error("governance.escalation.max_retries must be a non-negative number.");
  }
}

function validatePolicies(policies) {
  assertObject(policies, "policies");
  assertString(policies.policy_profile_id, "policies.policy_profile_id");
  assertNonEmptyStringArray(policies.default_priority_order, "policies.default_priority_order");
}

function validateActor(actor) {
  assertObject(actor, "actor");
  assertString(actor.actor_id, "actor.actor_id");
  assertString(actor.display_name, "actor.display_name");
  assertString(actor.kind, "actor.kind");
  assertNonEmptyStringArray(actor.roles, "actor.roles");
  assertStringArray(actor.capabilities, "actor.capabilities");
}

function validateWorkflow(workflow, workflowId) {
  assertObject(workflow, "workflow");
  assertString(workflow.workflow_id, "workflow.workflow_id");
  if (workflow.workflow_id !== workflowId) {
    throw new Error(`Workflow id mismatch: expected '${workflowId}', got '${workflow.workflow_id}'.`);
  }
  assertString(workflow.name, "workflow.name");
  assertStringArray(workflow.entry_conditions, "workflow.entry_conditions");
  assertNonEmptyStringArray(workflow.stages, "workflow.stages");
  assertStringArray(workflow.decision_points, "workflow.decision_points");
  assertString(workflow.default_governance_scope, "workflow.default_governance_scope");
  if ("default_routing_mode" in workflow) {
    assertString(workflow.default_routing_mode, "workflow.default_routing_mode");
    if (!["fast-track", "deep-path"].includes(workflow.default_routing_mode)) {
      throw new Error("workflow.default_routing_mode must be 'fast-track' or 'deep-path'.");
    }
  }
}

function resolveAofPath(aofRoot, relativePath) {
  return path.join(aofRoot, relativePath);
}

function validateDecisionRecordTemplateMarkdown(templateText) {
  assertString(templateText, "decision record markdown template");
  if (!templateText.includes("{{decision_id}}")) {
    throw new Error("decision record markdown template must include {{decision_id}}.");
  }
  if (!templateText.includes("{{decision_record_content}}")) {
    throw new Error("decision record markdown template must include {{decision_record_content}}.");
  }
}

export async function loadTemplate(projectRoot) {
  const aofRoot = path.join(projectRoot, ".aof");
  const manifestPath = path.join(aofRoot, "aof.yaml");
  const manifest = await readYaml(manifestPath);
  await validateManifest(manifest);

  const organizationPath = resolveAofPath(aofRoot, manifest.organization);
  const governancePath = resolveAofPath(aofRoot, manifest.governance);
  const policiesPath = resolveAofPath(aofRoot, manifest.policies);

  const [organization, governance, policies] = await Promise.all([
    readYaml(organizationPath),
    readYaml(governancePath),
    readYaml(policiesPath)
  ]);
  validateOrganization(organization);
  validateGovernance(governance);
  validatePolicies(policies);

  const actors = [];
  for (const actorRef of manifest.actors) {
    const actorPath = resolveAofPath(aofRoot, actorRef);
    const actor = await readYaml(actorPath);
    validateActor(actor);
    actors.push(actor);
  }

  const workflowId = manifest.workflows.default;
  const workflowRef = manifest.workflows.registry[workflowId];
  if (!workflowRef) {
    throw new Error(`Default workflow '${workflowId}' not found in workflow registry.`);
  }
  const workflow = await readYaml(resolveAofPath(aofRoot, workflowRef));
  validateWorkflow(workflow, workflowId);

  const decisionRecordMarkdownPath = resolveAofPath(aofRoot, manifest.templates.decision_record_markdown);
  const decisionRecordSchemaPath = resolveAofPath(aofRoot, manifest.templates.decision_record_schema);
  const [decisionRecordMarkdownTemplate, decisionRecordSchema] = await Promise.all([
    fs.readFile(decisionRecordMarkdownPath, "utf8"),
    readJson(decisionRecordSchemaPath, "decision record schema template")
  ]);
  validateDecisionRecordTemplateMarkdown(decisionRecordMarkdownTemplate);
  assertObject(decisionRecordSchema, "decision record schema template");

  return {
    projectRoot,
    aofRoot,
    manifest,
    organization,
    governance,
    policies,
    actors,
    workflow,
    workflowId,
    templatePaths: {
      decisionRecordMarkdownPath,
      decisionRecordSchemaPath
    },
    templateAssets: {
      decisionRecordMarkdownTemplate,
      decisionRecordSchema
    }
  };
}
