import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Home-Upgrade-Manager aktiv...");

    while (true) {
        let profile = getGameProfile(ns);
        let myMoney = ns.getServerMoneyAvailable("home");
        let currentRam = ns.getServerMaxRam("home");
        
        try {
            if (currentRam < 1048576) {
                let ramCost = ns.singularity.getUpgradeHomeRamCost();
                if (myMoney > ramCost + profile.safetyReserve) {
                    ns.singularity.upgradeHomeRam();
                    ns.print(`[HOME] RAM erfolgreich aufgerüstet.`);
                }
            }

            let coreCost = ns.singularity.getUpgradeHomeCoresCost();
            if (myMoney > coreCost + profile.safetyReserve) {
                ns.singularity.upgradeHomeCores();
                ns.print(`[HOME] CPU-Core erfolgreich aufgerüstet.`);
            }
        } catch (e) {
            // Singularity-API in dieser BitNode evtl. noch gesperrt
        }

        await ns.sleep(60000);
    }
}