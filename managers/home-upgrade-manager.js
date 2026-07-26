import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Home-Upgrade-Manager aktiv...");[cite: 14]

    const safetyReserve = 100000000000; // 100 Mrd Reserve für Aktien/Corps[cite: 14]

    while (true) {
        let myMoney = ns.getServerMoneyAvailable("home");[cite: 14]
        let currentRam = ns.getServerMaxRam("home");[cite: 14]
        
        try {
            if (currentRam < 1048576) {
                let ramCost = ns.singularity.getUpgradeHomeRamCost();[cite: 14]
                if (myMoney > ramCost + safetyReserve) {
                    ns.singularity.upgradeHomeRam();[cite: 14]
                    ns.print(`[HOME] RAM erfolgreich aufgerüstet.`);[cite: 14]
                }
            }

            let coreCost = ns.singularity.getUpgradeHomeCoresCost();[cite: 14]
            if (myMoney > coreCost + safetyReserve) {
                ns.singularity.upgradeHomeCores();[cite: 14]
                ns.print(`[HOME] CPU-Core erfolgreich aufgerüstet.`);[cite: 14]
            }
        } catch (e) {
            // Singularity-API in dieser BitNode evtl. noch gesperrt
        }

        await ns.sleep(60000);[cite: 14]
    }
}