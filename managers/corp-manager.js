import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

const CITIES = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Corporation-Manager (4000q-Turbo Edition) gestartet...", "INFO");

    while (true) {
        let profile = getGameProfile(ns);

        try {
            // 1. CORPORATION GRÜNDEN (Falls nicht vorhanden)
            if (!ns.corporation.hasCorporation()) {
                if (ns.getServerMoneyAvailable("home") > 150e9 + profile.safetyReserve) {
                    ns.corporation.createCorporation("OmniCorp", false);
                    log(ns, "Corporation 'OmniCorp' erfolgreich gegründet!", "SUCCESS");
                } else {
                    await ns.sleep(60000);
                    continue; // Warten auf genug Startkapital
                }
            }

            let corpInfo = ns.corporation.getCorporation();

            // 2. BRANCHEN-EXPANSION (Agriculture & Tobacco)
            manageDivisions(ns, corpInfo);

            // 3. INFRASTRUKTUR & PERSONAL (Alle Städte)
            manageInfrastruktur(ns);

            // 4. PRODUKT-ENTWICKLUNG (Der Weg zu Quadrillionen)
            manageProducts(ns, "Tobacco");

            // 5. DIVIDENDEN-STEUERUNG (Auszahlung ans Player-Konto)
            manageDividends(ns, corpInfo);

        } catch (e) {
            // Stiller Fallback, falls in einem frühen Node die API teilweise gesperrt ist
            // ns.print("[DEBUG] Corp-Fehler: " + e);
        }

        await ns.sleep(10000); // 10-Sekunden-Takt für Performance
    }
}

// ==========================================
// HILFSFUNKTIONEN FÜR DIE PHASEN
// ==========================================

function manageDivisions(ns, corpInfo) {
    let divisions = corpInfo.divisions;
    let funds = corpInfo.funds;

    // Phase 1: Agriculture (Fundament)
    if (!divisions.includes("Agriculture") && funds > 3e9) {
        ns.corporation.expandIndustry("Agriculture", "Agriculture");
        log(ns, "Sparte gegründet: Agriculture", "SUCCESS");
    }

    // Phase 2: Tobacco (Der echte Goldesel)
    if (divisions.includes("Agriculture") && !divisions.includes("Tobacco") && funds > 25e9) {
        ns.corporation.expandIndustry("Tobacco", "Tobacco");
        log(ns, "Sparte gegründet: Tobacco. Der Turbo ist gezündet!", "SUCCESS");
    }
}

function manageInfrastruktur(ns) {
    let divisions = ns.corporation.getCorporation().divisions;

    for (let div of divisions) {
        for (let city of CITIES) {
            // 1. In Stadt expandieren
            if (!ns.corporation.getDivision(div).cities.includes(city)) {
                if (ns.corporation.getCorporation().funds > 5e9) {
                    ns.corporation.expandCity(div, city);
                } else {
                    continue; // Kein Geld für Expansion
                }
            }

            // 2. Lagerhaus kaufen (Pflicht für Smart Supply)
            if (!ns.corporation.hasWarehouse(div, city) && ns.corporation.getCorporation().funds > 5e9) {
                ns.corporation.purchaseWarehouse(div, city);
            }

            // 3. Smart Supply aktivieren
            if (ns.corporation.hasWarehouse(div, city)) {
                ns.corporation.setSmartSupply(div, city, true);
                
                // Automatischer Verkauf der produzierten Rohstoffe
                let materials = ["Food", "Plants", "Water"]; // Je nach Industrie anpassbar
                for (let mat of materials) {
                    try { ns.corporation.sellMaterial(div, city, mat, "MAX", "MP"); } catch(e){}
                }
            }

            // 4. Personal einstellen (Immer vollmachen)
            if (ns.corporation.hasWarehouse(div, city)) {
                let office = ns.corporation.getOffice(div, city);
                while (office.size > office.numEmployees) {
                    ns.corporation.hireEmployee(div, city);
                    office = ns.corporation.getOffice(div, city); // Update
                }

                // Jobs fair verteilen
                if (office.numEmployees > 0) {
                    let perRole = Math.floor(office.numEmployees / 5);
                    let remainder = office.numEmployees % 5;
                    
                    try {
                        ns.corporation.setAutoJobAssignment(div, city, "Operations", perRole + remainder);
                        ns.corporation.setAutoJobAssignment(div, city, "Engineer", perRole);
                        ns.corporation.setAutoJobAssignment(div, city, "Business", perRole);
                        ns.corporation.setAutoJobAssignment(div, city, "Management", perRole);
                        ns.corporation.setAutoJobAssignment(div, city, "Research & Development", perRole);
                    } catch(e) {}
                }
            }
        }
    }
}

