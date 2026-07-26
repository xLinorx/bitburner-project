import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Favor-Optimizer 3.0 (Wirtschafts-Fix) aktiv...", "INFO");

    while (true) {
        let profile = getGameProfile(ns);
        let money = ns.getServerMoneyAvailable("home");

        // === 1. Phase-Schrank: EARLY/MID keine Spenden ==========================
        if (profile.phase === "EARLY" || profile.phase === "MID") {
            await ns.sleep(60000);
            continue;
        }

        // === 2. Budget-Schrank ==================================================
        let spendable = money - profile.safetyReserve;
        if (spendable <= 0) {
            await ns.sleep(60000);
            continue;
        }

        // === 3. Fraktionen laden ================================================
        let factions = ns.getPlayer().factions;

        for (let fac of factions) {
            try {
                let favor = ns.singularity.getFactionFavor(fac);
                let rep = ns.singularity.getFactionRep(fac);

                // --- Spenden erst ab 150 Favor ----------------------------------
                if (favor < 150) continue;

                // --- Augmentations prüfen ---------------------------------------
                let augs = ns.singularity.getAugmentationsFromFaction(fac);
                let owned = ns.singularity.getOwnedAugmentations(true);

                // Filter: Nur Augs, die wir NICHT besitzen
                let missing = augs.filter(a => !owned.includes(a));
                if (missing.length === 0) continue;

                // --- Wertvollste Augmentation bestimmen -------------------------
                let bestAug = null;
                let bestCost = 0;

                for (let aug of missing) {
                    let repReq = ns.singularity.getAugmentationRepReq(aug);
                    if (repReq > bestCost) {
                        bestCost = repReq;
                        bestAug = aug;
                    }
                }

                // --- Prüfen, ob Spende sinnvoll ist -----------------------------
                if (!bestAug) continue;

                let repReq = ns.singularity.getAugmentationRepReq(bestAug);

                // Wenn wir schon genug Rep haben → keine Spende nötig
                if (rep >= repReq) continue;

                // --- Spendenbetrag berechnen ------------------------------------
                // Spenden bringen 1e6 Rep pro 1e6 Geld (ohne Favor-Bonus)
                // Mit Favor-Bonus: RepGain = donation * (favor + 100) / 100
                let repGainPerDollar = (favor + 100) / 100;

                let neededRep = repReq - rep;
                let neededDonation = neededRep / repGainPerDollar;

                // Sicherheitslimit: Nicht mehr als 10% des verfügbaren Geldes
                let maxDonation = spendable * 0.10;
                let donation = Math.min(neededDonation, maxDonation);

                if (donation > 0) {
                    ns.singularity.donateToFaction(fac, donation);
                    log(ns, `[FACTION] Spende an ${fac}: ${ns.formatNumber(donation)} (Aug: ${bestAug})`, "SUCCESS");
                }

            } catch (e) {
                // Singularity API Fallback
            }
        }

        await ns.sleep(60000);
    }
}
