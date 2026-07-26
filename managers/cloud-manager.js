import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Cloud-Manager 2.0 aktiv. Überwache pserv-Infrastruktur...");[cite: 7]

    const ramLimit = ns.cloud.getRamLimit();[cite: 7]
    const serverLimit = ns.cloud.getServerLimit();[cite: 7]

    while (true) {
        let currentServers = ns.cloud.getServerNames();[cite: 7]
        let myMoney = ns.getServerMoneyAvailable("home");[cite: 7]

        // 1. Initialer Einkauf bis zum Limit (25 Server)
        if (currentServers.length < serverLimit) {[cite: 7]
            let cost = ns.cloud.getServerCost(8);[cite: 7]
            if (myMoney > cost) {
                let i = 0;
                while (currentServers.includes("pserv-" + i) || ns.serverExists("pserv-" + i)) {[cite: 7]
                    i++;
                }
                
                let hostname = ns.cloud.purchaseServer("pserv-" + i, 8);[cite: 7]
                if (hostname) {
                    ns.print(`[+] Neuer Server: ${hostname} (8GB)`);[cite: 7]
                }
            }
        } 
        // 2. Lifecycle-Management & RAM-Verdopplung
        else {
            let smallestRam = ramLimit;[cite: 7]
            let smallestServer = "";[cite: 7]
            
            for (let srv of currentServers) {
                let srvRam = ns.getServerMaxRam(srv);[cite: 7]
                if (srvRam <= smallestRam) {
                    smallestRam = srvRam;
                    smallestServer = srv;
                }
            }

            if (smallestRam >= ramLimit) {
                // Alle Server haben Max-RAM erreicht
                await ns.sleep(60000);[cite: 7]
                continue;
            }

            let nextRam = smallestRam * 2;[cite: 7]
            let upgradeCost = ns.cloud.getServerCost(nextRam);[cite: 7]

            if (myMoney > upgradeCost) {
                ns.killall(smallestServer);[cite: 7]
                await ns.sleep(100); // RAM-Freigabe erzwingen[cite: 7]
                
                let deleteSuccess = ns.cloud.deleteServer(smallestServer);[cite: 7]
                if (!deleteSuccess) {
                    await ns.sleep(1000);[cite: 7]
                    continue;
                }

                // Sauberen Namen generieren
                let i = 0;
                while (currentServers.includes("pserv-" + i) || ns.serverExists("pserv-" + i)) {[cite: 7]
                    i++;
                }
                let upgradeName = "pserv-" + i;[cite: 7]

                let newName = ns.cloud.purchaseServer(upgradeName, nextRam);[cite: 7]
                if (newName) {
                    ns.print(`[^] Upgrade: ${newName} läuft nun mit ${ns.format.number(nextRam)}GB RAM.`);[cite: 7]
                }
            }
        }
        await ns.sleep(3000);[cite: 7]
    }
}