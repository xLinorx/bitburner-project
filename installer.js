/** @param {NS} ns **/

const repo = "xLinorx/bitburner-project";
const GITLAB_PROJECT_ID = "84882219";
const GITLAB_TOKEN = "glpat-M_IIko7hbWoKDACmjyJFD2M6MQpvOjEKdTpvOGRlOA8.01.170mp2ams";

const installOptions = {
    main: {
        branch: "main",
        provider: "github",
    },
    dev: {
        branch: "mainDev",
        provider: "github",
    },
    experimental: {
        branch: "experimental",
        provider: "github",
    },
    light: {
        branch: "lightversion",
        provider: "github",
    }
};

//Provider Functions
async function fetchTree(ns, cfg) {
    const tmp = "tree_temp.txt";
    let url;

    if (cfg.provider === "github") {
        url = `https://api.github.com/repos/${repo}/git/trees/${cfg.branch}?recursive=1`;
    } else {
        url = `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/repository/tree?ref=${cfg.branch}&recursive=true&per_page=100&private_token=${GITLAB_TOKEN}`;
    }

    const ok = await ns.wget(url, tmp);
    if (!ok) return null;

    const raw = JSON.parse(ns.read(tmp));
    ns.rm(tmp);

    if (cfg.provider === "github") {
        if (!raw.tree) return null;
        return raw.tree
            .filter(e => e.type === "blob" && e.path.endsWith(".js"))
            .map(e => ({ path: e.path, id: e.sha }));
    } else {
        return raw
            .filter(e => e.type === "blob" && e.path.endsWith(".js"))
            .map(e => ({ path: e.path, id: e.id }));
    }

}

function buildRawUrl(cfg, path) {
    if (cfg.provider === "github") {
        return `https://raw.githubusercontent.com/${repo}/${cfg.branch}/${path}?ts=${Date.now()}`;
    } else {
        return `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/repository/files/${encodeURIComponent(path)}/raw?ref=${cfg.branch}&private_token=${GITLAB_TOKEN}`;
    }
}

export async function main(ns) {
    const choices = Object.keys(installOptions);

    const silent = ns.args.length > 0 && choices.includes(ns.args[0]);
    let selectedOption;

    if (silent) {
        selectedOption = ns.args[0];
    } else {
        const installD = await ns.prompt("Welche Auswahl möchtest du installieren?", {
            type: "select",
            choices,
        });
        selectedOption = installD && choices.includes(installD) ? installD : "main";
        if (selectedOption !== installD) {
            ns.tprint(`Ungültige Auswahl. Standardmäßig wird "main" installiert.`);
        }
    }

    const cfg = installOptions[selectedOption];
    ns.tprint(`Prüfe Dateien von ${cfg.provider === "github" ? repo : "bitburnerproject"}@${cfg.branch} (${cfg.provider})...`);

    const tree = await fetchTree(ns, cfg);
    if (!tree) {
        ns.tprint("ERROR: Konnte Dateiliste nicht laden. Abbruch.");
        return;
    }

    const stateFile = `repo_state_${selectedOption}.txt`;
    let oldState = {};
    if (ns.fileExists(stateFile)) {
        try { oldState = JSON.parse(ns.read(stateFile)); } catch { oldState = {}; }
    }

    const newState = {};
    let updated = 0, skipped = 0, failed = 0;

    for (const file of tree) {
        newState[file.path] = file.id;

        if (oldState[file.path] === file.id) {
            skipped++;
            continue;
        }

        const url = buildRawUrl(cfg, file.path);
        const result = await ns.wget(url, file.path);

        if (!result) {
            ns.tprint(`ERROR: Could not download ${file.path}`);
            failed++;
        } else {
            ns.tprint(`Updated: ${file.path}`);
            updated++;
        }
        await ns.sleep(150);
    }

    await ns.write(stateFile, JSON.stringify(newState), "w");
    ns.tprint(`Sync fertig (${selectedOption}): ${updated} aktualisiert, ${skipped} unverändert, ${failed} fehlgeschlagen.`);

    if (silent) return;

    const startNow = await ns.prompt("Möchtest du das Programm jetzt starten?", {
        type: "boolean"
    });

    if (startNow) {
        const files = tree.map(f => f.path);
        const startScript = files.includes("boot.js") ? "boot.js"
            : files.includes("update.js") ? "update.js"
            : files[0];

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