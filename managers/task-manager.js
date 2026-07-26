/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Task-Manager 3.0 (Smart Work Optimizer) aktiv...");

    // === 1. Singularity API Check ============================================
    try {
        ns.singularity.getCurrentWork();
    } catch {
        ns.print("[WARN] Singularity API nicht verfügbar. Player-Automation deaktiviert.");
        return;
    }

    const TARGET_COMPANY = "Alpha Enterprises";
    const TARGET_REP = 400000;

    const UNI_CITY = "Sector-12";
    const UNIVERSITY = "Rothman University";
    const COURSE = "Algorithms";

    while (true) {
        let work = ns.singularity.getCurrentWork();
        let profile = ns.getPlayer();
        let rep = ns.singularity.getCompanyRep(TARGET_COMPANY);

        // === 2. Phase-Schrank ==================================================
        // EARLY: Crime → Karma farmen
        if (profile.hacking < 150) {
            ns.singularity.commitCrime("Shoplift", false);
            await ns.sleep(5000);
            continue;
        }

        // MID: Hacking trainieren
        if (profile.hacking < 500) {
            if (profile.city !== UNI_CITY) ns.singularity.travelToCity(UNI_CITY);
            ns.singularity.universityCourse(UNIVERSITY, COURSE, false);
            await ns.sleep(15000);
            continue;
        }

        // LATE/ENDGAME: Company → Rep farmen
        if (rep < TARGET_REP) {
            if (!work || work.type !== "COMPANY" || work.companyName !== TARGET_COMPANY) {
                try {
                    ns.singularity.applyToCompany(TARGET_COMPANY);
                    ns.singularity.workForCompany(TARGET_COMPANY, false);
                } catch {}
            }
            await ns.sleep(15000);
            continue;
        }

        // === 3. Wenn Company-Rep erreicht → Uni für SF4/Hacking =================
        if (work && work.type === "COMPANY") {
            ns.singularity.stopAction();
        }

        work = ns.singularity.getCurrentWork();

        if (!work || work.type !== "CLASS") {
            try {
                if (profile.city !== UNI_CITY) ns.singularity.travelToCity(UNI_CITY);
                ns.singularity.universityCourse(UNIVERSITY, COURSE, false);
            } catch {}
        }

        await ns.sleep(15000);
    }
}
