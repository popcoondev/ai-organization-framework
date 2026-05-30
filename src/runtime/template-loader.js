import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

async function readYaml(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return YAML.parse(text);
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

export async function loadTemplate(projectRoot) {
  const aofRoot = path.join(projectRoot, ".aof");
  const manifestPath = path.join(aofRoot, "aof.yaml");
  const manifest = await readYaml(manifestPath);

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

  const organizationPath = path.join(aofRoot, manifest.organization);
  const governancePath = path.join(aofRoot, manifest.governance);
  const policiesPath = path.join(aofRoot, manifest.policies);

  const [organization, governance, policies] = await Promise.all([
    readYaml(organizationPath),
    readYaml(governancePath),
    readYaml(policiesPath)
  ]);

  const actors = [];
  for (const actorRef of manifest.actors) {
    const actorPath = path.join(aofRoot, actorRef);
    actors.push(await readYaml(actorPath));
  }

  assertObject(manifest.workflows, "workflows");
  assertObject(manifest.workflows.registry, "workflows.registry");

  const workflowId = manifest.workflows.default;
  const workflowRef = manifest.workflows.registry[workflowId];
  if (!workflowRef) {
    throw new Error(`Default workflow '${workflowId}' not found in workflow registry.`);
  }
  const workflow = await readYaml(path.join(aofRoot, workflowRef));

  return {
    projectRoot,
    aofRoot,
    manifest,
    organization,
    governance,
    policies,
    actors,
    workflow,
    workflowId
  };
}
