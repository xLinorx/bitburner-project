import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Nuke-Manager 3.0 (Stabilitäts-Fix) aktiv...");

    const SCRIPTS = [
        "/batching/hack.js",
        "/batching/grow.js",
        "/batching/weaken.js"
    ];

    while (true) {

        // === 1. Port-2-Lock: Börse hat Vorrang ============================
        let port2 = ns.readPort(2);
        if (port2 !== "NULL PORT DATA" && port2 === "STOCK_ACTIVE") {
            await ns.sleep(5000);
            continue;
        }

        // === 2. Netzwerk scannen (optimiert) ===============================
        let servers = scanNetwork(ns);

        // === 3. Root-Rechte erlangen ======================================
        for (let node of servers) {
            if (node === "home" || node.startsWith("pserv")) continue;
            if (!ns.hasRootAccess(node)) tryRoot(ns, node);
        }

        // === 4. Bestes Ziel bestimmen =====================================
        let target = getBestTarget(ns, servers);

        // === 5. NPC-Server mit Microservices füllen =======================
        for (let node of servers) {
            if (node === "home" || node.startsWith("pserv")) continue;
            if (!ns.hasRootAccess(node)) continue;

            let freeRam = ns.getServerMaxRam(node) - ns.getServerUsedRam(node);
            if (freeRam < 4) continue;

            // Nur aktualisieren, wenn kein Batch läuft
            if (ns.isRunning("/batching/hack.js", node, target)) continue;

            // Skripte kopieren
            ns.killall(node);
            await ns.sleep(20);

            for (let s of SCRIPTS) ns.scp(s, node, "home");

            // RAM-basierte Thread-Verteilung
            let hRam = ns.getScriptRam("/batching/hack.js");
            let gRam = ns.getScriptRam("/batching/grow.js");
            let wRam = ns.getScriptRam("/batching/weaken.js");

            let hThreads = Math.floor(freeRam * 0.10 / hRam);
            let gThreads = Math.floor(freeRam * 0.70 / gRam);
            let wThreads = Math.floor(freeRam * 0.20 / wRam);

            if (hThreads > 0) ns.exec("/batching/hack.js", node, hThreads, target);
            if (gThreads > 0) ns.exec("/batching/grow.js", node, gThreads, target);
            if (wThreads > 0) ns.exec("/batching/weaken.js", node, wThreads, target);
        }

        await ns.sleep(30000);
    }
}

// === Hilfsfunktionen =======================================================

function scanNetwork(ns) {
    const visited = new Set(["home"]);
    const queue = ["home"];

    while (queue.length > 0) {
        const current = queue.shift();
        for (const next of ns.scan(current)) {
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }
    return [...visited];
}

function tryRoot(ns, node) {
    try {
        if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(node);
        if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(node);
        if (ns.fileExists("relaySMTP.exe", "home")) ns.relaysmtp(node);
        if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(node);
        if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(node);

        ns.nuke(node);
    } catch (e) {
        // Ignorieren, falls Ports nicht reichen
    }
}

function getBestTarget(ns, servers) {
    let best = "n00dles";
    let bestScore = 0;
    let hacking = ns.getHackingLevel();

    for (let s of servers) {
        if (s === "home" || s.startsWith("pserv") || !ns.hasRootAccess(s)) continue;

        if (ns.getServerRequiredHackingLevel(s) <= hacking) {
            let maxMoney = ns.getServerMaxMoney(s);
            let minSec = ns.getServerMinSecurityLevel(s);
            let score = maxMoney / Math.max(minSec, 1);

            if (score > bestScore) {
                bestScore = score;
                best = s;
            }
        }
    }
    return best;
}
