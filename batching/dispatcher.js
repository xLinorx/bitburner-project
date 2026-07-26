import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("sleep");
    log(ns, "HWGW-Optimierter-Batching-Engine gestartet", "INFO");

    let currentTargets = [];
    let previousTargets = [];
    let lastTargetUpdate = 0;
    let targetUpdateInterval = 10000; // Alle 10 Sekunden nach besseren Targets suchen
    let targetMetrics = {}; // Speichert Hack-Quote und Leistung pro Target

    const HACK_PERCENT = 0.25; // 25% Hack-Quote

    while (true) {
        let profile = getGameProfile(ns);

        while (ns.readPort(1) !== "NULL PORT DATA") {
            // Port-Daten bereinigen
        }

        let reachableServers = getReachableServers(ns);
        let hostServers = reachableServers.filter(server => server !== "home" && ns.hasRootAccess(server));
        
        let totalRam = 0;
        for (let srv of hostServers) {
            totalRam += ns.getServerMaxRam(srv) - ns.getServerUsedRam(srv);
        }

        if (totalRam < 64) {
            await ns.sleep(1500);
            continue;
        }

        // Regelmäßig beste Targets neu bewerten
        let now = Date.now();
        if (now - lastTargetUpdate > targetUpdateInterval || currentTargets.length === 0) {
            previousTargets = [...currentTargets];
            currentTargets = getBestTargets(ns, reachableServers, 10); // Top 10 Targets
            lastTargetUpdate = now;
            
            // Prüfe auf veraltete Targets und kill alte Skripte
            let removedTargets = previousTargets.filter(t => !currentTargets.includes(t));
            if (removedTargets.length > 0) {
                log(ns, `Alte Targets entfernt: ${removedTargets.join(", ")}`, "INFO");
                killScriptsOnTargets(ns, hostServers, removedTargets);
            }
            
            log(ns, `Targets aktualisiert: ${currentTargets.join(", ")}`, "INFO");
        }

        if (currentTargets.length === 0) {
            await ns.sleep(1000);
            continue;
        }

        // Berechne optimale HWGW-Verhältnisse für 25% Hack-Quote
        let totalBatchThreads = 0;
        let batchReqs = {};

        for (let target of currentTargets) {
            let maxMoney = ns.getServerMaxMoney(target);
            let hackPercent = ns.hackAnalyze(target); // Prozentsatz Geld pro Hack-Thread
            
            // Berechne Hack-Threads für 25% Abzug
            let hackThreadsFor25 = Math.ceil((HACK_PERCENT) / hackPercent);
            
            // Berechne Grow-Threads um den Hack auszugleichen (Security wird auch erhöht)
            let growMultiplier = 1 / (1 - HACK_PERCENT); // z.B. 1.33 für 25%
            let growThreads = Math.ceil(ns.growthAnalyze(target, growMultiplier));
            
            // Berechne Weaken-Threads
            let hackSecurityIncrease = hackThreadsFor25 * 0.002; // Hack erhöht um 0.002 Sicherheit pro Thread
            let growSecurityIncrease = growThreads * 0.004; // Grow erhöht um 0.004 Sicherheit pro Thread
            let totalSecIncrease = hackSecurityIncrease + growSecurityIncrease;
            let weakenThreads = Math.ceil(totalSecIncrease / 0.05); // Weaken reduziert um 0.05 Sicherheit pro Thread
            
            // Verhältnis für HWGW-Zyklus: 1 Hack : 0.5 Weaken : (Grow abhängig von Hack) : 0.5 Weaken
            batchReqs[target] = {
                h: hackThreadsFor25,
                w1: Math.ceil(weakenThreads * 0.5),
                g: growThreads,
                w2: Math.ceil(weakenThreads * 0.5),
                totalThreads: hackThreadsFor25 + weakenThreads + growThreads
            };
            
            totalBatchThreads += batchReqs[target].totalThreads;
        }

        // Verteile Worker optimal auf Targets
        let ramUsagePerBatch = calculateRamPerBatch(ns, batchReqs);
        let batchesPerCycle = Math.floor(totalRam / ramUsagePerBatch);

        log(ns, `Batches pro Zyklus: ${batchesPerCycle}, RAM pro Batch: ${ramUsagePerBatch}GB`, "DEBUG");

        // Starte optimale Batche
        let batchIndex = 0;
        for (let srv of hostServers) {
            let freeRam = ns.getServerMaxRam(srv) - ns.getServerUsedRam(srv);
            if (freeRam < ramUsagePerBatch) continue;

            ns.scp([
                "/batching/hack.js",
                "/batching/grow.js",
                "/batching/weaken.js"
            ], srv, "home");

            let hRam = ns.getScriptRam("/batching/hack.js");
            let gRam = ns.getScriptRam("/batching/grow.js");
            let wRam = ns.getScriptRam("/batching/weaken.js");

            // Verteile Targets round-robin
            let target = currentTargets[batchIndex % currentTargets.length];
            let req = batchReqs[target];

            let weakenTime = ns.getWeakenTime(target);
            let stagger = profile.stagger;
            
            let w1End = weakenTime - (stagger * 3);
            let gEnd = weakenTime - (stagger * 2);
            let hEnd = weakenTime - stagger;
            let w2End = weakenTime;

            let w1Delay = 0;
            let gDelay = Math.max(0, hEnd - ns.getGrowTime(target));
            let hDelay = Math.max(0, gEnd - ns.getHackTime(target));
            let w2Delay = 0;

            // Starte HWGW-Batch mit exakten Thread-Verhältnissen
            if (req.h > 0) ns.exec("/batching/hack.js", srv, req.h, target, hDelay);
            if (req.w1 > 0) ns.exec("/batching/weaken.js", srv, req.w1, target, w1Delay);
            if (req.g > 0) ns.exec("/batching/grow.js", srv, req.g, target, gDelay);
            if (req.w2 > 0) ns.exec("/batching/weaken.js", srv, req.w2, target, w2Delay);

            batchIndex++;
        }

        // Schlaf bis zum nächsten Batch-Zyklus
        let maxCycleTime = Math.max(...currentTargets.map(t => ns.getWeakenTime(t))) + 500;
        let sleepTime = Math.min(maxCycleTime, 15000);
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

function killScriptsOnTargets(ns, hostServers, targets) {
    for (let srv of hostServers) {
        let processes = ns.ps(srv);
        for (let proc of processes) {
            // Prüfe ob das Skript auf einem veralteten Target läuft
            if (proc.args.length > 0 && targets.includes(proc.args[0])) {
                if (proc.filename.includes("hack") || proc.filename.includes("grow") || proc.filename.includes("weaken")) {
                    ns.kill(proc.pid, srv);
                    log(ns, `Killed ${proc.filename} auf ${srv} für Target ${proc.args[0]}`, "INFO");
                }
            }
        }
    }
}

function calculateRamPerBatch(ns, batchReqs) {
    let hRam = ns.getScriptRam("/batching/hack.js");
    let gRam = ns.getScriptRam("/batching/grow.js");
    let wRam = ns.getScriptRam("/batching/weaken.js");
    
    let totalRam = 0;
    for (let target in batchReqs) {
        let req = batchReqs[target];
        totalRam += (req.h * hRam) + (req.g * gRam) + ((req.w1 + req.w2) * wRam);
    }
    return totalRam;
}

function getBestTargets(ns, servers = null, count = 5) {
    let reachableServers = servers || getReachableServers(ns);
    let playerHacking = ns.getHackingLevel();
    let targets = [];

    for (let node of reachableServers) {
        if (node === "home" || node.startsWith("pserv") || !ns.hasRootAccess(node)) continue;
        if (ns.getServerRequiredHackingLevel(node) <= playerHacking) {
            let maxMoney = ns.getServerMaxMoney(node);
            let minSec = ns.getServerMinSecurityLevel(node);
            let score = maxMoney / Math.max(minSec, 1);

            targets.push({ name: node, score: score });
        }
    }

    // Sortiere nach Score (absteigend) und gib Top N zurück
    targets.sort((a, b) => b.score - a.score);
    return targets.slice(0, count).map(t => t.name);
}

function getBestTarget(ns, servers = null) {
    let bestTargets = getBestTargets(ns, servers, 1);
    return bestTargets.length > 0 ? bestTargets[0] : "n00dles";
}