import path from "node:path";

import { nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { loadBundledSchema, validateAgainstSchema } from "../runtime/validation.js";
import { readJson } from "./operator-surface-helpers.js";
import { resolveActiveReleaseManifestPath } from "./release-state-helpers.js";

async function validatePayload(payload, schemaFileName, label) {
  const schema = await loadBundledSchema(schemaFileName);
  validateAgainstSchema(payload, schema, label);
}

export async function releaseStateRefreshCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const bootstrapPath = path.join(projectRoot, ".aof", "project-bootstrap.json");
  const organizationPath = path.join(projectRoot, ".aof", "organization.json");
  const recordedAt = nowIso();

  const manifest = {
    artifact_type: "active-release-manifest",
    recorded_at: recordedAt,
    release_version: options.releaseVersion,
    release_tag: options.releaseTag,
    release_definition_ref: options.releaseDefinitionRef,
    release_notes_ref: options.releaseNotesRef,
    release_checklist_ref: options.releaseChecklistRef,
    roadmap_ref: options.roadmapRef || "docs/vnext-roadmap.md",
    release_plan_ref: options.releasePlanRef || "docs/vnext-release-plan.md"
  };
  await validatePayload(manifest, "aof-active-release-manifest.schema.json", "active release manifest");

  const bootstrap = await readJson(bootstrapPath, "project bootstrap");
  bootstrap.aof_version = options.releaseVersion;
  bootstrap.updated_at = recordedAt;
  await validatePayload(bootstrap, "aof-project-bootstrap.schema.json", "project bootstrap");

  const organization = await readJson(organizationPath, "organization");
  const releaseContract = (organization.contracts ?? []).find((contract) => contract.contract_id === "contract-governance-to-release");
  if (!releaseContract) {
    throw new Error("organization is missing contract-governance-to-release.");
  }
  releaseContract.artifact_ref = options.releaseDefinitionRef;
  if (options.organizationMission) {
    organization.mission = options.organizationMission;
  }
  organization.updated_at = recordedAt;
  await validatePayload(organization, "aof-organization.schema.json", "organization");

  const manifestPath = options.artifactPath
    ? path.resolve(projectRoot, options.artifactPath)
    : resolveActiveReleaseManifestPath(projectRoot);

  const writtenManifestPath = await writeJsonArtifact(manifestPath, manifest);
  await writeJsonArtifact(bootstrapPath, bootstrap);
  await writeJsonArtifact(organizationPath, organization);

  return {
    ok: true,
    projectRoot,
    activeReleaseManifestPath: writtenManifestPath,
    bootstrapPath,
    organizationPath,
    activeRelease: manifest
  };
}
