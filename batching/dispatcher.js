import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "HWGW-Micro-Batching-Engine (Stabilitäts-Fix) aktiv.", "INFO");

    while (true) {

        // === 1. Port-1: Nur EIN Signal pro Tick lesen ==========================
        let signal = ns.readPort(1);
        if (signal !== "NULL PORT DATA") {
            // Später können hier echte Kommandos verarbeitet werden
            log(ns, `Dispatcher-Signal empfangen: ${signal}`, "INFO");
        }

        // === 2. Profil laden ====================================================
        let profile = getGameProfile(ns);

        // === 3. Serverliste =====================================================
        let servers = getReachableServers(ns);
        let targets = servers.filter(s => ns.hasRootAccess(s) && !s.startsWith("pserv") && s !== "home");

        let target = getBestTarget(ns, servers);

        // === 4. Host-Server (nur NPC + pserv) ==================================
        let hosts = servers.filter(s => ns.hasRootAccess(s) && s !== "home");

        // === 5. RAM-Berechnung ==================================================
        let totalRam = hosts.reduce((sum, srv) => sum + (ns.getServerMaxRam(srv) - ns.getServerUsedRam(srv)), 0);

        if (totalRam < 8) {
            await ns.sleep(1500);
            continue;
        }

        // === 6. Timing-Berechnung ==============================================
        let weakenTime = ns.getWeakenTime(target);
        let hackTime = ns.getHackTime(target);
        let growTime = ns.getGrowTime(target);

        let stagger = profile.stagger;

        let w2End = weakenTime;
        let gEnd = w2End - stagger;
        let w1End = gEnd - stagger;
        let hEnd = w1End - stagger;

        let hDelay = Math.max(0, hEnd - hackTime);
        let w1Delay = Math.max(0, w1End - weakenTime);
        let gDelay = Math.max(0, gEnd - growTime);
        let w2Delay = 0;

        // === 7. Batch-Verteilung ===============================================
        for (let srv of hosts) {
            let freeRam = ns.getServerMaxRam(srv) - ns.getServerUsedRam(srv);
            if (freeRam < 4) continue;

            ns.scp(["/batching/hack.js", "/batching/grow.js", "/batching/weaken.js"], srv, "home");

            let hRam = ns.getScriptRam("/batching/hack.js");
            let gRam = ns.getScriptRam("/batching/grow.js");
            let wRam = ns.getScriptRam("/batching/weaken.js");

            let weights = profile.threadWeights;

            let hThreads = Math.floor((freeRam * weights.h) / hRam);
            let w1Threads = Math.floor((freeRam * weights.w1) / wRam);
            let gThreads = Math.floor((freeRam * weights.g) / gRam);
            let w2Threads = Math.floor((freeRam * weights.w2) / wRam);

            if (hThreads > 0) ns.exec("/batching/hack.js", srv, hThreads, target, hDelay);
            if (w1Threads > 0) ns.exec("/batching/weaken.js", srv, w1Threads, target, w1Delay);
            if (gThreads > 0) ns.exec("/batching/grow.js", srv, gThreads, target, gDelay);
            if (w2Threads > 0) ns.exec("/batching/weaken.js", srv, w2Threads, target, w2Delay);
        }

        // === 8. Sleep ===========================================================
        await ns.sleep(Math.min(weakenTime + 500, 15000));
    }
}

function getReachableServers(ns, start = "home") {
    const visited = new Set([start]);
    const queue = [start];

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
