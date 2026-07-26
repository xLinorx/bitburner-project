import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Bladeburner-Manager 3.0 (Stabilitäts-Fix) aktiv...");

    while (true) {
        try {
            // === 1. API Check =====================================================
            if (!ns.bladeburner.inBladeburner()) {
                await ns.sleep(60000);
                continue;
            }

            // === 2. Stamina-Management ===========================================
            let [currentStamina, maxStamina] = ns.bladeburner.getStamina();
            if (currentStamina < maxStamina * 0.5) {
                ns.bladeburner.startAction("General", "Rest");
                await ns.sleep(10000);
                continue;
            }

            // === 3. Chaos-Kontrolle ==============================================
            let city = ns.bladeburner.getCity();
            let chaos = ns.bladeburner.getCityChaos(city);

            if (chaos > 5) {
                ns.bladeburner.startAction("General", "Diplomacy");
                await ns.sleep(10000);
                continue;
            }

            // === 4. Skill-Upgrades ===============================================
            let skillPoints = ns.bladeburner.getSkillPoints();
            if (skillPoints > 0) {
                let skills = ns.bladeburner.getSkillNames();
                for (let s of skills) {
                    try { ns.bladeburner.upgradeSkill(s); } catch {}
                }
            }

            // === 5. Black Ops =====================================================
            let nextBlackOp = ns.bladeburner.getNextBlackOp();
            if (nextBlackOp) {
                let name = nextBlackOp.name;
                let chance = ns.bladeburner.getActionEstimatedSuccessChance("Black Ops", name)[0];

                if (chance >= 0.99 && chaos <= 3 && currentStamina > maxStamina * 0.8) {
                    ns.bladeburner.startAction("Black Ops", name);
                    await ns.sleep(ns.bladeburner.getActionTime("Black Ops", name) + 200);
                    continue;
                }
            }

            // === 6. Beste Field-Operation bestimmen ===============================
            let tasks = ns.bladeburner.getActionNames("Operations");
            let bestTask = null;
            let bestChance = 0;

            for (let t of tasks) {
                let chance = ns.bladeburner.getActionEstimatedSuccessChance("Operations", t)[0];
                if (chance > bestChance) {
                    bestChance = chance;
                    bestTask = t;
                }
            }

            // === 7. Action ausführen ==============================================
            if (bestTask && bestChance > 0.75) {
                ns.bladeburner.startAction("Operations", bestTask);
            } else {
                ns.bladeburner.startAction("General", "Diplomacy");
            }

        } catch (e) {
            // API evtl. nicht verfügbar
        }

        await ns.sleep(10000);
    }
}
