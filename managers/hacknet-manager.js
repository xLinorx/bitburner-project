import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Hacknet-Manager 3.0 (ROI-Fix) aktiv...", "INFO");

    const MAX_NODES = 25;
    const MAX_LEVEL = 200;
    const MAX_RAM = 64;
    const MAX_CORES = 16;

    while (true) {
        let profile = getGameProfile(ns);
        let money = ns.getServerMoneyAvailable("home");

        // === 1. Phase-Schrank: LATE/ENDGAME = Standby ============================
        if (profile.phase === "LATE" || profile.phase === "ENDGAME") {
            await ns.sleep(60000);
            continue;
        }

        // === 2. Budget ===========================================================
        let spendable = money - profile.safetyReserve;
        if (spendable <= 0) {
            await ns.sleep(5000);
            continue;
        }

        // === 3. ROI-Berechnung ===================================================
        let best = null;
        let bestROI = 0;

        // --- Neuer Node ----------------------------------------------------------
        if (ns.hacknet.numNodes() < MAX_NODES) {
            let cost = ns.hacknet.getPurchaseNodeCost();
            let gain = estimateNodeGain(ns);
            let roi = gain / cost;

            if (roi > bestROI && spendable > cost) {
                bestROI = roi;
                best = { type: "new" };
            }
        }

        // --- Bestehende Nodes -----------------------------------------------------
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            let stats = ns.hacknet.getNodeStats(i);

            // Level Upgrade
            if (stats.level < MAX_LEVEL) {
                let cost = ns.hacknet.getLevelUpgradeCost(i, 1);
                let gain = estimateLevelGain(stats);
                let roi = gain / cost;

                if (roi > bestROI && spendable > cost) {
                    bestROI = roi;
                    best = { type: "level", node: i };
                }
            }

            // RAM Upgrade
            if (stats.ram < MAX_RAM) {
                let cost = ns.hacknet.getRamUpgradeCost(i, 1);
                let gain = estimateRamGain(stats);
                let roi = gain / cost;

                if (roi > bestROI && spendable > cost) {
                    bestROI = roi;
                    best = { type: "ram", node: i };
                }
            }

            // Core Upgrade
            if (stats.cores < MAX_CORES) {
                let cost = ns.hacknet.getCoreUpgradeCost(i, 1);
                let gain = estimateCoreGain(stats);
                let roi = gain / cost;

                if (roi > bestROI && spendable > cost) {
                    bestROI = roi;
                    best = { type: "core", node: i };
                }
            }
        }

        // === 4. Upgrade ausführen =================================================
        if (best !== null) {
            switch (best.type) {
                case "new":
                    ns.hacknet.purchaseNode();
                    break;
                case "level":
                    ns.hacknet.upgradeLevel(best.node, 1);
                    break;
                case "ram":
                    ns.hacknet.upgradeRam(best.node, 1);
                    break;
                case "core":
                    ns.hacknet.upgradeCore(best.node, 1);
                    break;
            }
            await ns.sleep(50);
        } else {
            await ns.sleep(2000);
        }
    }
}

// ============================================================================
// ROI-Schätzfunktionen
// ============================================================================

function estimateNodeGain(ns) {
    // Durchschnittliche Produktion eines Level-1 Nodes
    return 1.5; 
}

function estimateLevelGain(stats) {
    // Level erhöht Produktion linear
    return stats.production / stats.level;
}

function estimateRamGain(stats) {
    // RAM erhöht Produktion um ~7% pro Stufe
    return stats.production * 0.07;
}

function estimateCoreGain(stats) {
    // Cores erhöhen Produktion um ~14% pro Stufe
    return stats.production * 0.14;
}
