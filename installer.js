/** @param {NS} ns **/
export async function main(ns) {
    const installOptions = {
        main: {
            repo: "xLinorx/github-project",
            branch: "main",
            files: [
                "boot.js",
                "install.js",
                "scan.js",
                "batching/dispatcher.js",
                "batching/hack.js",
                "batching/grow.js",
                "batching/weaken.js",
                "lib/helpers.js",
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
            ]
        },
        dev: {
            repo: "xLinorx/github-project",
            branch: "mainDev",
            files: [
                "boot.js",
                "install.js",
                "scan.js",
                "batching/dispatcher.js",
                "batching/hack.js",
                "batching/grow.js",
                "batching/weaken.js",
                "lib/helpers.js",
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
            ]
        },
        experimental: {
            repo: "xLinorx/github-project",
            branch: "experimental",
            files: [
                "update.js"
            ]
        },
        light: {
            repo: "xLinorx/github-project",
            branch: "lightversion",
            files: [
                "boot.js",
                "startingatzero/early-hack.js",
                "startingatzero/singularity-helper.js",
                "startingatzero/manager.js",
                "startingatzero/early-stock.js",
                "startingatzero/dashboard.js"
            ]
        }
    };

    const choices = Object.keys(installOptions);
    const installD = await ns.prompt("Welche Auswahl möchtest du installieren?", {
        type: "select",
        choices,
    });

    const selectedOption = installD && choices.includes(installD) ? installD : "main";
    if (selectedOption !== installD) {
        ns.tprint(`Ungültige Auswahl. Standardmäßig wird "main" installiert.`);
    }

    const { repo, branch, files } = installOptions[selectedOption];
    const baseUrl = `https://raw.githubusercontent.com/${repo}/${branch}/`;

    ns.tprint(`Installing project files from ${repo}@${branch}...`);

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

    ns.tprint(`Installation finished: ${success} succeeded, ${failed} failed.`);
    if (failed > 0) {
        ns.tprint("Überprüfe die Branch- bzw. Dateipfade und führe den Befehl erneut aus.");
    }

    const startNow = await ns.prompt("Möchtest du das Programm jetzt starten?", {
        type: "boolean"
    });

    if (startNow) {
        const startScript = files.includes("boot.js") ? "boot.js" : files.includes("update.js") ? "update.js" : files[0];
        if (ns.fileExists(startScript, "home")) {
            ns.tprint(`Starte ${startScript} ...`);
            ns.run(startScript, 1);
        } else {
            ns.tprint(`Kann ${startScript} nicht starten: Datei nicht gefunden.`);
        }
    } else {
        ns.tprint("Installation abgeschlossen. Das Programm wurde nicht gestartet.");
    }
}