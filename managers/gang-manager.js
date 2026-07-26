import { log } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/logger.js";
import { getGameProfile } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Gang-Manager aktiv...", "INFO");

    while (true) {
        try {
            // Prüfen ob Gang-API existiert und ob man in einer Gang ist
            if (typeof ns.gang === "undefined" || !ns.gang.inGang()) {
                await ns.sleep(60000);
                continue;
            }

            let profile = getGameProfile(ns);
            let myMoney = ns.getServerMoneyAvailable("home");

            // 1. Rekrutierung neuer Mitglieder
            if (ns.gang.canRecruitMember()) {
                let name = `Agent-${ns.gang.getMemberNames().length + 1}`;
                ns.gang.recruitMember(name);
                log(ns, `Neues Gang-Mitglied rekrutiert: ${name}`, "SUCCESS");
            }

            let members = ns.gang.getMemberNames();
            for (let member of members) {
                // 2. Automatischer Ausrüstungskauf (nur wenn Puffer sicher ist)
                if (myMoney > profile.safetyReserve * 1.5) {
                    let equipment = ns.gang.getEquipmentNames();
                    for (let eq of equipment) {
                        try {
                            ns.gang.purchaseEquipment(member, eq);
                        } catch (err) {
                            // Ignorieren falls bereits gekauft
                        }
                    }
                }

                // 3. Dynamische Aufgaben-Zuweisung
                let info = ns.gang.getMemberInformation(member);
                if (info.str < 100 || info.def < 100) {
                    ns.gang.setMemberTask(member, "Train Combat");
                } else {
                    ns.gang.setMemberTask(member, "Human Trafficking"); // Lukrative Standard-Aktivität
                }
            }

        } catch (e) {
            // Fehler abfangen
        }

        await ns.sleep(10000);
    }
}