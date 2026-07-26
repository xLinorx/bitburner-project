import { log } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/logger.js";
import { getGameProfile } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("sleep");
    log(ns, "HWGW-Micro-Batching-Engine (v3.0.1 ns.cloud) gestartet. (Deadlock-Schutz aktiv)", "INFO");

    while (true) {
        let profile = getGameProfile(ns);

        // NEU: Operation Deadlock-Auflösung.
        // Den Port stumm leeren, damit er nicht überläuft. 
        // Wir ignorieren das Finanz-Signal ab sofort komplett und arbeiten zu 100% weiter!
        while (ns.readPort(1) !== "NULL PORT DATA") {
            // Die anderen Manager dürfen panisch "PAUSE_BATCHING" rufen, 
            // aber der Dispatcher ignoriert es und pumpt weiter Geld ins System.
        }

        let reachableServers = getReachableServers(ns);
        let target = getBestTarget(ns, reachableServers);
        let hostServers = reachableServers.filter(server => server !== "home" && ns.hasRootAccess(server));
        
        let totalRam = 0;
        for (let srv of hostServers) {
            totalRam += ns.getServerMaxRam(srv) - ns.getServerUsedRam(srv);
        }

        if (totalRam < 64) {
            await ns.sleep(1500);
            continue;
        }

        let weakenTime = ns.getWeakenTime(target);
        let stagger = profile.stagger;
        
        let hEnd = weakenTime - (stagger * 3);
        let w1End = weakenTime - (stagger * 2);
        let gEnd = weakenTime - stagger;
        let w2End = weakenTime;

        let hDelay = Math.max(0, w1End - ns.getHackTime(target));
        let w1Delay = 0;
        let gDelay = Math.max(0, w2End - ns.getGrowTime(target));
        let w2Delay = 0;

        for (let srv of hostServers) {
            let freeRam = ns.getServerMaxRam(srv) - ns.getServerUsedRam(srv);
            if (freeRam < 10) continue;

            ns.scp([
                "D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/hack.js",
                "D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/grow.js",
                "D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/weaken.js"
            ], srv, "home");

            let hRam = ns.getScriptRam("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/hack.js");
            let gRam = ns.getScriptRam("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/grow.js");
            let wRam = ns.getScriptRam("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/weaken.js");

            let weights = profile.threadWeights;
            let hThreads = Math.floor((freeRam * weights.h) / hRam);
            let w1Threads = Math.floor((freeRam * weights.w1) / wRam);
            let gThreads = Math.floor((freeRam * weights.g) / gRam);
            let w2Threads = Math.floor((freeRam * weights.w2) / wRam);

            if (hThreads > 0) ns.exec("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/hack.js", srv, hThreads, target, hDelay);
            if (w1Threads > 0) ns.exec("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/weaken.js", srv, w1Threads, target, w1Delay);
            if (gThreads > 0) ns.exec("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/grow.js", srv, gThreads, target, gDelay);
            if (w2Threads > 0) ns.exec("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/weaken.js", srv, w2Threads, target, w2Delay);
        }

        let sleepTime = Math.min(weakenTime + 500, 15000);
        await ns.sleep(sleepTime);
    }
}

function getReachableServers(ns, startServer = "home") {
    const visited = new Set([startServer]);
    const queue = [startServer];

    while (queue.length > 0) {
        const current = queue.shift();
        for (const neighbor of ns.scan(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return Array.from(visited);
}

function getBestTarget(ns, servers = null) {
    let reachableServers = servers || getReachableServers(ns);

    let playerHacking = ns.getHackingLevel();
    let bestTarget = "n00dles";
    let maxScore = 0;

    for (let node of reachableServers) {
        if (node === "home" || node.startsWith("pserv") || !ns.hasRootAccess(node)) continue;
        if (ns.getServerRequiredHackingLevel(node) <= playerHacking) {
            let maxMoney = ns.getServerMaxMoney(node);
            let minSec = ns.getServerMinSecurityLevel(node);
            let score = maxMoney / Math.max(minSec, 1);

            if (score > maxScore) {
                maxScore = score;
                bestTarget = node;
            }
        }
    }
    return bestTarget;
}