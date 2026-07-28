import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Hacknet-Manager 2.0 (Strict Payback) aktiv...", "INFO");

    // Harte Schranke: Ein Upgrade MUSS sich in maximal 1 Stunde rentieren.
    const MAX_PAYBACK_SECONDS = 3600; 

    while (true) {
        let profile = getGameProfile(ns);
        let myMoney = ns.getServerMoneyAvailable("home");

        // Im Late/Endgame sparen wir auf die Corp. Hacknet-Käufe werden eingefroren.
        if (profile.phase === "ENDGAME" || profile.phase === "LATE") {
            await ns.sleep(60000);
            continue;
        }

        let spendableMoney = myMoney - profile.safetyReserve;
        if (spendableMoney <= 0) {
            await ns.sleep(5000);
            continue;
        }

        let bestUpgrade = null;
        let bestROI = 0; 
        let requiredROI = 1 / MAX_PAYBACK_SECONDS; // Mindest-ROI, um die 1-Stunde-Regel zu schaffen

        // 1. Evaluierung: Neuer Node
        if (ns.hacknet.numNodes() < ns.hacknet.maxNumNodes()) {
            let cost = ns.hacknet.getPurchaseNodeCost();
            let gain = 1.5; // Basis-Produktion eines frischen Nodes
            let roi = gain / cost;
            
            if (roi >= requiredROI && roi > bestROI && spendableMoney > cost) {
                bestROI = roi;
                bestUpgrade = { type: 'new' };
            }
        }

        // 2. Evaluierung: Bestehende Nodes upgraden
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            let stats = ns.hacknet.getNodeStats(i);
            
            // Level Upgrade
            let lvlCost = ns.hacknet.getLevelUpgradeCost(i, 1);
            let lvlGain = (stats.production / stats.level);
            let lvlROI = lvlGain / lvlCost;
            if (lvlROI >= requiredROI && lvlROI > bestROI && spendableMoney > lvlCost) {
                bestROI = lvlROI;
                bestUpgrade = { type: 'level', node: i };
            }
            
            // RAM Upgrade
            let ramCost = ns.hacknet.getRamUpgradeCost(i, 1);
            let ramGain = stats.production * 0.07;
            let ramROI = ramGain / ramCost;
            if (ramROI >= requiredROI && ramROI > bestROI && spendableMoney > ramCost) {
                bestROI = ramROI;
                bestUpgrade = { type: 'ram', node: i };
            }
            
            // Core Upgrade
            let coreCost = ns.hacknet.getCoreUpgradeCost(i, 1);
            let coreGain = stats.production * 0.14;
            let coreROI = coreGain / coreCost;
            if (coreROI >= requiredROI && coreROI > bestROI && spendableMoney > coreCost) {
                bestROI = coreROI;
                bestUpgrade = { type: 'core', node: i };
            }
        }

        // Ausführung
        if (bestUpgrade !== null) {
            if (bestUpgrade.type === 'new') ns.hacknet.purchaseNode();
            else if (bestUpgrade.type === 'level') ns.hacknet.upgradeLevel(bestUpgrade.node, 1);
            else if (bestUpgrade.type === 'ram') ns.hacknet.upgradeRam(bestUpgrade.node, 1);
            else if (bestUpgrade.type === 'core') ns.hacknet.upgradeCore(bestUpgrade.node, 1);
            await ns.sleep(50);
        } else {
            // Kein Upgrade schafft die 1-Stunden-Regel -> Schlafen und Geld für wichtigere Dinge sparen
            await ns.sleep(10000);
        }
    }
}