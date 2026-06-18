import path from "node:path";

import { initializeProjectBootstrap } from "../runtime/project-bootstrap-memory.js";

export async function initProjectCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  return initializeProjectBootstrap({
    projectRoot,
    topology: options.topology,
    writeTarget: options.writeTarget || null,
    projectType: options.projectType || null,
    domainSummary: options.domainSummary || null,
    installMode: options.installMode || "runtime-on"
  });
}
