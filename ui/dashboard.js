import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    
    ns.ui.clearTerminal();
    ns.ui.openTail();
    ns.ui.resizeTail(560, 780);

    while (true) {
        let profile = getGameProfile(ns);
        let cash = ns.getServerMoneyAvailable("home");
        let hackLevel = ns.getHackingLevel();
        let pservers = ns.cloud.getServerNames(); 
        
        // 1. Aktien-Portfolio-Wert, Kosten & ROI berechnen
        let stockPortfolioValue = 0;
        let totalStockCost = 0;
        let activeStocks = 0;
        try {
            if (ns.stock.hasTixApiAccess()) {
                for (let sym of ns.stock.getSymbols()) {
                    let [shares, avgPrice] = ns.stock.getPosition(sym);
                    if (shares > 0) {
                        let currentVal = shares * ns.stock.getBidPrice(sym);
                        let costVal = shares * avgPrice;
                        stockPortfolioValue += currentVal;
                        totalStockCost += costVal;
                        activeStocks++;
                    }
                }
            }
        } catch (e) {}

        let stockProfit = stockPortfolioValue - totalStockCost;
        let stockRoi = totalStockCost > 0 ? (stockProfit / totalStockCost) * 100 : 0;
        let totalNetWorth = cash + stockPortfolioValue;

        // 2. Passiv-Einkommen berechnen
        let hacknetIncomeSec = 0;
        try {
            let numNodes = ns.hacknet.numNodes();
            for (let i = 0; i < numNodes; i++) {
                hacknetIncomeSec += ns.hacknet.getNodeStats(i).production;
            }
        } catch (e) {}

        let corpIncomeSec = 0;
        try {
            if (ns.corporation.hasCorporation()) {
                let corp = ns.corporation.getCorporation();
                corpIncomeSec = corp.revenue - corp.expenses;
            }
        } catch (e) {}

        let totalPassiveIncome = hacknetIncomeSec + corpIncomeSec;

        // 3. Netzwerk-Scan für offene Coding Contracts (.cct)
        let availableContracts = 0;
        let scannedServers = [];
        try {
            let scanned = new Set(["home"]);
            let queue = ["home"];
            scannedServers = ["home"];
            while (queue.length > 0) {
                let curr = queue.shift();
                for (let neighbor of ns.scan(curr)) {
                    if (!scanned.has(neighbor)) {
                        scanned.add(neighbor);
                        queue.push(neighbor);
                        scannedServers.push(neighbor);
                    }
                }
            }
            for (let srv of scannedServers) {
                let ccts = ns.ls(srv, ".cct");
                availableContracts += ccts.length;
            }
        } catch (e) {}

        // 4. Solver-Statistiken aus optionaler Log-Datei einlesen (falls vom Solver geschrieben)
        let solvedCount = 0;
        let failedCount = 0;
        try {
            if (ns.fileExists("/data/contract-stats.json", "home")) {
                let stats = JSON.parse(ns.read("/data/contract-stats.json"));
                solvedCount = stats.solved || 0;
                failedCount = stats.failed || 0;
            }
        } catch (e) {}

        // 5. Programme & Tools auf Home prüfen
        let hasFormulas = ns.fileExists("Formulas.exe", "home");
        let hasAutolink = ns.fileExists("AutoLink.exe", "home");
        let hasNuke = ns.fileExists("NUKE.exe", "home");
        let hasBrute = ns.fileExists("BruteSSH.exe", "home");
        let hasFtp = ns.fileExists("FTPCrack.exe", "home");
        let hasRelay = ns.fileExists("relaySMTP.exe", "home");
        let hasHttp = ns.fileExists("HTTPWorm.exe", "home");
        let hasSql = ns.fileExists("SQLInject.exe", "home");
        let hasServerProfiler = ns.fileExists("ServerProfiler.exe", "home");
        let hasDeepscan1 = ns.fileExists("DeepscanV1.exe", "home");
        let hasDeepscan2 = ns.fileExists("DeepscanV2.exe", "home");

        // 6. Markt-APIs prüfen
        let hasTix = false;
        let has4s = false;
        try { hasTix = ns.stock.hasTixApiAccess(); } catch (e) {}
        try { has4s = ns.stock.has4SDataTixApi(); } catch (e) {}

        // 7. Source-Files (SF3, SF4) via Singularity prüfen
        let sf3Lvl = 0;
        let sf4Lvl = 0;
        try {
            let ownedSfs = ns.singularity.getOwnedSourceFiles();
            for (let sf of ownedSfs) {
                if (sf.n === 3) sf3Lvl = sf.lvl;
                if (sf.n === 4) sf4Lvl = sf.lvl;
            }
        } catch (e) {}

        // 8. Home-Server Hardware-Metriken
        let homeServer = ns.getServer("home");
        let homeMaxRam = homeServer.maxRam;
        let homeUsedRam = homeServer.ramUsed;
        let homeCores = homeServer.cpuCores;
        let homeRamPercent = ((homeUsedRam / homeMaxRam) * 100).toFixed(1);

        // 9. Cloud RAM & Skript-Zählung nach Tiers
        let totalRam = 0;
        let usedRam = 0;
        for (let srv of pservers) {
            totalRam += ns.getServerMaxRam(srv);
            usedRam += ns.getServerUsedRam(srv);
        }

        let homeScripts = 0;
        try { homeScripts = ns.ps("home").length; } catch (e) {}

        let cloudScripts = 0;
        try {
            for (let srv of pservers) {
                cloudScripts += ns.ps(srv).length;
            }
        } catch (e) {}

        let otherScripts = 0;
        try {
            let pserverSet = new Set(pservers);
            for (let srv of scannedServers) {
                if (srv !== "home" && !pserverSet.has(srv)) {
                    otherScripts += ns.ps(srv).length;
                }
            }
        } catch (e) {}

        ns.clearLog();
        ns.print("==================================================");
        ns.print("       PROJEKT 2.0: AUTOMATION - DASHBOARD        ");
        ns.print("==================================================");
        ns.print(` Spielphase:       ${profile.phase.toUpperCase()} (Reserve: ${ns.format.number(profile.safetyReserve)})`);
        ns.print(` Nettovermögen:    ${ns.format.number(totalNetWorth)} Credits`);
        ns.print(`   ├── Cash:       ${ns.format.number(cash)}`);
        ns.print(`   └── Aktien (${activeStocks}x): ${ns.format.number(stockPortfolioValue)}`);
        ns.print(`       └── ROI:    ${stockRoi >= 0 ? "+" : ""}${stockRoi.toFixed(2)}% (${stockProfit >= 0 ? "+" : ""}${ns.format.number(stockProfit)})`);
        ns.print("--------------------------------------------------");
        ns.print(` Passiv-Einkommen: ${ns.format.number(totalPassiveIncome)} /sec`);
        ns.print(`   ├── Hacknet:    ${ns.format.number(hacknetIncomeSec)} /sec`);
        ns.print(`   └── Corp:       ${ns.format.number(corpIncomeSec)} /sec`);
        ns.print("--------------------------------------------------");
        ns.print(" Coding Contracts (Solver):");
        ns.print(`   ├── Verfügbar:  [ ${availableContracts} im Netzwerk ]`);
        ns.print(`   └── Statistik:  [ Erfolgreich: ${solvedCount} | Fehler: ${failedCount} ]`);
        ns.print("--------------------------------------------------");
        ns.print(" APIs & Ingame-Fortschritt:");
        ns.print(`   ├── TIX API:    [ ${hasTix ? "✔ ACTIVE" : "❌ MISSING"} ] (5B WSE)`);
        ns.print(`   ├── 4S API:     [ ${has4s ? "✔ ACTIVE" : "❌ MISSING"} ] (25B WSE)`);
        ns.print(`   ├── SF3 (Corp): [ Lvl ${sf3Lvl} ]`);
        ns.print(`   └── SF4 (Sing): [ Lvl ${sf4Lvl} ]`);
        ns.print("--------------------------------------------------");
        ns.print(" Programme & Tools (Home):");
        ns.print(`   ├── Formulas:   [ ${hasFormulas ? "✔" : "❌"} ]`);
        ns.print(`   ├── AutoLink:   [ ${hasAutolink ? "✔" : "❌"} ]`);
        ns.print(`   ├── ServerProf: [ ${hasServerProfiler ? "✔" : "❌"} ]`);
        ns.print(`   ├── Deepscan V1:[ ${hasDeepscan1 ? "✔" : "❌"} ]`);
        ns.print(`   ├── Deepscan V2:[ ${hasDeepscan2 ? "✔" : "❌"} ]`);
        ns.print(`   └── Port Tools: [SSH:${hasBrute?"✔":"❌"} FTP:${hasFtp?"✔":"❌"} SMTP:${hasRelay?"✔":"❌"} HTTP:${hasHttp?"✔":"❌"} SQL:${hasSql?"✔":"❌"}]`);
        ns.print("--------------------------------------------------");
        ns.print(` Hacking-Level:    ${hackLevel}`);
        ns.print(` Home Hardware:    ${homeUsedRam} / ${homeMaxRam} GB (${homeRamPercent}%) | ${homeCores} Cores`);
        ns.print(` Cloud-Cluster:    ${pservers.length} Server (${ns.format.number(usedRam)} / ${ns.format.number(totalRam)} GB RAM)`);
        ns.print("--------------------------------------------------");
        ns.print(" Prozess-Übersicht (Aktive Skripte):");
        ns.print(`   ├── Home Server:  ${homeScripts} Skripte`);
        ns.print(`   ├── Cloud Server: ${cloudScripts} Skripte (${pservers.length} Instanzen)`);
        ns.print(`   └── Andere Server:${otherScripts} Skripte`);
        ns.print("==================================================");

        await ns.sleep(1000);
    }
}