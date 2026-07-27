import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "HYBRID STOCK ENGINE aktiv (Auto-Unlock & Priority-Lock)...", "SUCCESS");

    const priceHistory = {};
    const HISTORY_LENGTH = 40; // Erhöht auf 40 Ticks (4 Minuten) für stabilere Fallback-Daten

    while (true) {
        await ns.stock.nextUpdate();

        try {
            let profile = getGameProfile(ns);
            let myMoney = ns.getServerMoneyAvailable("home");
            
            // Das frei verfügbare Budget, das die Corporation-Sicherheit NICHT antastet
            let spendableMoney = Math.max(0, myMoney - profile.safetyReserve);

            // ==========================================
            // 1. AUTO-UNLOCK DER BÖRSEN-APIs (Sicherheits-Bereinigt)
            // ==========================================
            // A. WSE Account (200 Mio)
            if (!ns.stock.hasWseAccount() && spendableMoney > 200_000_000) {
                if (ns.stock.purchaseWseAccount()) {
                    log(ns, "WSE Account erworben!", "SUCCESS");
                }
            }
            // B. TIX API (5 Mrd)
            if (ns.stock.hasWseAccount() && !ns.stock.hasTixApiAccess() && spendableMoney > 5_000_000_000) {
                if (ns.stock.purchaseTixApi()) {
                    log(ns, "TIX API erworben! Aktiviere Basis-Trading.", "SUCCESS");
                }
            }
            // C. 4S Market Data (1 Mrd)
            if (ns.stock.hasTixApiAccess() && !ns.stock.has4SData() && spendableMoney > 1_000_000_000) {
                if (ns.stock.purchase4SMarketData()) {
                    log(ns, "4S Market Data erworben!", "SUCCESS");
                }
            }
            // D. 4S TIX API (25 Mrd)
            if (ns.stock.has4SData() && !ns.stock.has4SDataTixApi() && spendableMoney > 25_000_000_000) {
                if (ns.stock.purchase4SMarketDataTixApi()) {
                    log(ns, "4S TIX API erworben! Präzisions-Modus aktiv.", "SUCCESS");
                }
            }

            // Schutz: Ohne WSE Account stürzt getSymbols() ab. Ohne TIX können wir nicht handeln.
            if (!ns.stock.hasWseAccount() || !ns.stock.hasTixApiAccess()) {
                continue;
            }

            let symbols = ns.stock.getSymbols();
            let has4S = ns.stock.has4SDataTixApi();

            // ==========================================
            // 2. MARKT-ANALYSE (Hybrid: 4S oder Fallback-Historie)
            // ==========================================
            let marketData = symbols.map(sym => {
                let askPrice = ns.stock.getAskPrice(sym);
                let bidPrice = ns.stock.getBidPrice(sym);
                let maxShares = ns.stock.getMaxShares(sym);
                let [shares, avgPrice] = ns.stock.getPosition(sym);

                // Historie für Fallback füllen
                if (!priceHistory[sym]) priceHistory[sym] = [];
                priceHistory[sym].push(askPrice);
                if (priceHistory[sym].length > HISTORY_LENGTH) priceHistory[sym].shift();

                let forecast = 0.5;
                let volatility = 0.01;

                if (has4S) {
                    forecast = ns.stock.getForecast(sym);
                    volatility = ns.stock.getVolatility(sym);
                } else {
                    let history = priceHistory[sym];
                    if (history.length >= 10) { // Mindestens 10 Ticks warten, bevor wir raten
                        let increases = 0;
                        for (let i = 1; i < history.length; i++) {
                            if (history[i] > history[i - 1]) increases++;
                        }
                        forecast = increases / (history.length - 1);
                        // Durchschnittliche Bewegung als Volatilitäts-Ersatz
                        volatility = Math.abs(history[history.length - 1] - history[0]) / history[0] / history.length;
                    }
                }

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
                    let netProfit = grossValue - purchaseCost - 200_000; 

                    let trendDead = data.forecast < 0.52;
                    let deadCapital = data.volatility < 0.002;
                    let massiveProfitTake = data.forecast < 0.55 && netProfit > 50_000_000;

                    if (trendDead || deadCapital || massiveProfitTake) {
                        let soldPrice = ns.stock.sellStock(data.sym, data.shares);
                        if (soldPrice > 0) {
                            let reason = trendDead ? "TREND-BRUCH" : (deadCapital ? "STAGNATION" : "GEWINNMITNAHME");
                            log(ns, `HIGH-IMPACT EXIT [${reason}]: ${data.sym} liquidiert | Netto: $${ns.format.number(netProfit)}`, "WARN");
                        }
                    }
                }
            }

            // Budget-Update nach Verkäufen
            myMoney = ns.getServerMoneyAvailable("home");
            let remainingBudget = Math.max(0, myMoney - profile.safetyReserve);

            // ==========================================
            // PASS 2: WASSERFALL / SPILLOVER KAUFLOGIK
            // ==========================================
            let candidates = marketData
                .filter(d => d.forecast >= 0.60 && d.volatility >= 0.005 && d.shares < d.maxShares)
                .sort((a, b) => b.momentumScore - a.momentumScore);

            // PRIORITY-SIGNAL: Wenn Kaufchancen da sind, sperren wir Port 2 für andere Manager
            if (candidates.length > 0 && remainingBudget > 10_000_000) {
                ns.writePort(2, "STOCK_ACTIVE");
            } else {
                ns.clearPort(2);
            }

            if (remainingBudget > 10_000_000) {
                for (let best of candidates) {
                    if (remainingBudget < 10_000_000) break;

                    let spaceLeft = best.maxShares - best.shares;
                    let maxAffordable = Math.floor((remainingBudget - 100_000) / best.askPrice);
                    let desiredShares = Math.min(spaceLeft, maxAffordable);
                    let investmentVolume = desiredShares * best.askPrice;

                    if (desiredShares > 0 && investmentVolume > 10_000_000) {
                        let cost = investmentVolume + 100_000;
                        if (myMoney > cost + profile.safetyReserve) {
                            let purchasedShares = ns.stock.buyStock(best.sym, desiredShares);
                            if (purchasedShares > 0) {
                                ns.writePort(1, "PAUSE_BATCHING");
                                log(ns, `WASSERFALL-KAUF: ${best.sym} | Volumen: $${ns.format.number(investmentVolume)} | Score: ${best.momentumScore.toFixed(4)}`, "SUCCESS");
                                
                                remainingBudget -= cost;
                                myMoney -= cost; // myMoney ebenfalls anpassen, damit der Budget-Check beim nächsten Durchlauf stimmt
                            }
                        }
                    }
                }
            }

        } catch (e) {
            log(ns, "FEHLER in stock-engine: " + (e.stack || e), "ERROR");
        }
    }
}