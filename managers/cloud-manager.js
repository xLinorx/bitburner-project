import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Cloud-Manager 2.0 (Vanilla API Fix) aktiv...");

    const SERVER_LIMIT = 25; // Vanilla Bitburner Limit
    const MAX_RAM = 1048576; // 1 TB (Vanilla Hardcap)

    while (true) {

        // Port‑2‑Lock: Börse hat Vorrang
        let port2 = ns.readPort(2);
        if (port2 !== "NULL PORT DATA" && port2 === "STOCK_ACTIVE") {
            await ns.sleep(5000);
            continue;
        }

        let myMoney = ns.getServerMoneyAvailable("home");
        let servers = ns.getPurchasedServers();

        // 1. Initialer Einkauf bis zum Limit
        if (servers.length < SERVER_LIMIT) {
            let cost = ns.getPurchasedServerCost(8);
            if (myMoney > cost) {

                // Freien Namen finden
                let i = 0;
                while (servers.includes("pserv-" + i)) i++;

                let hostname = ns.purchaseServer("pserv-" + i, 8);
                if (hostname) {
                    ns.print(`[+] Neuer Server gekauft: ${hostname} (8GB)`);
                }
            }
        }

        // 2. Lifecycle & RAM‑Verdopplung
        else {

            // Kleinsten Server finden
            let smallestServer = "";
            let smallestRam = MAX_RAM;

            for (let srv of servers) {
                let ram = ns.getServerMaxRam(srv);
                if (ram < smallestRam) {
                    smallestRam = ram;
                    smallestServer = srv;
                }
            }

            // Alle Server bereits auf Max‑RAM
            if (smallestRam >= MAX_RAM) {
                await ns.sleep(60000);
                continue;
            }

            let nextRam = smallestRam * 2;
            let upgradeCost = ns.getPurchasedServerCost(nextRam);

            if (myMoney > upgradeCost) {

                // Alten Server sauber entfernen
                ns.killall(smallestServer);
                await ns.sleep(100);

                ns.deleteServer(smallestServer);

                // Neuen Namen finden
                let i = 0;
                while (servers.includes("pserv-" + i) || ns.serverExists("pserv-" + i)) i++;

                let newName = ns.purchaseServer("pserv-" + i, nextRam);
                if (newName) {
                    ns.print(`[^] Upgrade: ${newName} läuft nun mit ${ns.formatNumber(nextRam)}GB RAM.`);
                }
            }
        }

        await ns.sleep(3000);
    }
}
