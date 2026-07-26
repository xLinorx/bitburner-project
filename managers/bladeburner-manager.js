import { log } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Bladeburner-Manager aktiv...");[cite: 6]

    while (true) {
        try {
            if (!ns.bladeburner.inBladeburner()) {[cite: 6]
                await ns.sleep(60000);[cite: 6]
                continue;
            }

            let stamina = ns.bladeburner.getStamina();[cite: 6]
            let currentStamina = stamina[0];[cite: 6]
            let maxStamina = stamina[1];[cite: 6]

            // Bei niedriger Ausdauer automatisch erholen
            if (currentStamina < maxStamina * 0.5) {[cite: 6]
                ns.bladeburner.joinAction("General", "Recruitment");[cite: 6]
                await ns.sleep(10000);[cite: 6]
                continue;
            }

            // Black Ops prüfen und bei sicherer Chance starten
            let nextBlackOp = ns.bladeburner.getNextBlackOp();[cite: 6]
            if (nextBlackOp) {
                let opName = nextBlackOp.name;[cite: 6]
                let chance = ns.bladeburner.getActionEstimatedSuccessChance("Black Ops", opName);[cite: 6]
                if (chance[0] >= 0.99) {[cite: 6]
                    ns.bladeburner.startAction("Black Ops", opName);[cite: 6]
                    await ns.sleep(ns.bladeburner.getActionTime("Black Ops", opName) + 100);[cite: 6]
                    continue;
                }
            }

            // Standard Field Operations oder Diplomatie
            if (ns.bladeburner.getActionEstimatedSuccessChance("Field Operations", "Investigate Cyber Terrorism")[0] > 0.8) {[cite: 6]
                ns.bladeburner.startAction("Field Operations", "Investigate Cyber Terrorism");[cite: 6]
            } else {
                ns.bladeburner.startAction("General", "Diplomacy");[cite: 6]
            }

        } catch (e) {
            // API in dieser BitNode evtl. noch nicht freigeschaltet
        }
        await ns.sleep(10000);[cite: 6]
    }
}