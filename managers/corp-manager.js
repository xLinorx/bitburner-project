import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

const CITIES = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Corporation-Manager (4000q-Turbo FIX) gestartet...", "INFO");

    while (true) {
        let profile = getGameProfile(ns);

        try {
            // === 1. Corporation gründen ==========================================
            if (!ns.corporation.hasCorporation()) {
                let money = ns.getServerMoneyAvailable("home");
                if (money > 150e9 + profile.safetyReserve) {
                    ns.corporation.createCorporation("OmniCorp", false);
                    log(ns, "Corporation gegründet!", "SUCCESS");
                } else {
                    await ns.sleep(60000);
                    continue;
                }
            }

            let corp = ns.corporation.getCorporation();

            // === 2. Division-Management ==========================================
            manageDivisions(ns, corp);

            // === 3. Infrastruktur & Personal =====================================
            manageInfrastructure(ns);

            // === 4. Produkt-Management ===========================================
            manageProducts(ns, "Tobacco");

            // === 5. Dividenden ====================================================
            manageDividends(ns, corp);

        } catch (e) {
            log(ns, `Corp-Fehler: ${String(e)}`, "ERROR");
        }

        await ns.sleep(10000);
    }
}

// ============================================================================
// 2. Division-Management
// ============================================================================
function manageDivisions(ns, corp) {
    let funds = corp.funds;
    let divisions = corp.divisions;

    // Agriculture
    if (!divisions.includes("Agriculture") && funds > 3e9) {
        ns.corporation.expandIndustry("Agriculture", "Agriculture");
        log(ns, "Sparte gegründet: Agriculture", "SUCCESS");
    }

    // Tobacco
    if (divisions.includes("Agriculture") && !divisions.includes("Tobacco") && funds > 25e9) {
        ns.corporation.expandIndustry("Tobacco", "Tobacco");
        log(ns, "Sparte gegründet: Tobacco", "SUCCESS");
    }
}

// ============================================================================
// 3. Infrastruktur & Personal
// ============================================================================
function manageInfrastructure(ns) {
    let corp = ns.corporation.getCorporation();

    for (let div of corp.divisions) {
        for (let city of CITIES) {

            // Stadt-Expansion
            if (!ns.corporation.getDivision(div).cities.includes(city)) {
                if (corp.funds > 5e9) ns.corporation.expandCity(div, city);
                continue;
            }

            // Warehouse
            if (!ns.corporation.hasWarehouse(div, city) && corp.funds > 5e9) {
                ns.corporation.purchaseWarehouse(div, city);
            }

            // Smart Supply
            if (ns.corporation.hasWarehouse(div, city)) {
                ns.corporation.setSmartSupply(div, city, true);

                // Materials je nach Division
                let mats = div === "Agriculture"
                    ? ["Food", "Plants", "Water"]
                    : [];

                for (let mat of mats) {
                    try { ns.corporation.sellMaterial(div, city, mat, "MAX", "MP"); } catch {}
                }
            }

            // Mitarbeiter
            if (ns.corporation.hasWarehouse(div, city)) {
                let office = ns.corporation.getOffice(div, city);

                while (office.size > office.numEmployees) {
                    ns.corporation.hireEmployee(div, city);
                    office = ns.corporation.getOffice(div, city);
                }

                // Optimierte Job-Verteilung
                let n = office.numEmployees;
                if (n > 0) {
                    let ops = Math.floor(n * 0.25);
                    let eng = Math.floor(n * 0.30);
                    let bus = Math.floor(n * 0.15);
                    let man = Math.floor(n * 0.15);
                    let rnd = n - (ops + eng + bus + man);

                    try {
                        ns.corporation.setAutoJobAssignment(div, city, "Operations", ops);
                        ns.corporation.setAutoJobAssignment(div, city, "Engineer", eng);
                        ns.corporation.setAutoJobAssignment(div, city, "Business", bus);
                        ns.corporation.setAutoJobAssignment(div, city, "Management", man);
                        ns.corporation.setAutoJobAssignment(div, city, "Research & Development", rnd);
                    } catch {}
                }
            }
        }
    }
}

// ============================================================================
// 4. Produkt-Management
// ============================================================================
function manageProducts(ns, divName) {
    let corp = ns.corporation.getCorporation();
    if (!corp.divisions.includes(divName)) return;

    let div = ns.corporation.getDivision(divName);
    let funds = corp.funds;
    let products = div.products;
    let maxProducts = div.maxProducts || 3;

    // Bestehende Produkte verkaufen
    for (let prod of products) {
        for (let city of CITIES) {
            try { ns.corporation.sellProduct(divName, city, prod, "MAX", "MP", true); } catch {}
        }
    }

    // Neues Produkt?
    if (products.length < maxProducts) {
        let invest = Math.max(1e9, funds * 0.01);
        if (funds > invest * 2) {

            // Versionsnummer stabil berechnen
            let maxV = 0;
            for (let p of products) {
                let v = parseInt(p.split("-v")[1]);
                if (!isNaN(v) && v > maxV) maxV = v;
            }

            let newVersion = maxV + 1;
            let name = `${divName}-v${newVersion}`;

            try {
                ns.corporation.makeProduct(divName, "Sector-12", name, invest, invest);
                log(ns, `Produktentwicklung gestartet: ${name}`, "INFO");
            } catch {}
        }
        return;
    }

    // Produktrotation
    let allDone = true;
    let worst = null;
    let worstRating = Infinity;

    for (let prod of products) {
        let info = ns.corporation.getProduct(divName, "Sector-12", prod);

        if (info.developmentProgress < 100) allDone = false;

        if (info.rat < worstRating) {
            worstRating = info.rat;
            worst = prod;
        }
    }

    if (allDone && funds > 50e9) {
        try {
            ns.corporation.discontinueProduct(divName, worst);
            log(ns, `Produkt eingestellt: ${worst}`, "WARN");
        } catch {}
    }
}

// ============================================================================
// 5. Dividenden
// ============================================================================
function manageDividends(ns, corp) {
    let profit = corp.revenue - corp.expenses;
    let current = corp.dividendRate;

    if (profit > 1e12) {
        if (current !== 0.5) ns.corporation.issueDividends(0.5);
    } else if (profit > 10e9) {
        if (current !== 0.1) ns.corporation.issueDividends(0.1);
    } else {
        if (current !== 0) ns.corporation.issueDividends(0);
    }
}
