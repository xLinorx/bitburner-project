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
    "update.js",
  ];

  ns.tprint(`Installing project files from ${repo}@${branch}...`);

  ns.tprint(`Starting Systemupdate...`);
  await ns.exec("update.js", "home", branch);

  ns.tprint(`Update finished. Please check the logs for any errors. Type "run boot.js" to start the system.`);

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