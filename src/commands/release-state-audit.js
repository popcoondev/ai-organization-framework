import path from "node:path";

import { writeJsonArtifact } from "../runtime/utils.js";
import { loadBundledSchema, validateAgainstSchema } from "../runtime/validation.js";
import { pathExists, readJson } from "./operator-surface-helpers.js";
import { loadActiveReleaseManifest } from "./release-state-helpers.js";

function pushCheck(checks, errors, name, condition, detail) {
  const status = condition ? "pass" : "fail";
  checks.push({ name, status, detail });
  if (!condition) {
    errors.push(`${name}: ${detail}`);
  }
}

async function validatePayload(payload, schemaFileName, label) {
  const schema = await loadBundledSchema(schemaFileName);
  validateAgainstSchema(payload, schema, label);
}

export async function releaseStateAuditCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const checks = [];
  const errors = [];
  const manifestRecord = await loadActiveReleaseManifest(projectRoot);

  if (!manifestRecord) {
    pushCheck(checks, errors, "active release manifest presence", false, "no active release manifest was found");
  }

  const bootstrapPath = path.join(projectRoot, ".aof", "project-bootstrap.json");
  const organizationPath = path.join(projectRoot, ".aof", "organization.json");
  const bootstrap = await readJson(bootstrapPath, "project bootstrap");
  const organization = await readJson(organizationPath, "organization");
  await validatePayload(bootstrap, "aof-project-bootstrap.schema.json", "project bootstrap");
  await validatePayload(organization, "aof-organization.schema.json", "organization");

  const manifest = manifestRecord?.manifest ?? null;
  const releaseContract = (organization.contracts ?? []).find((contract) => contract.contract_id === "contract-governance-to-release");

  if (manifest) {
    for (const [name, ref] of [
      ["release definition ref", manifest.release_definition_ref],
      ["release notes ref", manifest.release_notes_ref],
      ["release checklist ref", manifest.release_checklist_ref],
      ["roadmap ref", manifest.roadmap_ref],
      ["release plan ref", manifest.release_plan_ref]
    ]) {
      pushCheck(checks, errors, name, await pathExists(path.resolve(projectRoot, ref)), `${ref}${await pathExists(path.resolve(projectRoot, ref)) ? "" : " does not exist"}`);
    }

    pushCheck(
      checks,
      errors,
      "bootstrap version alignment",
      bootstrap.aof_version === manifest.release_version,
      `bootstrap.aof_version=${bootstrap.aof_version}, manifest.release_version=${manifest.release_version}`
    );

    pushCheck(
      checks,
      errors,
      "governance release contract alignment",
      releaseContract?.artifact_ref === manifest.release_definition_ref,
      `contract-governance-to-release artifact_ref=${releaseContract?.artifact_ref ?? "missing"}, manifest.release_definition_ref=${manifest.release_definition_ref}`
    );
  } else {
    pushCheck(checks, errors, "bootstrap version alignment", false, "cannot evaluate without an active release manifest");
    pushCheck(checks, errors, "governance release contract alignment", false, "cannot evaluate without an active release manifest");
  }

  const payload = {
    ok: errors.length === 0,
    artifact_type: "release-state-audit",
    generated_at: new Date().toISOString(),
    project_root: projectRoot,
    active_release: manifest,
    checks,
    errors
  };

  await validatePayload(payload, "aof-release-state-audit.schema.json", "release state audit");

  const artifactPath = options.artifactPath
    ? await writeJsonArtifact(options.artifactPath, payload)
    : null;

  return {
    ok: payload.ok,
    artifactPath,
    summary: payload
  };
}
