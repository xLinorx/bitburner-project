import { log } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Nuke-Manager 2.0 aktiv. Scanne Netzwerk und verwalte NPC-Worker...");

    const scripts = ["D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/hack.js", "D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/grow.js", "D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/weaken.js"];

    while (true) {
        // 1. Netzwerk scannen
        let servers = ["home"];
        for (let i = 0; i < servers.length; i++) {
            let scan = ns.scan(servers[i]);
            for (let node of scan) {
                if (!servers.includes(node)) servers.push(node);
            }
        }

        // 2. Root-Rechte erlangen
        for (let node of servers) {
            if (node === "home" || node.startsWith("pserv")) continue;
            if (!ns.hasRootAccess(node)) {
                let portsNeeded = ns.getServerNumPortsRequired(node);
                let openPorts = 0;
                if (ns.fileExists("BruteSSH.exe", "home")) { ns.brutessh(node); openPorts++; }
                if (ns.fileExists("FTPCrack.exe", "home")) { ns.ftpcrack(node); openPorts++; }
                if (ns.fileExists("relaySMTP.exe", "home")) { ns.relaysmtp(node); openPorts++; }
                if (ns.fileExists("HTTPWorm.exe", "home")) { ns.httpworm(node); openPorts++; }
                if (ns.fileExists("SQLInject.exe", "home")) { ns.sqlinject(node); openPorts++; }

                if (openPorts >= portsNeeded) {
                    try { ns.nuke(node); } catch (e) {}
                }
            }
        }

        // 3. Bestes Ziel für NPC-Server ermitteln
        let playerHackingLevel = ns.getHackingLevel();
        let bestTarget = "n00dles";
        let maxMoney = 0;

        for (let node of servers) {
            if (node === "home" || node.startsWith("pserv") || node.startsWith("cloud-node")) continue;
            
            let serverHackingLevel = ns.getServerRequiredHackingLevel(node);
            let serverMoney = ns.getServerMaxMoney(node);

            if (serverHackingLevel <= playerHackingLevel && serverMoney > maxMoney && ns.hasRootAccess(node)) {
                maxMoney = serverMoney;
                bestTarget = node;
            }
        }

        // 4. NPC-Server mit Microservices füllen (ohne pservs anzufassen)
        for (let node of servers) {
            if (node === "home" || node.startsWith("pserv") || node.startsWith("cloud-node")) continue;

            if (ns.hasRootAccess(node)) {
                let freeRam = ns.getServerMaxRam(node);
                if (freeRam < 4) continue;

                // Prüfen ob Update nötig
                if (!ns.isRunning("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/hack.js", node, bestTarget)) {
                    ns.killall(node);
                    await ns.sleep(20);

                    // Skripte kopieren
                    for (let s of scripts) {
                        ns.scp(s, node, "home");
                    }

                    let hackThreads = Math.floor((freeRam * 0.10) / 1.70);
                    let growThreads = Math.floor((freeRam * 0.70) / 1.75);
                    let weakenThreads = Math.floor((freeRam * 0.20) / 1.75);

                    if (hackThreads > 0) ns.exec("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/hack.js", node, hackThreads, bestTarget);
                    if (growThreads > 0) ns.exec("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/grow.js", node, growThreads, bestTarget);
                    if (weakenThreads > 0) ns.exec("D:/Development/Bitburner/AUTOMATION/AUTOMATION/batching/weaken.js", node, weakenThreads, bestTarget);
                }
            }
        }
        await ns.sleep(30000);
    }
}