function manageProducts(ns, divName) {
    if (!ns.corporation.getCorporation().divisions.includes(divName)) return;

    let divInfo = ns.corporation.getDivision(divName);
    let maxProducts = divInfo.maxProducts || 3;
    let products = divInfo.products;
    let funds = ns.corporation.getCorporation().funds;

    // Existierende Produkte sofort auf maximalen Verkaufspreis setzen
    for (let prod of products) {
        for (let city of CITIES) {
            try { ns.corporation.sellProduct(divName, city, prod, "MAX", "MP", true); } catch(e){}
        }
    }

    // Ist noch Platz für ein neues Produkt?
    if (products.length < maxProducts) {
        // Wir nehmen 1% des Firmenkapitals als Entwicklungsbudget (min. 1 Mrd)
        let investBudget = Math.max(1e9, funds * 0.01); 
        
        // Wir brauchen das Budget 2x (Design & Marketing)
        if (funds > investBudget * 2) {
            let newVersion = products.length + 1;
            
            // Suche die höchste Versionsnummer, um Überschneidungen zu vermeiden
            if (products.length > 0) {
                let maxV = 0;
                for (let p of products) {
                    let v = parseInt(p.split("-v")[1]);
                    if (v > maxV) maxV = v;
                }
                newVersion = maxV + 1;
            }

            let prodName = `${divName}-v${newVersion}`;
            try {
                ns.corporation.makeProduct(divName, "Sector-12", prodName, investBudget, investBudget);
                log(ns, `Beginne Entwicklung von ${prodName} (Budget: ${ns.formatNumber(investBudget * 2)})`, "INFO");
            } catch(e) {}
        }
    } 
    // Max Produkte erreicht. Wir checken, ob wir das Schlechteste einstellen müssen
    else {
        let allProductsDeveloped = true;
        let worstProduct = products[0];
        let worstRating = 999999;

        for (let prod of products) {
            let pInfo = ns.corporation.getProduct(divName, "Sector-12", prod);
            if (pInfo.developmentProgress < 100) allProductsDeveloped = false;
            
            // Finde das Produkt mit der geringsten Bewertung
            if (pInfo.rat < worstRating) {
                worstRating = pInfo.rat;
                worstProduct = prod;
            }
        }

        // Wenn ALLE Produkte fertig entwickelt sind und wir sehr viel Geld haben, 
        // killen wir das alte Produkt, um Platz für ein neues, astronomisch besseres zu machen.
        if (allProductsDeveloped && funds > 50e9) {
            try {
                ns.corporation.discontinueProduct(divName, worstProduct);
                log(ns, `Altes Produkt eingestellt: ${worstProduct}. Mache Platz für Innovation!`, "WARN");
            } catch(e) {}
        }
    }
}

function manageDividends(ns, corpInfo) {
    let profit = corpInfo.revenue - corpInfo.expenses;
    let currentDiv = corpInfo.dividendRate;

    // Wenn die Corp extrem profitabel wird (die Tobacco-Produkte skalieren)
    if (profit > 1e12) { // Mehr als 1 Trillion Gewinn pro Sekunde
        if (currentDiv !== 0.5) ns.corporation.issueDividends(0.5); // 50% ans Player-Konto
    } else if (profit > 10e9) { // Mehr als 10 Mrd Gewinn pro Sekunde
        if (currentDiv !== 0.1) ns.corporation.issueDividends(0.1); // 10% ans Player-Konto
    } else {
        // In der Wachstumsphase bleibt alles Geld in der Firma
        if (currentDiv !== 0) ns.corporation.issueDividends(0);
    }
}