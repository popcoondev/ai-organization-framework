import path from "node:path";

import { upgradeProjectBootstrap } from "../runtime/project-memory.js";

export async function upgradeProjectCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  return upgradeProjectBootstrap({
    projectRoot,
    writeTarget: options.writeTarget || null,
    installMode: options.installMode || null
  });
}
