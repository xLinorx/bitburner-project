import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Sleeve-Manager 3.0 aktiv...", "INFO");

    while (true) {
        try {
            if (typeof ns.sleeve === "undefined") {
                await ns.sleep(60000);
                continue;
            }

            const num = ns.sleeve.getNumSleeves();

            for (let i = 0; i < num; i++) {
                const s = ns.sleeve.getSleeve(i);

                // === 1. Shock & Sync =================================================
                if (s.shock > 0) {
                    ns.sleeve.setToShockRecovery(i);
                    continue;
                }
                if (s.sync < 100) {
                    ns.sleeve.setToSynchronize(i);
                    continue;
                }

                // === 2. Crime-Sleeves (Early/Mid Game) ==============================
                // Wenn Hacking < 500 → Crime bringt mehr Karma & Geld
                if (ns.getPlayer().hacking < 500) {
                    ns.sleeve.setToCommitCrime(i, "Mug");
                    continue;
                }

                // === 3. Company-Work (wenn Corp Rep gebraucht wird) =================
                const corpSignal = ns.peek(4);
                if (corpSignal && corpSignal.includes("CORP_NEED_REP")) {
                    try {
                        ns.sleeve.setToCompanyWork(i, "Alpha Enterprises", "Software");
                        continue;
                    } catch {}
                }

                // === 4. Faction-Work (wenn Favor-Optimizer Rep braucht) =============
                const facs = ns.getPlayer().factions;
                if (facs.length > 0) {
                    const targetFac = facs[0]; // einfachste stabile Strategie
                    try {
                        ns.sleeve.setToFactionWork(i, targetFac, "Hacking");
                        continue;
                    } catch {}
                }

                // === 5. Hacking-Training (Late/Endgame) =============================
                try {
                    ns.sleeve.setToUniversityCourse(i, "Rothman University", "Algorithms");
                } catch {
                    ns.sleeve.setToGymWorkout(i, "Powerhouse Gym", "Agility");
                }
            }

        } catch (e) {
            // Fehler im Sleeve-System ignorieren
        }

        await ns.sleep(15000);
    }
}
