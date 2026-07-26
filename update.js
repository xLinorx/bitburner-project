/** @param {NS} ns **/
export async function main(ns) {
  const repo = "xLinorx/github-project";
  const rawArg = ns.args[0] && ns.args[0].toString().trim().toLowerCase();
  const validBranches = ["dev", "devr", "main"];
  const branch = validBranches.includes(rawArg) ? rawArg : "dev";

  if (rawArg && rawArg !== branch) {
    ns.tprint(`Branch "${rawArg}" wird nicht unterstützt. Verwende stattdessen "dev".`);
  }

  const baseUrl = `https://raw.githubusercontent.com/${repo}/${branch}/`;

  const files = [
    "boot.js",
    "helpers.js",
    "scan.js",
    "batching/dispatcher.js",
    "batching/hack.js",
    "batching/grow.js",
    "batching/weaken.js",
    "lib/logger.js",
    "lib/profile.js",
    "managers/ascension-manager.js",
    "managers/bladeburner-manager.js",
    "managers/cloud-manager.js",
    "managers/contract-solver.js",
    "managers/corp-manager.js",
    "managers/darkweb-manager.js",
    "managers/favor-optimizer.js",
    "managers/gang-manager.js",
    "managers/hacknet-manager.js",
    "managers/home-upgrade-manager.js",
    "managers/nuke-manager.js",
    "managers/sleeve-manager.js",
    "managers/staneks-optimizer.js",
    "managers/task-manager.js",
    "trading/stock-engine.js",
    "ui/dashboard.js"
  ];

  ns.tprint(`Updating project files from ${repo}@${branch}...`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const url = baseUrl + file;
    const target = file;
    ns.tprint(`Downloading ${file}...`);
    const result = await ns.wget(url, target);

    if (!result) {
      ns.tprint(`ERROR: Could not download ${file}`);
      failed++;
    } else {
      success++;
    }

    await ns.sleep(250);
  }

  ns.tprint(`Update finished: ${success} succeeded, ${failed} failed.`);
  if (failed > 0) {
    ns.tprint("Überprüfe die Branch- bzw. Dateipfade und führe den Befehl erneut aus.");
  }
}
