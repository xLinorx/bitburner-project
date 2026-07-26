import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Stanek's Optimizer 3.0 (Power-Fix) aktiv...");

    while (true) {
        try {
            // === 1. API Check =====================================================
            if (typeof ns.stanek === "undefined") {
                await ns.sleep(60000);
                continue;
            }

            // === 2. Fragmente laden ==============================================
            let fragments = ns.stanek.activeFragments();
            if (!fragments || fragments.length === 0) {
                await ns.sleep(5000);
                continue;
            }

            // === 3. Priorisierung nach Fragment-Typ ===============================
            // Power-Fragmente zuerst, dann Boosts, dann Utility
            let powerFrags = fragments.filter(f => f.type === "Power");
            let boostFrags = fragments.filter(f => f.type === "Boost");
            let utilFrags  = fragments.filter(f => f.type === "Utility");

            let ordered = [...powerFrags, ...boostFrags, ...utilFrags];

            // === 4. Charge-Strategie ==============================================
            // Power-Fragmente mehrfach laden → maximaler DPS
            for (let frag of ordered) {
                let charges = frag.type === "Power" ? 3 : 1;

                for (let i = 0; i < charges; i++) {
                    try {
                        ns.stanek.chargeFragment(frag.x, frag.y);
                    } catch {
                        // Cooldown oder API-Limit → ignorieren
                    }
                }
            }

        } catch (e) {
            // Stanek API nicht verfügbar
        }

        // === 5. Cooldown-Optimierung ============================================
        await ns.sleep(1500);
    }
}
