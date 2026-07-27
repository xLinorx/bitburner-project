import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Hacknet-Manager 2.0 (Phasen-optimiert) aktiv...", "INFO");

    const maxNodes = 10; // Maximalanzahl an Hacknet-Knoten. Ursprünglicher Wert: 25.
    const maxLevel = 25; // Maximallevel für Hacknet-Knoten. Ursprünglicher Wert: 200, aber Kosten/Nutzen Verhältnis ist im Endgame nicht mehr gegeben.
    const maxRam = 32; // Maximal-RAM für Hacknet-Knoten. Ursprünglicher Wert: 64.
    const maxCores = 8; // Maximalanzahl an Kernen für Hacknet-Knoten. Ursprünglicher Wert: 16.

    while (true) {
        let profile = getGameProfile(ns);
        let myMoney = ns.getServerMoneyAvailable("home");

        // Harter Cut-Off: Im Late/Endgame sparen wir auf die Corp. Hacknet kostet hier nur sinnlos Geld.
        if (profile.phase === "ENDGAME" || profile.phase === "LATE") {
            await ns.sleep(60000);
            continue;
        }

        // Zentralisiertes Budget-Management aus der profile.js
        let spendableMoney = myMoney - profile.safetyReserve;

        // Sicherheitsnetz: Nichts kaufen, wenn wir unterhalb der globalen Reserve sind
        if (spendableMoney <= 0) {
            await ns.sleep(5000);
            continue;
        }

        let bestUpgrade = null;
        let bestROI = 0;

        // Evaluierung: Neuer Node
        if (ns.hacknet.numNodes() < maxNodes) {
            let cost = ns.hacknet.getPurchaseNodeCost();
            let roi = 1.5 / cost;
            if (roi > bestROI && spendableMoney > cost) {
                bestROI = roi;
                bestUpgrade = { type: 'new' };
            }
        }

        // Evaluierung: Bestehende Nodes upgraden
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            let stats = ns.hacknet.getNodeStats(i);
            
            if (stats.level < maxLevel) {
                let cost = ns.hacknet.getLevelUpgradeCost(i, 1);
                let gain = (stats.production / stats.level) * 1;
                let roi = gain / cost;
                if (roi > bestROI && spendableMoney > cost) {
                    bestROI = roi;
                    bestUpgrade = { type: 'level', node: i };
                }
            }
            
            if (stats.ram < maxRam) {
                let cost = ns.hacknet.getRamUpgradeCost(i, 1);
                let gain = stats.production * 0.07;
                let roi = gain / cost;
                if (roi > bestROI && spendableMoney > cost) {
                    bestROI = roi;
                    bestUpgrade = { type: 'ram', node: i };
                }
            }
            
            if (stats.cores < maxCores) {
                let cost = ns.hacknet.getCoreUpgradeCost(i, 1);
                let gain = stats.production * 0.14;
                let roi = gain / cost;
                if (roi > bestROI && spendableMoney > cost) {
                    bestROI = roi;
                    bestUpgrade = { type: 'core', node: i };
                }
            }
        }

        // Ausführung der rentabelsten Aktion
        if (bestUpgrade !== null) {
            if (bestUpgrade.type === 'new') {
                ns.hacknet.purchaseNode();
            } else if (bestUpgrade.type === 'level') {
                ns.hacknet.upgradeLevel(bestUpgrade.node, 1);
            } else if (bestUpgrade.type === 'ram') {
                ns.hacknet.upgradeRam(bestUpgrade.node, 1);
            } else if (bestUpgrade.type === 'core') {
                ns.hacknet.upgradeCore(bestUpgrade.node, 1);
            }
            await ns.sleep(50);
        } else {
            // Kein sinnvolles Upgrade gefunden oder alles gemaxt
            await ns.sleep(2000);
        }
    }
}