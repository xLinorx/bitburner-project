import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Stanek's Optimizer aktiv...");

    while (true) {
        try {
            let fragments = ns.stanek.activeFragments();
            for (let frag of fragments) {
                ns.stanek.chargeFragment(frag.x, frag.y);
            }
        } catch (e) {
            // Stanek API nicht verfügbar
        }
        await ns.sleep(1000);
    }
}