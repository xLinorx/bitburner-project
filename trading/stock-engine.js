import { log } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/logger.js";
import { getGameProfile } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "OPTIMIZED ALPHA-VELOCITY STOCK ENGINE v3.0.1 aktiv...", "SUCCESS");

    const fee = 100000;

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
                
                // Momentum-Score: Gewichtung aus Trend-Abweichung und Volatilität
                let momentumScore = Math.abs(forecast - 0.5) * volatility;

                return { sym, forecast, volatility, askPrice, bidPrice, maxShares, shares, avgPrice, momentumScore };
            });

            // ==========================================
            // PASS 1: INTELLIGENTER EXIT (Whip-Sawing Prevention)
            // ==========================================
            for (let data of marketData) {
                if (data.shares > 0) {
                    let isTrendReversed = data.forecast < 0.50;
                    let isStopLossTriggered = data.bidPrice < data.avgPrice * 0.94 && data.forecast < 0.52;

                    // Verkauf nur, wenn der Trend tatsächlich kippt oder ein echter Stop-Loss greift
                    if (isTrendReversed || isStopLossTriggered) {
                        let soldPrice = ns.stock.sellStock(data.sym, data.shares);
                        if (soldPrice > 0) {
                            let profit = (soldPrice - data.avgPrice) * data.shares;
                            log(ns, `LIQUIDATION: ${data.sym} verkauft (Forecast: ${data.forecast.toFixed(3)}). P/L: ${ns.formatNumber(profit)}`, "INFO");
                        }
                    }
                }
            }

            myMoney = ns.getServerMoneyAvailable("home");
            availableForTrading = Math.max(0, myMoney - profile.safetyReserve);

            if (availableForTrading <= fee) continue;

            // Marktstatus nach Verkäufen aktualisieren
            marketData = symbols.map(sym => {
                let forecast = ns.stock.getForecast(sym);
                let volatility = ns.stock.getVolatility(sym);
                let askPrice = ns.stock.getAskPrice(sym);
                let bidPrice = ns.stock.getBidPrice(sym);
                let maxShares = ns.stock.getMaxShares(sym);
                let [shares, avgPrice] = ns.stock.getPosition(sym);
                let momentumScore = Math.abs(forecast - 0.5) * volatility;
                return { sym, forecast, volatility, askPrice, bidPrice, maxShares, shares, avgPrice, momentumScore };
            });

            // ==========================================
            // PASS 2: OPTIMIERTE KAUF-KASKADE
            // ==========================================
            // Entschärfte Filter: Erfasst auch solide mittlere Trends ab 55% Forecast und 0.5% Volatilität
            let candidates = marketData
                .filter(d => d.forecast >= 0.55 && d.volatility >= 0.005 && d.shares < d.maxShares)
                .sort((a, b) => b.momentumScore - a.momentumScore);

            let remainingBudget = availableForTrading;

            for (let best of candidates) {
                if (remainingBudget <= fee) break;

                let spaceLeft = best.maxShares - best.shares;
                let maxAffordable = Math.floor((remainingBudget - fee) / best.askPrice);
                let desiredShares = Math.min(spaceLeft, maxAffordable);

                if (desiredShares > 0) {
                    let cost = best.askPrice * desiredShares + fee;
                    if (myMoney > cost + profile.safetyReserve) {
                        let purchasedShares = ns.stock.buyStock(best.sym, desiredShares);
                        if (purchasedShares > 0) {
                            log(ns, `ALPHA-KAUF: ${best.sym} (${ns.formatNumber(purchasedShares)} Sh) | Score: ${best.momentumScore.toFixed(5)} | Vol: ${(best.volatility*100).toFixed(2)}%`, "SUCCESS");
                            
                            myMoney = ns.getServerMoneyAvailable("home");
                            remainingBudget = Math.max(0, myMoney - profile.safetyReserve);
                        }
                    }
                }
            }

        } catch (e) {
            log(ns, `Fehler in der Stock Engine: ${e.message}`, "ERROR");
        }
    }
}