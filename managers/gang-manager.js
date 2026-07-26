import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Gang-Manager 3.0 (Stabilitäts-Fix) aktiv...", "INFO");

    while (true) {
        try {
            // === 1. API & Gang-Check ============================================
            if (typeof ns.gang === "undefined" || !ns.gang.inGang()) {
                await ns.sleep(60000);
                continue;
            }

            let profile = getGameProfile(ns);
            let money = ns.getServerMoneyAvailable("home");

            // === 2. Rekrutierung ================================================
            if (ns.gang.canRecruitMember()) {
                let name = `Agent-${ns.gang.getMemberNames().length + 1}`;
                ns.gang.recruitMember(name);
                log(ns, `Neues Gang-Mitglied rekrutiert: ${name}`, "SUCCESS");
            }

            let members = ns.gang.getMemberNames();

            // === 3. Wanted-Level Kontrolle ======================================
            let wanted = ns.gang.getGangInformation().wantedLevel;
            let wantedPenalty = ns.gang.getGangInformation().wantedPenalty;

            let needWantedReduction = wantedPenalty < 0.95;

            // === 4. Member-Loop ==================================================
            for (let m of members) {
                let info = ns.gang.getMemberInformation(m);

                // --- Ascension-Check --------------------------------------------
                let asc = ns.gang.getAscensionResult(m);
                if (asc && (asc.str > 1.5 || asc.def > 1.5 || asc.dex > 1.5 || asc.agi > 1.5)) {
                    ns.gang.ascendMember(m);
                    log(ns, `[ASCEND] ${m} wurde aufgestuft!`, "SUCCESS");
                    continue;
                }

                // --- Equipment-Kauf (wirtschaftlich) ----------------------------
                if (money > profile.safetyReserve * 1.2) {
                    let eqList = ns.gang.getEquipmentNames();
                    for (let eq of eqList) {
                        let cost = ns.gang.getEquipmentCost(eq);
                        if (money > cost + profile.safetyReserve) {
                            try { ns.gang.purchaseEquipment(m, eq); } catch {}
                        }
                    }
                }

                // --- Wanted-Level reduzieren ------------------------------------
                if (needWantedReduction) {
                    ns.gang.setMemberTask(m, "Vigilante Justice");
                    continue;
                }

                // --- Training (Early/Mid) ---------------------------------------
                if (info.str < 100 || info.def < 100 || info.dex < 100 || info.agi < 100) {
                    ns.gang.setMemberTask(m, "Train Combat");
                    continue;
                }

                // --- Aufgabenwahl nach Stärke -----------------------------------
                let tasks = ns.gang.getTaskNames();
                let bestTask = "Human Trafficking";
                let bestGain = 0;

                for (let t of tasks) {
                    let stats = ns.gang.getTaskStats(t);
                    let chance = ns.gang.getChanceToWinClash(m);

                    // Profit + Sicherheit
                    let gain = stats.money * chance;

                    if (gain > bestGain) {
                        bestGain = gain;
                        bestTask = t;
                    }
                }

                ns.gang.setMemberTask(m, bestTask);
            }

        } catch (e) {
            log(ns, `Gang-Fehler: ${String(e)}`, "ERROR");
        }

        await ns.sleep(10000);
    }
}
