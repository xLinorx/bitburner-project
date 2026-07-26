import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Cloud-Manager 2.0 aktiv. Überwache pserv-Infrastruktur...");

    const ramLimit = ns.cloud.getRamLimit();
    const serverLimit = ns.cloud.getServerLimit();

    while (true) {
        let profile = getGameProfile(ns);

        // Priority-Lock: Wenn die Börse aktiv gute Trades sieht, pausieren wir den Einkauf
        if (ns.peek(2) === "STOCK_ACTIVE") {
            ns.print("[PRIORITY-LOCK] Stock-Engine hat Vorrang. Pausiere P-Server Käufe...");
            await ns.sleep(3000);
            continue;
        }

        let currentServers = ns.cloud.getServerNames();
        let myMoney = ns.getServerMoneyAvailable("home");
        
        // BUDGET-SPLITTING: Maximal 10% des Überschusses für Server-Upgrades nutzen
        let surplus = Math.max(0, myMoney - profile.safetyReserve);
        let spendableMoney = surplus * 0.10;

        // 1. Initialer Einkauf bis zum Limit (25 Server)
        if (currentServers.length < serverLimit) {
            let cost = ns.cloud.getServerCost(8);
            if (spendableMoney > cost) {
                let i = 0;
                while (currentServers.includes("pserv-" + i) || ns.serverExists("pserv-" + i)) {
                    i++;
                }
                
                let hostname = ns.cloud.purchaseServer("pserv-" + i, 8);
                if (hostname) {
                    ns.print(`[+] Neuer Server: ${hostname} (8GB)`);
                }
            }
        } 
        // 2. Lifecycle-Management & RAM-Verdopplung
        else {
            let smallestRam = ramLimit;
            let smallestServer = "";
            
            for (let srv of currentServers) {
                let srvRam = ns.getServerMaxRam(srv);
                if (srvRam <= smallestRam) {
                    smallestRam = srvRam;
                    smallestServer = srv;
                }
            }

            if (smallestRam >= ramLimit) {
                await ns.sleep(60000);
                continue;
            }

            let nextRam = smallestRam * 2;
            let upgradeCost = ns.cloud.getServerCost(nextRam);

            if (spendableMoney > upgradeCost) {
                ns.killall(smallestServer);
                await ns.sleep(100);
                
                let deleteSuccess = ns.cloud.deleteServer(smallestServer);
                if (!deleteSuccess) {
                    await ns.sleep(1000);
                    continue;
                }

                let i = 0;
                while (currentServers.includes("pserv-" + i) || ns.serverExists("pserv-" + i)) {
                    i++;
                }
                let upgradeName = "pserv-" + i;

                let newName = ns.cloud.purchaseServer(upgradeName, nextRam);
                if (newName) {
                    ns.print(`[^] Upgrade: ${newName} läuft nun mit ${ns.format.number(nextRam)}GB RAM.`);
                }
            }
        }
        await ns.sleep(3000);
    }
}