import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Favor- & Spenden-Optimizer (Dynamisch) aktiv...", "INFO");

    while (true) {
        let profile = getGameProfile(ns);
        let factions = ns.getPlayer().factions;
        let myMoney = ns.getServerMoneyAvailable("home");

        for (let faction of factions) {
            try {
                let favor = ns.singularity.getFactionFavor(faction);
                if (favor >= 150 && myMoney > profile.safetyReserve * 2) {
                    let donationAmount = profile.donationStep;
                    ns.singularity.donateToFaction(faction, donationAmount);
                    
                    log(ns, `[FACTION] Spende an ${faction} in Höhe von ${ns.formatNumber(donationAmount)} getätigt.`, "SUCCESS");
                }
            } catch (e) {
                // Singularity API Fallback
            }
        }

        await ns.sleep(60000);
    }
}