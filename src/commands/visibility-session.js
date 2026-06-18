import path from "node:path";
import { spawn } from "node:child_process";

import { visibilityExportCommand } from "./visibility-export.js";
import { visibilityServeCommand } from "./visibility-serve.js";

export function openBrowser(url) {
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

export async function visibilitySessionCommand(options, runtimeOptions = {}) {
  const projectRoot = path.resolve(options.project || ".");
  const exportCommand = runtimeOptions.exportCommand ?? visibilityExportCommand;
  const serveCommand = runtimeOptions.serveCommand ?? visibilityServeCommand;
  const openBrowserImpl = runtimeOptions.openBrowserFn ?? openBrowser;

  const exportResult = await exportCommand({
    project: projectRoot,
    artifactDir: options.artifactDir
  });
  const serveResult = await serveCommand({
    statusInput: exportResult.statusPath,
    timelineInput: exportResult.timelinePath,
    flowInput: exportResult.flowPath,
    missionInput: exportResult.missionPath,
    progressInput: exportResult.operatorProgressPath,
    treeInput: exportResult.treePositionPath,
    evidenceInput: exportResult.evidenceDrillDownPath,
    host: options.host,
    port: options.port,
    title: options.title
  }, runtimeOptions);

  if (options.openBrowser) {
    openBrowserImpl(serveResult.url);
  }

  return {
    ok: true,
    projectRoot,
    url: serveResult.url,
    host: serveResult.host,
    port: serveResult.port,
    title: serveResult.title,
    opened_browser: Boolean(options.openBrowser),
    artifact