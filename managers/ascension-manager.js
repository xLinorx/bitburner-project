import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Ascension- & Auto-Install-Manager 3.0 (Wirtschafts-Fix) aktiv...", "INFO");

    while (true) {
        try {
            // === 1. Singularity API Check =========================================
            if (typeof ns.singularity === "undefined") {
                await ns.sleep(60000);
                continue;
            }

            let profile = getGameProfile(ns);
            let money = ns.getServerMoneyAvailable("home");
            let factions = ns.getPlayer().factions;

            // === 2. Phase-Schrank: EARLY/MID keine Aug-Käufe ======================
            if (profile.phase === "EARLY" || profile.phase === "MID") {
                await ns.sleep(60000);
                continue;
            }

            // === 3. Budget-Schrank ===============================================
            let spendable = money - profile.safetyReserve;
            if (spendable <= 0) {
                await ns.sleep(30000);
                continue;
            }

            // === 4. Fraktions-Einladungen automatisch annehmen ====================
            let invites = ns.singularity.getFactionInvitations();
            for (let fac of invites) {
                ns.singularity.joinFaction(fac);
                log(ns, `Fraktion beigetreten: ${fac}`, "SUCCESS");
            }

            // === 5. Augmentations priorisieren ===================================
            for (let fac of factions) {
                let augs = ns.singularity.getAugmentationsFromFaction(fac);
                let owned = ns.singularity.getOwnedAugmentations(true);

                // Filter: Nur fehlende Augs
                let missing = augs.filter(a => !owned.includes(a));
                if (missing.length === 0) continue;

                // Wertvollste Augmentation bestimmen
                let bestAug = null;
                let bestRepReq = 0;

                for (let aug of missing) {
                    let repReq = ns.singularity.getAugmentationRepReq(aug);
                    if (repReq > bestRepReq) {
                        bestRepReq = repReq;
                        bestAug = aug;
                    }
                }

                if (!bestAug) continue;

                let repReq = ns.singularity.getAugmentationRepReq(bestAug);
                let rep = ns.singularity.getFactionRep(fac);
                let cost = ns.singularity.getAugmentationCost(bestAug);

                // === 6. Reputation prüfen =========================================
                if (rep < repReq) {
                    // Spendenlogik ist im Favor-Optimizer → hier kein Doppelcode
                    continue;
                }

                // === 7. Budget prüfen =============================================
                if (spendable < cost) continue;

                // === 8. Kauf durchführen ==========================================
                if (ns.singularity.purchaseAugmentation(fac, bestAug)) {
                    log(ns, `Augmentation gekauft: ${bestAug} (Fraktion: ${fac})`, "SUCCESS");
                }
            }

        } catch (e) {
            log(ns, `Ascension-Fehler: ${String(e)}`, "ERROR");
        }

        await ns.sleep(30000);
    }
}
