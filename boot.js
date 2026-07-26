/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Boot-Manager 5.0 gestartet...");

    // === IPC INITIALISIERUNG ==================================================
    ns.clearPort(1);
    ns.clearPort(2);
    ns.writePort(1, "BOOT");
    ns.writePort(2, "IDLE");

    // === DEINE MODUL-LISTE (OHNE PFAD!) =======================================
    const modules = [
        "cloud-manager.js",
        "nuke-manager.js",
        "darkweb-manager.js",
        "hacknet-manager.js",
        "contract-solver.js",
        "task-manager.js",
        "corp-manager.js",
        "gang-manager.js",
        "ascension-manager.js",
        "bladeburner-manager.js",
        "staneks-optimizer.js",
        "home-upgrade-manager.js",
        "favor-optimizer.js",
        "stock-engine.js",
        "dispatcher.js"
        // Dashboard NICHT automatisch starten!
    ];

    // === START-SEQUENZ ========================================================
    for (const mod of modules) {
        const pid = ns.run(mod, 1);
        if (pid === 0) {
            ns.print(`[ERROR] Startfehler bei ${mod}`);
        } else {
            ns.print(`[BOOT] gestartet: ${mod} (PID ${pid})`);
        }
        await ns.sleep(300);
    }

    // === AUTO-RESTART LOOP ====================================================
    while (true) {
        for (const mod of modules) {
            const running = ns.isRunning(mod, "home");
            if (!running) {
                ns.print(`[RESTART] Modul neu gestartet: ${mod}`);
                const pid = ns.run(mod, 1);
                if (pid === 0) {
                    ns.print(`[ERROR] Neustartfehler bei ${mod}`);
                }
            }
        }
        await ns.sleep(5000);
    }
}
