import path from "node:path";

import { readJson } from "./operator-surface-helpers.js";
import { resolveAofRoot } from "../runtime/project-paths.js";

export async function dependencyGraphCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const organization = await readJson(path.join(aofRoot, "organization.json"), "organization");

  const declaredDependencies = (organization.dependencies ?? []).map((dependency) => ({
    from_ref: dependency.from_ref,
    to_ref: dependency.to_ref,
    dependency_type: dependency.dependency_type ?? null,
    status: dependency.status ?? null
  }));

  const teamDependencyRefs = (organization.teams ?? []).flatMap((team) =>
    (team.dependencies ?? []).map((dependencyRef) => ({
      team_id: team.team_id,
      team_name: team.name ?? null,
      dependency_ref: dependencyRef
    }))
  );

  const adjacency = declaredDependencies.reduce((acc, dependency) => {
    if (!acc[dependency.from_ref]) {
      acc[dependency.from_ref] = [];
    }
    acc[dependency.from_ref].push({
      to_ref: dependency.to_ref,
      dependency_type: dependency.dependency_type,
      status: dependency.status
    });
    return acc;
  }, {});

  return {
    ok: true,
    projectRoot,
    dependency_count: declaredDependencies.length,
    dependencies: declaredDependencies,
    team_dependency_refs: teamDependencyRefs,
    adjacency
  };
}
