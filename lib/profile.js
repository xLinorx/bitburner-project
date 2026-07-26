/** @param {NS} ns */
export function getGameProfile(ns) {
    let money = ns.getServerMoneyAvailable("home");
    let maxRam = ns.getServerMaxRam("home");
    let hackLevel = ns.getHackingLevel();
    
    // Prüfen, ob wir bereits eine Corporation haben
    let hasCorp = false;
    try {
        hasCorp = ns.corporation.hasCorporation();
    } catch(e) {}

    // Ermittlung der aktuellen Spielphase mit klarem Fokus auf die Corporation-Schwelle
    let phase = "EARLY";
    if (hasCorp && money > 1e12 && hackLevel > 2000) {
        phase = "ENDGAME";
    } else if (hasCorp || money >= 150e9) {
        phase = "LATE"; // Wir haben die Corp oder genug Geld dafür
    } else if (money > 1e7 && hackLevel > 150) {
        phase = "MID";
    }

    // Präzise gesteuerte Sicherheitsreserve
    let reserve = 0;
    if (phase === "ENDGAME") {
        reserve = Math.max(20e9, money * 0.15);
    } else if (phase === "LATE" && hasCorp) {
        // Haben wir die Corp schon? Dann greift der normale Endgame/Late-Puffer für Dividenden/Stocks
        reserve = 20e9; 
    } else if (!hasCorp && money >= 50e9) {
        // SPITEL-BESCHLEUNIGUNG: Sobald wir 50b haben, stoppen wir das Aktien-Verprassen 
        // und sparen knallhart auf die 150b für die Corporation hin!
        reserve = 160e9; 
    } else if (phase === "MID") {
        reserve = 50e6;
    } else {
        reserve = 0; // EARLY: Volles Rohr in den Aufbau
    }

    return {
        phase: phase,
        stagger: phase === "ENDGAME" ? 80 : (phase === "LATE" ? 120 : (phase === "MID" ? 160 : 250)),
        donationStep: Math.max(50e6, money * 0.01),
        safetyReserve: reserve,
        threadWeights: phase === "ENDGAME" 
            ? { h: 0.15, w1: 0.20, g: 0.45, w2: 0.20 }
            : { h: 0.10, w1: 0.25, g: 0.45, w2: 0.20 }
    };
}