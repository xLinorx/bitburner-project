import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Darkweb-Manager 3.0 (Wirtschafts-Fix) aktiv...", "INFO");

    // Programme nach strategischem Wert sortiert
    const PROGRAMS = [
        "BruteSSH.exe",      // Port 1 – Early Game Pflicht
        "FTPCrack.exe",      // Port 2 – Early Game Pflicht
        "relaySMTP.exe",     // Port 3
        "HTTPWorm.exe",      // Port 4
        "SQLInject.exe",     // Port 5
        "ServerProfiler.exe",// Optional
        "Formulas.exe"       // Optional (nur für Stock Engine)
    ];

    while (true) {
        let profile = getGameProfile(ns);
        let money = ns.getServerMoneyAvailable("home");

        // === 1. Phase-Schrank ==================================================
        // EARLY: Nur Port-Programme kaufen
        let allowOptional = !(profile.phase === "EARLY");

        // === 2. Budget-Schrank =================================================
        let spendable = money - profile.safetyReserve;
        if (spendable <= 0) {
            await ns.sleep(20000);
            continue;
        }

        // === 3. Tor-Router kaufen ==============================================
        if (!ns.hasTorRouter()) {
            let torCost = 200000;
            if (spendable > torCost * 2) {
                try {
                    if (ns.singularity.purchaseTor()) {
                        log(ns, "Tor-Router erfolgreich gekauft.", "SUCCESS");
                    }
                } catch {
                    // API evtl. nicht verfügbar
                }
            }
            await ns.sleep(20000);
            continue;
        }

        // === 4. Programme kaufen ===============================================
        if (typeof ns.darkweb !== "undefined") {

            for (let prog of PROGRAMS) {

                // Optional Programme erst ab MID/LATE
                if (!allowOptional && (prog === "ServerProfiler.exe" || prog === "Formulas.exe")) {
                    continue;
                }

                if (!ns.fileExists(prog, "home")) {
                    let cost = ns.darkweb.getProgramCost(prog);

                    // Sicherheitslimit: Nur kaufen, wenn nach Kauf noch Reserve übrig bleibt
                    if (spendable > cost * 2) {
                        if (ns.darkweb.buyProgram(prog)) {
                            log(ns, `Programm gekauft: ${prog}`, "SUCCESS");
                        }
                    }

                    // Immer nur EIN Programm pro Tick kaufen
                    break;
                }
            }

            // Wenn alle Programme vorhanden → Skript beenden
            let allOwned = PROGRAMS.every(p => ns.fileExists(p, "home"));
            if (allOwned) {
                log(ns, "Alle Darkweb-Programme vorhanden. Manager beendet sich.", "INFO");
                return;
            }
        }

        await ns.sleep(20000);
    }
}
