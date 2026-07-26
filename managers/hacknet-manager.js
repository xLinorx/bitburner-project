import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Hacknet-Manager aktiv. Überwache Wirtschaftlichkeit und Phasen...");

    while (true) {
        let profile = getGameProfile(ns);

        // 1. Priority-Lock: Wenn die Börse aktiv handelt, hat sie absoluten Vorrang
        if (ns.peek(2) === "STOCK_ACTIVE") {
            await ns.sleep(3000);
            continue;
        }

        // 2. Standby-Modus in LATE / ENDGAME: Kein sinnloses Kapitalverbrennen vor/während der Corp-Gründung
        if (profile.phase === "LATE" || profile.phase === "ENDGAME") {
            await ns.sleep(30000);
            continue;
        }

        let myMoney = ns.getServerMoneyAvailable("home");
        
        // BUDGET-SPLITTING: Nutzt maximal 10% des Überschusses über der Sicherheitsreserve
        let surplus = Math.max(0, myMoney - profile.safetyReserve);
        let spendableMoney = surplus * 0.10;

        if (spendableMoney <= 0) {
            await ns.sleep(5000);
            continue;
        }

        let numNodes = ns.hacknet.numNodes();
        let maxNodes = ns.hacknet.maxNumNodes();
        let boughtSomething = false;

        // 3. Kontrollierter Zukauf von Nodes (limitiert auf max 16 Nodes, um Kosten-Explosion zu stoppen)
        let purchaseCost = ns.hacknet.getPurchaseNodeCost();
        if (numNodes < maxNodes && numNodes < 16 && spendableMoney >= purchaseCost) {
            let res = ns.hacknet.purchaseNode();
            if (res !== -1) {
                ns.print(`[+] Neue Hacknet-Node #${res} gekauft.`);
                boughtSomething = true;
            }
        }

        // 4. Ausbalancierte Upgrades mit harten Obergrenzen (Level 150, 64GB RAM, 8 Cores)
        for (let i = 0; i < numNodes; i++) {
            myMoney = ns.getServerMoneyAvailable("home");
            surplus = Math.max(0, myMoney - profile.safetyReserve);
            spendableMoney = surplus * 0.10;

            let stats = ns.hacknet.getNodeStats(i);

            // Level Upgrade (Stoppt bei 150, da danach das ROI extrem einbricht)
            let lvlCost = ns.hacknet.getLevelUpgradeCost(i, 1);
            if (stats.level < 150 && spendableMoney >= lvlCost) {
                if (ns.hacknet.upgradeLevel(i, 1)) {
                    boughtSomething = true;
                    continue;
                }
            }

            // RAM Upgrade (Stoppt bei 64GB)
            let ramCost = ns.hacknet.getRamUpgradeCost(i, 1);
            if (stats.ram < 64 && spendableMoney >= ramCost) {
                if (ns.hacknet.upgradeRam(i, 1)) {
                    boughtSomething = true;
                    continue;
                }
            }

            // Core Upgrade (Stoppt bei 8 Cores)
            let coreCost = ns.hacknet.getCoreUpgradeCost(i, 1);
            if (stats.cores < 8 && spendableMoney >= coreCost) {
                if (ns.hacknet.upgradeCore(i, 1)) {
                    boughtSomething = true;
                    continue;
                }
            }
        }

        if (!boughtSomething) {
            await ns.sleep(5000);
        } else {
            await ns.sleep(1000);
        }
    }
}