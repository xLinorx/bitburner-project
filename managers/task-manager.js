/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Task-Manager (Player-Control) startet...");

    // ==========================================
    // 1. API-CHECK: Haben wir Singularity (SF4)?
    // ==========================================
    try {
        // Wir testen vorsichtig, ob die API erreichbar ist
        ns.singularity.getCurrentWork();
    } catch (e) {
        ns.print("[WARN] Singularity API (SF4) nicht verfügbar.");
        ns.print("[INFO] Player-Automatisierung ist deaktiviert. Du musst manuell arbeiten/studieren.");
        ns.tprint("[WARN] Task-Manager: Singularity (SF4) fehlt. Beende Player-Automatisierung für diesen Node.");
        return; // Skript beendet sich sauber selbst, kein roter Error-Screen mehr!
    }

    // ==========================================
    // 2. AUTONOMER BETRIEB (Falls SF4 vorhanden)
    // ==========================================
    ns.print("[OK] Singularity API aktiv. Übernehme Charakter-Steuerung...");
    const TARGET_REP = 400000;
    const COMPANY = "Alpha Enterprises";
    const UNIVERSITY = "Rothman University";
    const COURSE = "Algorithms";

    while (true) {
        let work = ns.singularity.getCurrentWork();
        let currentRep = ns.singularity.getCompanyRep(COMPANY);

        if (currentRep < TARGET_REP) {
            if (!work || work.type !== "COMPANY" || work.companyName !== COMPANY) {
                try {
                    ns.singularity.applyToCompany(COMPANY);
                    ns.singularity.workForCompany(COMPANY, false);
                } catch (e) {}
            }
        } else {
            if (work && work.type === "COMPANY" && work.companyName === COMPANY) {
                ns.singularity.stopAction();
            }
            work = ns.singularity.getCurrentWork();
            if (!work || work.type !== "CLASS") {
                try {
                    if (ns.getPlayer().city !== "Sector-12") ns.singularity.travelToCity("Sector-12");
                    ns.singularity.universityCourse(UNIVERSITY, COURSE, false);
                } catch (e) {}
            }
        }
        await ns.sleep(15000); 
    }
}