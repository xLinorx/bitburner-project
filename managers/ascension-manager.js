import { log } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/logger.js";
import { getGameProfile } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Ascension- & Auto-Install-Manager aktiv...", "INFO");

    while (true) {
        try {
            // Prüfen ob Singularity-API verfügbar ist (Early-Game Schutz)
            if (typeof ns.singularity === "undefined") {
                await ns.sleep(60000);
                continue;
            }

            let profile = getGameProfile(ns);
            let factions = ns.getPlayer().factions;
            let myMoney = ns.getServerMoneyAvailable("home");

            // 1. Fraktions-Einladungen automatisch annehmen
            let invitations = ns.singularity.getFactionInvitations();
            for (let fac of invitations) {
                ns.singularity.joinFaction(fac);
                log(ns, `Fraktion beigetreten: ${fac}`, "SUCCESS");
            }

            // 2. Prüfen ob kaufbare Augmentationen vorliegen
            let targetFaction = factions[0]; // Beispiel: Primäre Fraktion prüfen
            if (targetFaction) {
                let augs = ns.singularity.getAugmentationsFromFaction(targetFaction);
                let ownedAugs = ns.singularity.getOwnedAugmentations(true);

                // Wenn Geld und Voraussetzungen da sind, Augmentationen und deren Voraussetzungen kaufen
                for (let aug of augs) {
                    if (!ownedAugs.includes(aug)) {
                        let cost = ns.singularity.getAugmentationCost(aug);
                        let repCost = ns.singularity.getAugmentationRepReq(aug);
                        let playerRep = ns.singularity.getFactionRep(targetFaction);

                        if (myMoney > cost + profile.safetyReserve && playerRep >= repCost) {
                            if (ns.singularity.purchaseAugmentation(targetFaction, aug)) {
                                log(ns, `Augmentation erfolgreich erworben: ${aug}`, "SUCCESS");
                            }
                        }
                    }
                }
            }

        } catch (e) {
            // Fängt fehlende API-Rechte im Early-Game ab
        }

        await ns.sleep(30000);
    }
}