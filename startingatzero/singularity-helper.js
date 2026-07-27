/** @param {NS} ns */
export async function main(ns) {
    if (typeof ns.singularity === "undefined") {
        ns.print("Singularity-API nicht verfügbar.");
        return;
    }

    let myMoney = ns.getServerMoneyAvailable("home");

    // 1. Tor-Router kaufen
    if (myMoney >= 200000) {
        if (ns.singularity.purchaseTor()) {
            ns.tprint("SUCCESS: Tor-Router gekauft!");
        }
    }

    // 2. Port-Programme kaufen
    const programs = [
        { name: "BruteSSH.exe", cost: 500000 },
        { name: "FTPCrack.exe", cost: 1500000 },
        { name: "relaySMTP.exe", cost: 5000000 },
        { name: "HTTPWorm.exe", cost: 30000000 },
        { name: "SQLInject.exe", cost: 250000000 }
    ];

    for (let prog of programs) {
        if (!ns.fileExists(prog.name, "home")) {
            myMoney = ns.getServerMoneyAvailable("home");
            if (myMoney >= prog.cost) {
                if (ns.singularity.purchaseProgram(prog.name)) {
                    ns.tprint(`SUCCESS: ${prog.name} gekauft!`);
                }
            }
        }
    }

    // 3. Home-RAM upgrade
    myMoney = ns.getServerMoneyAvailable("home");
    try {
        let ramCost = ns.singularity.getUpgradeHomeRamCost();
        if (myMoney >= ramCost) {
            if (ns.singularity.upgradeHomeRam()) {
                ns.tprint("SUCCESS: Home RAM aufgerüstet!");
            }
        }
    } catch (e) {}

    // 4. Home-Cores upgrade
    myMoney = ns.getServerMoneyAvailable("home");
    try {
        let coreCost = ns.singularity.getUpgradeHomeCoresCost();
        if (myMoney >= coreCost) {
            if (ns.singularity.upgradeHomeCores()) {
                ns.tprint("SUCCESS: Home CPU-Cores aufgerüstet!");
            }
        }
    } catch (e) {}
}
