import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "HIGH-IMPACT STOCK ENGINE aktiv (Waterfall / Diamond Hands)...", "SUCCESS");

    while (true) {
        await ns.stock.nextUpdate();

        try {
            if (!ns.stock.hasTixApiAccess()) {
                continue;
            }

            let profile = getGameProfile(ns);
            let symbols = ns.stock.getSymbols();
            let myMoney = ns.getServerMoneyAvailable("home");
            let availableForTrading = Math.max(0, myMoney - profile.safetyReserve);

            let marketData = symbols.map(sym => {
                let forecast = ns.stock.getForecast(sym);
                let volatility = ns.stock.getVolatility(sym);
                let askPrice = ns.stock.getAskPrice(sym);
                let bidPrice = ns.stock.getBidPrice(sym);
                let maxShares = ns.stock.getMaxShares(sym);
                let [shares, avgPrice] = ns.stock.getPosition(sym);
                
                // Momentum-Score (nur positive Trends sind relevant)
                let momentumScore = forecast > 0.5 ? (forecast - 0.5) * volatility : 0;

                return { sym, forecast, volatility, askPrice, bidPrice, maxShares, shares, avgPrice, momentumScore };
            });

            // ==========================================
            // PASS 1: DIAMOND-HANDS VERKAUFSLOGIK
            // ==========================================
            for (let data of marketData) {
                if (data.shares > 0) {
                    let grossValue = data.shares * data.bidPrice;
                    let purchaseCost = data.shares * data.avgPrice;
                    
                    // Harte Netto-Rechnung abzüglich BEIDER Fixgebühren (Kauf + Verkauf = 200.000)
                    let netProfit = grossValue - purchaseCost - 200000; 

                    // 1. Notbremse / Trendbruch: Der Trend ist vorbei (< 0.52). Raus hier, egal was passiert.
                    let trendDead = data.forecast < 0.52;
                    
                    // 2. Totes Kapital: Die Aktie bewegt sich null.
                    let deadCapital = data.volatility < 0.003;
                    
                    // 3. Massive Gewinnmitnahme: Trend kühlt minimal ab (< 0.55), aber wir haben über 50 Mio Reingewinn.
                    let massiveProfitTake = data.forecast < 0.55 && netProfit > 50000000;

                    if (trendDead || deadCapital || massiveProfitTake) {
                        let soldPrice = ns.stock.sellStock(data.sym, data.shares);
                        if (soldPrice > 0) {
                            let reason = trendDead ? "TREND-BRUCH" : (deadCapital ? "STAGNATION" : "GEWINNMITNAHME");
                            log(ns, `HIGH-IMPACT EXIT [${reason}]: ${data.sym} liquidiert | Netto-Ergebnis: $${ns.format.number(netProfit)}`, "WARN");
                        }
                    }
                }
            }

            // Nach Verkäufen: Budget für den Wasserfall-Kauf aktualisieren
            myMoney = ns.getServerMoneyAvailable("home");
            availableForTrading = Math.max(0, myMoney - profile.safetyReserve);
            let remainingBudget = availableForTrading;

            // ==========================================
            // PASS 2: WASSERFALL / SPILLOVER KAUFLOGIK
            // ==========================================
            // Wir kaufen nur, wenn das Startbudget relevant ist (> 10 Mio)
            if (remainingBudget > 10000000) {
                
                // Alle Elite-Werte suchen, die noch Platz haben, sortiert nach bestem Score
                let candidates = marketData
                    .filter(d => d.forecast >= 0.60 && d.volatility >= 0.008 && d.shares < d.maxShares)
                    .sort((a, b) => b.momentumScore - a.momentumScore);

                for (let best of candidates) {
                    // Wenn während des Durchlaufs das Geld knapp wird (< 10 Mio), sofort abbrechen
                    if (remainingBudget < 10000000) break;

                    let spaceLeft = best.maxShares - best.shares;
                    // Berücksichtigt die 100k Kaufgebühr
                    let maxAffordable = Math.floor((remainingBudget - 100000) / best.askPrice);
                    let desiredShares = Math.min(spaceLeft, maxAffordable);
                    
                    let investmentVolume = desiredShares * best.askPrice;

                    // Letzter Schutz: Der einzelne Trade muss mindestens 10 Mio schwer sein
                    if (desiredShares > 0 && investmentVolume > 10000000) {
                        let cost = investmentVolume + 100000;
                        if (myMoney > cost + profile.safetyReserve) {
                            let purchasedShares = ns.stock.buyStock(best.sym, desiredShares);
                            if (purchasedShares > 0) {
                                ns.writePort(1, "PAUSE_BATCHING");
                                log(ns, `WASSERFALL-KAUF: ${best.sym} | Volumen: $${ns.format.number(investmentVolume)} | Score: ${best.momentumScore.toFixed(4)}`, "SUCCESS");
                                
                                // Budget für den nächsten Schleifendurchlauf (die nächste Aktie) direkt abziehen
                                remainingBudget -= cost;
                                myMoney -= cost;
                            }
                        }
                    }
                }
            }

        } catch (e) {
            // API-Fehler (z.B. im Early Game ohne TIX) lautlos abfangen
        }
    }
}