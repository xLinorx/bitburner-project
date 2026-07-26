import { log } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Sleeve-Manager aktiv...", "INFO");

    while (true) {
        try {
            // Prüfen ob das Sleeve-Subsystem im Spiel freigeschaltet ist
            if (typeof ns.sleeve === "undefined") {
                await ns.sleep(60000);
                continue;
            }

            let numSleeves = ns.sleeve.getNumSleeves();
            for (let i = 0; i < numSleeves; i++) {
                let stats = ns.sleeve.getSleeve(i);

                // Priorität 1: Shock abbauen & Synchronisation maximieren
                if (stats.shock > 0) {
                    ns.sleeve.setToShockRecovery(i);
                    continue;
                }
                if (stats.sync < 100) {
                    ns.sleeve.setToSynchronize(i);
                    continue;
                }

                // Priorität 2: Sinnvolle Aufgaben im regulären Betrieb zugewiesen
                // Z. B. Hacking trainieren oder für Fraktionen arbeiten
                ns.sleeve.setToGymWorkout(i, "Powerhouse Gym", "Hacking");
            }
        } catch (e) {
            // Stille Fehlerbehandlung im Early-Game
        }

        await ns.sleep(15000);
    }
}