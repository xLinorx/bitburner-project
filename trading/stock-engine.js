import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "HYBRID STOCK ENGINE aktiv (Mit Corp-Trigger & Two-Tier Budget)...", "SUCCESS");

    const priceHistory = {};
    const HISTORY_LENGTH = 40;

    // Nur 100 Mio. echtes Bargeld auf der Bank lassen, der Rest muss an die Börse!
    const TRADING_RESERVE = 100_000_000; 
    const CORP_COST = 150_000_000_000;

    while (true) {
        await ns.stock.nextUpdate();

        try {
            let profile = getGameProfile(ns);
            let myMoney = ns.getServerMoneyAvailable("home");
            
            // apiBudget: Für den KAUF VON APIs gilt weiterhin die eiserne Reserve, 
            // damit wir nicht versehentlich das Corp-Geld für eine 25-Mrd-API verballern.
            let apiBudget = Math.max(0, myMoney - profile.safetyReserve);

            // ==========================================
            // 1. AUTO-UNLOCK DER BÖRSEN-APIs (Nutzt apiBudget)
            // ==========================================
            if (!ns.stock.hasWSEAccount() && apiBudget > 200_000_000) {
                if (ns.stock.purchaseWseAccount()) log(ns, "WSE Account erworben!", "SUCCESS");
            }
            if (ns.stock.hasWSEAccount() && !ns.stock.hasTixApiAccess() && apiBudget > 5_000_000_000) {
                if (ns.stock.purchaseTixApi()) log(ns, "TIX API erworben! Aktiviere Basis-Trading.", "SUCCESS");
            }
            if (ns.stock.hasTixApiAccess() && !ns.stock.has4SData() && apiBudget > 1_000_000_000) {
                if (ns.stock.purchase4SMarketData()) log(ns, "4S Market Data erworben!", "SUCCESS");
            }
            if (ns.stock.has4SData() && !ns.stock.has4SDataTixApi() && apiBudget > 25_000_000_000) {
                if (ns.stock.purchase4SMarketDataTixApi()) log(ns, "4S TIX API erworben! Präzisions-Modus aktiv.", "SUCCESS");
            }

            if (!ns.stock.hasWSEAccount() || !ns.stock.hasTixApiAccess()) continue;

            let symbols = ns.stock.getSymbols();
            let has4S = ns.stock.has4SDataTixApi();

            // ==========================================
            // 2. NET WORTH BERECHNUNG & CORP-TRIGGER
            // ==========================================
            let stockValue = 0;
            for (let sym of symbols) {
                let [shares] = ns.stock.getPosition(sym);
                if (shares > 0) stockValue += shares * ns.stock.getBidPrice(sym);
            }
            let netWorth = myMoney + stockValue;

            // Prüfen, ob wir das Corp-Geld brauchen (try-catch, falls SF3 fehlt)
            let needsCorpFund = false;
            try {
                if (!ns.corporation.hasCorporation() && profile.phase === "LATE") {
                    needsCorpFund = true;
                }
            } catch (e) {}

            // MASSIVER SELL-OFF: Wir haben zusammen 150 Mrd., aber nicht genug Bargeld!
            if (needsCorpFund && netWorth >= CORP_COST && myMoney < CORP_COST) {
                ns.print(`[CORP-TRIGGER] Net Worth erreicht: $${ns.format.number(netWorth)}. Liquidere Depot!`);
                for (let sym of symbols) {
                    let [shares] = ns.stock.getPosition(sym);
                    if (shares > 0) {
                        ns.stock.sellStock(sym, shares);
                        log(ns, `CORP-FUNDING LIQUIDATION: ${sym} verkauft.`, "WARN");
                    }
                }
                // Nach dem Komplett-Verkauf stoppen wir diesen Tick, damit der corp-manager übernehmen kann
                continue; 
            }

            // ==========================================
            // 3. MARKT-ANALYSE
            // ==========================================
            let marketData = symbols.map(sym => {
                let askPrice = ns.stock.getAskPrice(sym);
                let bidPrice = ns.stock.getBidPrice(sym);
                let maxShares = ns.stock.getMaxShares(sym);
                let [shares, avgPrice] = ns.stock.getPosition(sym);

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
                    if (history.length >= 10) {
                        let increases = 0;
                        for (let i = 1; i < history.length; i++) {
                            if (history[i] > history[i - 1]) increases++;
                        }
                        forecast = increases / (history.length - 1);
                        volatility = Math.abs(history[history.length - 1] - history[0]) / history[0] / history.length;
                    }
                }

                let momentumScore = forecast > 0.5 ? (forecast - 0.5) * volatility : 0;
                return { sym, forecast, volatility, askPrice, bidPrice, maxShares, shares, avgPrice, momentumScore };
            });

            // ==========================================
            // 4. DIAMOND-HANDS VERKAUFSLOGIK (Normales Trading)
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
                            log(ns, `HIGH-IMPACT EXIT [${reason}]: ${data.sym} | Netto: $${ns.format.number(netProfit)}`, "WARN");
                        }
                    }
                }
            }

            // Budget-Update: FÜR DAS TRADING NUTZEN WIR ALLES BIS AUF 100 MIO!
            myMoney = ns.getServerMoneyAvailable("home");
            
            // Wenn wir die Corp-Phase bereits sparen, aber noch NICHT das Geld haben, 
            // lassen wir den Markt die Arbeit machen (wir ignorieren profile.safetyReserve für den Aktienkauf!)
            let tradingBudget = Math.max(0, myMoney - TRADING_RESERVE);

            // ==========================================
            // 5. WASSERFALL / SPILLOVER KAUFLOGIK
            // ==========================================
            let candidates = marketData
                .filter(d => d.forecast >= 0.60 && d.volatility >= 0.005 && d.shares < d.maxShares)
                .sort((a, b) => b.momentumScore - a.momentumScore);

            // PRIORITY-SIGNAL
            if (candidates.length > 0 && tradingBudget > 10_000_000) {
                ns.writePort(2, "STOCK_ACTIVE");
            } else {
                ns.clearPort(2);
            }

            if (tradingBudget > 10_000_000) {
                for (let best of candidates) {
                    if (tradingBudget < 10_000_000) break;

                    let spaceLeft = best.maxShares - best.shares;
                    let maxAffordable = Math.floor((tradingBudget - 100_000) / best.askPrice);
                    let desiredShares = Math.min(spaceLeft, maxAffordable);
                    let investmentVolume = desiredShares * best.askPrice;

                    if (desiredShares > 0 && investmentVolume > 10_000_000) {
                        let cost = investmentVolume + 100_000;
                        if (myMoney > cost + TRADING_RESERVE) {
                            let purchasedShares = ns.stock.buyStock(best.sym, desiredShares);
                            if (purchasedShares > 0) {
                                ns.writePort(1, "PAUSE_BATCHING");
                                log(ns, `WASSERFALL-KAUF: ${best.sym} | Volumen: $${ns.format.number(investmentVolume)}`, "SUCCESS");
                                
                                tradingBudget -= cost;
                                myMoney -= cost; 
                            }
                        }
                    }
                }
            }

        } catch (e) {
            // API-Sicherheitsnetz
        }
    }
}