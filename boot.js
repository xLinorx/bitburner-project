import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    // Start-Header
    ns.tprint("==================================================");
    ns.tprint("PROJEKT 2.0: AUTOMATION — MASTER-BOOT (v3.0.6 - CORP-FIX)");
    ns.tprint("==================================================");

    // ==========================================
    // 1. SYSTEMBEREINIGUNG (CLEANUP)
    // ==========================================
    ns.tprint("1. SYSTEMBEREINIGUNG (CLEANUP):");
    ns.tprint("   - Scanne Heimserver ('home') nach aktiven Altprozessen...");
    
    let homeScripts = ns.ps("home");
    let myName = ns.getScriptName();
    let killedCount = 0;
    for (let proc of homeScripts) {
        if (proc.filename !== myName) {
            ns.kill(proc.pid);
            killedCount++;
        }
    }
    await ns.sleep(200);
    ns.tprint(`   -> [OK] ${killedCount} alte Prozesse beendet. Ressourcenkonflikte vermieden.`);

    // ==========================================
    // 2. AUTONOMER START DER SUBSYSTEME
    // ==========================================
    ns.tprint("2. AUTONOMER START DER SUBSYSTEME:");
    ns.tprint("   - Starte 16 Kernmodule & TUI-Dashboard im Takt...");

    const services = [
        "/managers/cloud-manager.js",
        "/managers/nuke-manager.js",
        "/managers/darkweb-manager.js",
        "/managers/hacknet-manager.js",
        "/managers/contract-solver.js",
        "/managers/task-manager.js",
        "/managers/corp-manager.js",
        "/managers/gang-manager.js",
        "/managers/ascension-manager.js",
        "/managers/bladeburner-manager.js",
        "/managers/staneks-optimizer.js",
        "/managers/home-upgrade-manager.js",
        "/managers/favor-optimizer.js",
        "/trading/stock-engine.js",
        "/batching/dispatcher.js",
        "/ui/dashboard.js"
    ];

    let startedCount = 0;
    for (let service of services) {
        if (ns.fileExists(service, "home")) {
            let pid = ns.run(service);
            if (pid > 0) startedCount++;
        }
        await ns.sleep(50);
    }
    ns.tprint(`   -> [OK] ${startedCount}/${services.length} Dienste erfolgreich gestartet.`);
    ns.tprint("   -> Das TUI-Dashboard hat das Terminal einmalig für die Live-Ansicht bereinigt.");

    await ns.sleep(600);

    // ==========================================
    // 3. LIVE-SYSTEMDIAGNOSE & FRÜHSTART-LEITFADEN
    // ==========================================
    ns.tprint("--------------------------------------------------");
    ns.tprint("3. LIVE-SYSTEMDIAGNOSE & FRÜHSTART-LEITFADEN:");
    ns.tprint("--------------------------------------------------");

    // A. Ökonomischer Lagebericht & Finanz-Status
    let profile = getGameProfile(ns);
    let money = ns.getServerMoneyAvailable("home");
    let corpTargetReady = money >= 150_000_000_000;

    ns.tprint(`   -> [PROFIL] Aktive Phase: ${profile.phase.toUpperCase()}`);
    ns.tprint(`   -> [FINANZEN] Liquid: $${ns.format.number(money)} | Reserve: $${ns.format.number(profile.safetyReserve)}`);
    if (corpTargetReady) {
        ns.tprint(`   -> [CORP] Ziel von 150b erreicht: $${ns.format.number(money)} (GELD-VORAUSSETZUNG ERFÜLLT!)`);
    } else {
        ns.tprint(`   -> [CORP] Bis 150b Sparziel fehlen: $${ns.format.number(150_000_000_000 - money)}`);
    }

    // B. Aktien-Positionen Quick-Check
    try {
        if (ns.stock.hasTixApiAccess()) {
            let symbols = ns.stock.getSymbols();
            let activePositions = [];
            for (let sym of symbols) {
                let [shares, avgPrice] = ns.stock.getPosition(sym);
                if (shares > 0) {
                    let bidPrice = ns.stock.getBidPrice(sym);
                    let profitPct = ((bidPrice - avgPrice) / avgPrice) * 100;
                    activePositions.push(`${sym}: ${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(1)}%`);
                }
            }
            if (activePositions.length > 0) {
                ns.tprint(`   -> [AKTIEN] Aktive Positionen: ${activePositions.join(" | ")}`);
            } else {
                ns.tprint(`   -> [AKTIEN] Keine offenen Positionen.`);
            }
        }
    } catch (e) {
        ns.tprint(`   -> [AKTIEN] TIX-API nicht verfügbar.`);
    }

    ns.tprint("--------------------------------------------------");

    // C. Home-RAM Check
    let maxRam = ns.getServerMaxRam("home");
    if (maxRam >= 64) {
        ns.tprint(`   [OK] Home-RAM-Check: ${maxRam} GB (Ausreichend).`);
    } else {
        ns.tprint(`   [WARN] Home-RAM-Check: Nur ${maxRam} GB verfügbar! Führe 'home upgrade ram' aus.`);
    }

    // D. Tor-Router Check
    let hasTor = ns.hasTorRouter();
    if (hasTor) {
        ns.tprint("   [OK] Tor-Router-Check: Darkweb ist freigeschaltet.");
    } else {
        ns.tprint("   [INFO] Tor-Router-Check: Wird vom Manager erworben.");
    }

    // E. Port-Programme Check
    const programs = [
        { name: "BruteSSH.exe", ports: 1 },
        { name: "FTPCrack.exe", ports: 2 },
        { name: "relaySMTP.exe", ports: 3 },
        { name: "HTTPWorm.exe", ports: 4 },
        { name: "SQLInject.exe", ports: 5 }
    ];
    ns.tprint("   --- Port-Programme ---");
    for (let prog of programs) {
        if (ns.fileExists(prog.name, "home")) {
            ns.tprint(`      [OK] ${prog.name}: Vorhanden.`);
        } else {
            ns.tprint(`      [FEHLT] ${prog.name} (${prog.ports} Port(s)): Wird besorgt.`);
        }
    }

    // F. API- & Endgame-Status (JETZT INKL. CORPORATION / SF3 DIAGNOSE!)
    ns.tprint("   --- API- & Endgame-Status ---");
    
    // NEU: Corporation & SF3 Diagnose
    try {
        let hasCorp = ns.corporation.hasCorporation();
        if (hasCorp) {
            ns.tprint("      [OK] Corporation API: Corporation existiert bereits und ist aktiv.");
        } else {
            ns.tprint("      [INFO] Corporation API: SF3/API verfügbar. Corporation noch NICHT gegründet (Wartet auf Start).");
        }
    } catch (e) {
        ns.tprint("      [FEHLT / GESPERRT] Corporation API (SF3): Nicht freigeschaltet in dieser Node! (Kann Corp nicht gründen).");
    }

    try {
        let tix = ns.stock.hasTixApiAccess();
        let has4S = ns.stock.has4SDataTixApi();
        ns.tprint(tix && has4S ? "      [OK] Aktien-APIs aktiv." : "      [FEHLT] Aktien-APIs (TIX/4S).");
    } catch (e) {
        ns.tprint("      [GESPERRT] Aktien-APIs nicht verfügbar.");
    }

    try {
        ns.singularity.getFactionInvitations();
        ns.tprint("      [OK] Singularity API (SF4) aktiv.");
    } catch (e) {
        ns.tprint("      [FEHLT] Singularity API (SF4): Manuell steuern.");
    }

    try {
        ns.bladeburner.inBladeburner();
        ns.tprint("      [OK] Bladeburner API aktiv.");
    } catch (e) {
        ns.tprint("      [FEHLT] Bladeburner API: Standby.");
    }

    // ==========================================
    // 4. AUTONOMER DAUERBETRIEB & STANDBY
    // ==========================================
    ns.tprint("--------------------------------------------------");
    ns.tprint("4. AUTONOMER DAUERBETRIEB & STANDBY:");
    ns.tprint("   - Dieses Boot-Skript beendet sich jetzt.");
    ns.tprint("   - Alle Manager laufen vollautomatisch im Hintergrund weiter.");
    ns.tprint("==================================================");
    ns.tprint("SYSTEM LÄUFT. VIEL ERFOLG!");
    ns.tprint("==================================================");
}