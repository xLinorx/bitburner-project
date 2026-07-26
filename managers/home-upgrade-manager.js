import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Home-Upgrade-Manager 3.0 (ROI-Fix) aktiv...");

    while (true) {
        let profile = getGameProfile(ns);
        let money = ns.getServerMoneyAvailable("home");

        // === 1. Port-2-Lock: Börse hat Vorrang ================================
        let port2 = ns.readPort(2);
        if (port2 !== "NULL PORT DATA" && port2 === "STOCK_ACTIVE") {
            await ns.sleep(5000);
            continue;
        }

        // === 2. Phase-Schrank ==================================================
        if (profile.phase === "EARLY" || profile.phase === "MID") {
            // Home-Upgrades erst ab LATE sinnvoll
            await ns.sleep(30000);
            continue;
        }

        // === 3. Budget =========================================================
        let spendable = money - profile.safetyReserve;
        if (spendable <= 0) {
            await ns.sleep(5000);
            continue;
        }

        // === 4. Upgrade-Kosten =================================================
        let ramCost = 0;
        let coreCost = 0;

        try {
            ramCost = ns.singularity.getUpgradeHomeRamCost();
            coreCost = ns.singularity.getUpgradeHomeCoresCost();
        } catch {
            // Singularity API nicht verfügbar
            await ns.sleep(60000);
            continue;
        }

        // === 5. ROI-Berechnung =================================================
        let currentRam = ns.getServerMaxRam("home");
        let currentCores = ns.getServer("home").cpuCores;

        // RAM: Verdopplung → ~100% mehr Kapazität
        let ramGain = currentRam; // Verdopplung = +currentRam
        let ramROI = ramGain / ramCost;

        // Cores: +1 Core → ~20–25% mehr Script-Speed
        let coreGain = currentCores * 0.25;
        let coreROI = coreGain / coreCost;

        // === 6. Upgrade-Priorisierung =========================================
        if (ramROI > coreROI && spendable > ramCost) {
            ns.singularity.upgradeHomeRam();
            ns.print(`[HOME] RAM erfolgreich aufgerüstet (ROI: ${ramROI.toFixed(3)})`);
        } else if (coreROI >= ramROI && spendable > coreCost) {
            ns.singularity.upgradeHomeCores();
            ns.print(`[HOME] CPU-Core erfolgreich aufgerüstet (ROI: ${coreROI.toFixed(3)})`);
        }

        await ns.sleep(60000);
    }
}
