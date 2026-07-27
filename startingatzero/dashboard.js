/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.ui.openTail();
    ns.ui.resizeTail(380, 480);

    while (true) {
        ns.clear();
        
        let cash = ns.getServerMoneyAvailable("home");
        let hackLevel = ns.getHackingLevel();
        let homeMaxRam = ns.getServerMaxRam("home");
        let homeUsedRam = ns.getServerUsedRam("home");

        // 1. Hacknet Info
        let hacknetIncome = 0;
        let numNodes = ns.hacknet.numNodes();
        for (let i = 0; i < numNodes; i++) {
            hacknetIncome += ns.hacknet.getNodeStats(i).production;
        }

        // 2. Stock Info
        let hasWse = ns.stock.hasWseAccount();
        let hasTix = ns.stock.hasTixApiAccess();
        let stockVal = 0;
        let stockCost = 0;
        let activePos = 0;

        if (hasTix) {
            for (let sym of ns.stock.getSymbols()) {
                let [shares, avgPrice] = ns.stock.getPosition(sym);
                if (shares > 0) {
                    stockVal += shares * ns.stock.getBidPrice(sym);
                    stockCost += shares * avgPrice;
                    activePos++;
                }
            }
        }

        let totalNetWorth = cash + stockVal;
        let stockProfit = stockVal - stockCost;
        let stockRoi = stockCost > 0 ? (stockProfit / stockCost) * 100 : 0;

        // 3. Port-Programme
        let programs = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
        let ownedProgsCount = 0;
        for (let p of programs) {
            if (ns.fileExists(p, "home")) ownedProgsCount++;
        }

        // 4. Ausgabe zeichnen (Text-basiert)
        ns.print("=========================================");
        ns.print("   STARTING AT ZERO: EARLY DASHBOARD");
        ns.print("=========================================");
        ns.print(` Hacking-Level: ${hackLevel}`);
        ns.print(` Home RAM    : ${homeUsedRam.toFixed(1)} / ${homeMaxRam} GB`);
        ns.print(` Bargeld     : $${ns.format.number(cash)}`);
        ns.print(` Gesamtwert  : $${ns.format.number(totalNetWorth)}`);
        ns.print("-----------------------------------------");
        ns.print(` Hacknet Nodes : ${numNodes}`);
        ns.print(` Hacknet Prod  : $${ns.format.number(hacknetIncome)}/s`);
        ns.print("-----------------------------------------");
        ns.print(` Port-Programme: ${ownedProgsCount} / 5`);
        ns.print(` WSE Account   : ${hasWse ? "JA" : "NEIN"}`);
        ns.print(` TIX API Access: ${hasTix ? "JA" : "NEIN"}`);
        ns.print("-----------------------------------------");
        if (hasTix) {
            ns.print(` Aktive Aktien : ${activePos}`);
            ns.print(` Depotwert     : $${ns.format.number(stockVal)}`);
            ns.print(` Buchgewinn    : $${ns.format.number(stockProfit)} (${stockRoi.toFixed(1)}% ROI)`);
        } else {
            ns.print(" Aktien-Handel: Wartet auf TIX API");
        }
        ns.print("=========================================");

        await ns.sleep(1000);
    }
}
