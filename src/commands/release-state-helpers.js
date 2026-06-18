import path from "node:path";

import { resolveAofRoot } from "../runtime/project-paths.js";
import { maybeReadJson } from "./operator-surface-helpers.js";
import { loadBundledSchema, validateAgainstSchema } from "../runtime/validation.js";

export function resolveActiveReleaseManifestPath(projectRoot) {
  return path.join(resolveAofRoot(projectRoot), "context", "active", "active-release-manifest.json");
}

export async function loadActiveReleaseManifest(projectRoot) {
  const manifestPath = resolveActiveReleaseManifestPath(projectRoot);
  const manifest = await maybeReadJson(manifestPath, "active release manifest");
  if (!manifest) {
    return null;
  }

  const schema = await loadBundledSchema("aof-active-release-manifest.schema.json");
  validateAgainstSchema(manifest, schema, "active release manifest");

  return {
    manifestPath,
    manifest
  };
}
