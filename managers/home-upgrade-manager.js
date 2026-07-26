import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Home-Upgrade-Manager aktiv...");

    while (true) {
        let profile = getGameProfile(ns);

        // Priority-Lock: Wenn die Börse aktiv gute Trades sieht, pausieren wir
        if (ns.peek(2) === "STOCK_ACTIVE") {
            ns.print("[PRIORITY-LOCK] Stock-Engine hat Vorrang. Pausiere Home-Upgrades...");
            await ns.sleep(10000);
            continue;
        }

        let myMoney = ns.getServerMoneyAvailable("home");
        let currentRam = ns.getServerMaxRam("home");
        
        // BUDGET-SPLITTING: Maximal 10% des Überschusses für Home-Upgrades nutzen
        let surplus = Math.max(0, myMoney - profile.safetyReserve);
        let spendableMoney = surplus * 0.10;

        try {
            if (currentRam < 1048576) {
                let ramCost = ns.singularity.getUpgradeHomeRamCost();
                if (spendableMoney > ramCost) {
                    ns.singularity.upgradeHomeRam();
                    ns.print(`[HOME] RAM erfolgreich aufgerüstet.`);
                }
            }

            let coreCost = ns.singularity.getUpgradeHomeCoresCost();
            if (spendableMoney > coreCost) {
                ns.singularity.upgradeHomeCores();
                ns.print(`[HOME] CPU-Core erfolgreich aufgerüstet.`);
            }
        } catch (e) {
            // Singularity-API in dieser BitNode evtl. noch gesperrt
        }

        await ns.sleep(60000);
    }
}