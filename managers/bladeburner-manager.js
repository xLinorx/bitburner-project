import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Bladeburner-Manager aktiv...");

    while (true) {
        try {
            if (!ns.bladeburner.inBladeburner()) {
                await ns.sleep(60000);
                continue;
            }

            let stamina = ns.bladeburner.getStamina();
            let currentStamina = stamina[0];
            let maxStamina = stamina[1];

            // Bei niedriger Ausdauer automatisch erholen
            if (currentStamina < maxStamina * 0.5) {
                ns.bladeburner.joinAction("General", "Recruitment");
                await ns.sleep(10000);
                continue;
            }

            // Black Ops prüfen und bei sicherer Chance starten
            let nextBlackOp = ns.bladeburner.getNextBlackOp();
            if (nextBlackOp) {
                let opName = nextBlackOp.name;
                let chance = ns.bladeburner.getActionEstimatedSuccessChance("Black Ops", opName);
                if (chance[0] >= 0.99) {
                    ns.bladeburner.startAction("Black Ops", opName);
                    await ns.sleep(ns.bladeburner.getActionTime("Black Ops", opName) + 100);
                    continue;
                }
            }

            // Standard Field Operations oder Diplomatie
            if (ns.bladeburner.getActionEstimatedSuccessChance("Field Operations", "Investigate Cyber Terrorism")[0] > 0.8) {
                ns.bladeburner.startAction("Field Operations", "Investigate Cyber Terrorism");
            } else {
                ns.bladeburner.startAction("General", "Diplomacy");
            }

        } catch (e) {
            // API in dieser BitNode evtl. noch nicht freigeschaltet
        }
        await ns.sleep(10000);
    }
}