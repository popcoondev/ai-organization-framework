import path from "node:path";

import { pathExists, readJson } from "./operator-surface-helpers.js";
import { resolveAofRoot } from "../runtime/project-memory.js";

export async function contractRegisterCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const organization = await readJson(path.join(aofRoot, "organization.json"), "organization");

  const contracts = await Promise.all(
    (organization.contracts ?? []).map(async (contract) => ({
      contract_id: contract.contract_id,
      name: contract.name ?? null,
      owner_team_ref: contract.owner_team_ref ?? null,
      contract_type: contract.contract_type ?? null,
      artifact_ref: contract.artifact_ref ?? null,
      artifact_present: contract.artifact_ref
        ? await pathExists(path.resolve(projectRoot, contract.artifact_ref))
        : false
    }))
  );

  return {
    ok: true,
    projectRoot,
    contract_count: contracts.length,
    contracts
  };
}
