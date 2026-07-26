import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Darkweb- & Programm-Manager aktiv...", "INFO");

    const programs = [
        "BruteSSH.exe",
        "FTPCrack.exe",
        "relaySMTP.exe",
        "HTTPWorm.exe",
        "SQLInject.exe",
        "ServerProfiler.exe",
        "Formulas.exe"
    ];

    while (true) {
        let myMoney = ns.getServerMoneyAvailable("home");
        
        // 1. Prüfen ob Tor-Router vorhanden ist
        if (!ns.hasTorRouter()) {
            let torCost = 200000; // 200k
            if (myMoney > torCost * 2) { // Nur kaufen, wenn genug Puffer da ist
                try {
                    if (ns.singularity.purchaseTor()) {
                        log(ns, "Tor-Router erfolgreich gekauft.", "SUCCESS");
                    }
                } catch (e) {
                    // Fängt den Fehler ab, falls die Singularity-API (SF4) im aktuellen BitNode noch nicht verfügbar ist
                }
            }
        } 
        // 2. Programme nacheinander kaufen (Sicherheitscheck für ns.darkweb hinzugefügt)
        else if (ns.hasTorRouter() && typeof ns.darkweb !== "undefined") {
            let purchasedAll = true;
            for (let prog of programs) {
                if (!ns.fileExists(prog, "home")) {
                    purchasedAll = false;
                    let cost = ns.darkweb.getProgramCost(prog);
                    
                    // Wir kaufen nur, wenn nach dem Kauf noch genügend Geld für den Trader da ist
                    if (myMoney > cost * 3) {
                        if (ns.darkweb.buyProgram(prog)) {
                            log(ns, `Erfolgreich erworben: ${prog}`, "SUCCESS");
                        }
                    }
                    break; // Immer der Reihe nach kaufen
                }
            }
            if (purchasedAll) {
                log(ns, "Alle Programme im Besitz. Skript beendet sich.", "INFO");
                return; // Läuft nicht endlos weiter, wenn alles da ist
            }
        }
        await ns.sleep(20000); // Sehr niedrige Frequenz schont die CPU
    }
}