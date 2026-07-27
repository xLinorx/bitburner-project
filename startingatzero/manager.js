/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("STARTING AT ZERO: Bootstrapping early game...");

    const payload = "/startingatzero/early-hack.js";

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
            if (node === "home" || node.startsWith("pserv") || node.startsWith("cloud-node")) continue;
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

        // 3. Bestes Ziel für NPC-Server ermitteln (nach Hacking-Level und max. Geld)
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

        // 4. NPC-Server mit Payload bespielen
        for (let node of servers) {
            if (node === "home" || node.startsWith("pserv") || node.startsWith("cloud-node")) continue;

            if (ns.hasRootAccess(node)) {
                let maxRam = ns.getServerMaxRam(node);
                if (maxRam < 2) continue; // Zu wenig RAM für irgendetwas

                // Prüfen ob das Skript bereits mit dem richtigen Ziel läuft
                if (!ns.isRunning(payload, node, bestTarget)) {
                    ns.killall(node);
                    await ns.sleep(20);

                    // Kopieren und ausführen
                    ns.scp(payload, node, "home");
                    let threads = Math.floor(maxRam / 2.45);
                    if (threads > 0) {
                        ns.exec(payload, node, threads, bestTarget);
                    }
                }
            }
        }

        // 5. HACKNET AUTOMATION
        let maxNodes = 12;
        let maxLevel = 80;
        let maxHacknetRam = 16;
        let maxCores = 2;

        let numNodes = ns.hacknet.numNodes();
        let myMoney = ns.getServerMoneyAvailable("home");

        // Neuen Node kaufen
        if (numNodes < maxNodes) {
            let purchaseCost = ns.hacknet.getPurchaseNodeCost();
            if (myMoney > purchaseCost * 2) {
                if (ns.hacknet.purchaseNode() !== -1) {
                    numNodes = ns.hacknet.numNodes();
                }
            }
        }

        // Upgrades für bestehende Nodes kaufen
        for (let i = 0; i < numNodes; i++) {
            myMoney = ns.getServerMoneyAvailable("home");
            let nodeStats = ns.hacknet.getNodeStats(i);

            // Level upgrade
            if (nodeStats.level < maxLevel) {
                let cost = ns.hacknet.getLevelUpgradeCost(i, 1);
                if (myMoney > cost * 2) {
                    ns.hacknet.upgradeLevel(i, 1);
                }
            }

            // RAM upgrade
            if (nodeStats.ram < maxHacknetRam) {
                let cost = ns.hacknet.getRamUpgradeCost(i, 1);
                if (myMoney > cost * 2) {
                    ns.hacknet.upgradeRam(i, 1);
                }
            }

            // Cores upgrade
            if (nodeStats.cores < maxCores) {
                let cost = ns.hacknet.getCoreUpgradeCost(i, 1);
                if (myMoney > cost * 2) {
                    ns.hacknet.upgradeCore(i, 1);
                }
            }
        }

        // 6. SINGULARITY-HELPER ASYNCHRON STARTEN
        let homeMaxRam = ns.getServerMaxRam("home");
        let homeUsedRam = ns.getServerUsedRam("home");
        let freeRam = homeMaxRam - homeUsedRam;

        if (ns.fileExists("/startingatzero/singularity-helper.js", "home")) {
            if (!ns.isRunning("/startingatzero/singularity-helper.js", "home")) {
                if (freeRam >= 6.1) {
                    ns.exec("/startingatzero/singularity-helper.js", "home", 1);
                    freeRam -= 6.1; // Aktualisiere verbleibenden RAM für nachfolgende Skripte
                } else if (homeMaxRam < 16) {
                    ns.print("INFO: Home-RAM < 16GB. Starte singularity-helper.js nicht automatisch.");
                    ns.print("Führe 'run startingatzero/singularity-helper.js' manuell aus (ggf. andere Skripte beenden).");
                }
            }
        }

        // 6b. EARLY STOCK TRADER STARTEN (ab 16GB Home-RAM und 7.3GB freiem RAM)
        if (ns.fileExists("/startingatzero/early-stock.js", "home")) {
            if (!ns.isRunning("/startingatzero/early-stock.js", "home")) {
                if (homeMaxRam >= 16 && freeRam >= 7.3) {
                    ns.exec("/startingatzero/early-stock.js", "home", 1);
                    freeRam -= 7.3;
                }
            }
        }

        // 6c. EARLY DASHBOARD STARTEN (ab 16GB Home-RAM und 2.4GB freiem RAM)
        if (ns.fileExists("/startingatzero/dashboard.js", "home")) {
            if (!ns.isRunning("/startingatzero/dashboard.js", "home")) {
                if (homeMaxRam >= 16 && freeRam >= 2.4) {
                    ns.exec("/startingatzero/dashboard.js", "home", 1);
                    freeRam -= 2.4;
                }
            }
        }

        // 7. DIAGNOSE FÜR DAS HAUPTSYSTEM (boot.js)
        if (homeMaxRam >= 64) {
            ns.print("==================================================");
            ns.print("BEREIT FÜR HAUPTSYSTEM: Home-RAM hat 64 GB erreicht!");
            ns.print("Starte 'boot.js', um das große System anzuwerfen.");
            ns.print("==================================================");
        }

        await ns.sleep(10000);
    }
}
