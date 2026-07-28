import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "DIAMOND HANDS STOCK ENGINE (v3.0.1 / 50-50 Split) aktiv...", "SUCCESS");

    const priceHistory = {};
    const HISTORY_LENGTH = 40;
    const CORP_COST = 150_000_000_000;
    const MAX_PORTFOLIO_PCT = 0.40; 
    const FEE_ROUND_TRIP = 200_000; 

    while (true) {
        await ns.stock.nextUpdate();

        try {
            let profile = getGameProfile(ns);
            let myMoney = ns.getServerMoneyAvailable("home");
            let apiBudget = Math.max(0, myMoney - profile.safetyReserve);

            // --- API UNLOCKS ---
            if (!ns.stock.hasWseAccount() && apiBudget > 200_000_000) ns.stock.purchaseWseAccount();
            if (ns.stock.hasWseAccount() && !ns.stock.hasTixApiAccess() && apiBudget > 5_000_000_000) ns.stock.purchaseTixApi();
            if (ns.stock.hasTixApiAccess() && !ns.stock.has4SData() && apiBudget > 1_000_000_000) ns.stock.purchase4SMarketData();
            if (ns.stock.has4SData() && !ns.stock.has4SDataTixApi() && apiBudget > 25_000_000_000) ns.stock.purchase4SMarketDataTixApi();

            if (!ns.stock.hasWseAccount() || !ns.stock.hasTixApiAccess()) continue;

            let symbols = ns.stock.getSymbols();
            let has4S = ns.stock.has4SDataTixApi();

            // --- CORP TRIGGER ---
            let stockValue = 0;
            for (let sym of symbols) {
                let [shares] = ns.stock.getPosition(sym);
                if (shares > 0) stockValue += shares * ns.stock.getBidPrice(sym);
            }
            let netWorth = myMoney + stockValue;
            let needsCorpFund = false;
            try { if (!ns.corporation.hasCorporation() && profile.phase === "LATE") needsCorpFund = true; } catch (e) {}

            if (needsCorpFund && netWorth >= CORP_COST) {
                if (myMoney < CORP_COST) {
                    ns.print(`[CORP-TRIGGER] 150b Net Worth erreicht! Liquidiere Depot!`);
                    for (let sym of symbols) {
                        let [shares] = ns.stock.getPosition(sym);
                        if (shares > 0) ns.stock.sellStock(sym, shares);
                    }
                }
                continue; 
            }

            // --- MARKT-ANALYSE ---
            let marketData = symbols.map(sym => {
                let askPrice = ns.stock.getAskPrice(sym);
                let bidPrice = ns.stock.getBidPrice(sym);
                let maxShares = ns.stock.getMaxShares(sym);
                let [shares, avgPrice] = ns.stock.getPosition(sym);

                if (!priceHistory[sym]) priceHistory[sym] = [];
                priceHistory[sym].push(askPrice);
                if (priceHistory[sym].length > HISTORY_LENGTH) priceHistory[sym].shift();

                let forecast = 0.5; let volatility = 0.01;
                if (has4S) {
                    forecast = ns.stock.getForecast(sym);
                    volatility = ns.stock.getVolatility(sym);
                } else {
                    let history = priceHistory[sym];
                    if (history.length >= 10) {
                        let inc = 0;
                        for (let i = 1; i < history.length; i++) { if (history[i] > history[i - 1]) inc++; }
                        forecast = inc / (history.length - 1);
                        volatility = Math.abs(history[history.length - 1] - history[0]) / history[0] / history.length;
                    }
                }
                let momentumScore = forecast > 0.5 ? (forecast - 0.5) * volatility : 0;
                return { sym, forecast, volatility, askPrice, bidPrice, maxShares, shares, avgPrice, momentumScore };
            });

            // --- VERKAUFS-LOGIK (Diamond Hands) ---
            for (let data of marketData) {
                if (data.shares > 0) {
                    let grossValue = data.shares * data.bidPrice;
                    let purchaseCost = data.shares * data.avgPrice;
                    let netProfit = grossValue - purchaseCost - FEE_ROUND_TRIP; 

                    // ENTSCHÄRFT: Verkauft erst als Stop-Loss, wenn ein echter Absturz droht (< 0.45)
                    let stopLoss = data.forecast < 0.45; 
                    let deadCapital = data.volatility < 0.001;
                    
                    // LANGER ATEM: Verkauft erst, wenn der Trend unter 0.50 fällt UND guter Profit da ist
                    let profitTake = data.forecast < 0.50 && netProfit > Math.max(FEE_ROUND_TRIP * 5, purchaseCost * 0.02);

                    if (stopLoss || deadCapital || profitTake) {
                        let soldPrice = ns.stock.sellStock(data.sym, data.shares);
                        if (soldPrice > 0) {
                            let reason = stopLoss ? "STOP-LOSS" : (deadCapital ? "STAGNATION" : "PROFIT");
                            log(ns, `EXIT [${reason}]: ${data.sym} | Netto: $${ns.format.number(netProfit)}`, "WARN");
                        }
                    }
                }
            }

            // --- KAUF-LOGIK (50/50 Split & Hold) ---
            myMoney = ns.getServerMoneyAvailable("home");
            
            // Aktien-Budget ist exakt 50% vom Nettovermögen. 
            // Was einmal investiert ist, bleibt dort, selbst wenn myMoney sinkt!
            let targetStockValue = netWorth * 0.50;
            let freeBudgetForStocks = targetStockValue - stockValue;
            let tradingBudget = Math.max(0, Math.min(freeBudgetForStocks, myMoney - profile.safetyReserve));

            let candidates = marketData
                .filter(d => d.forecast >= 0.51 && d.volatility >= 0.001 && d.shares < d.maxShares)
                .sort((a, b) => b.momentumScore - a.momentumScore);

            if (candidates.length > 0 && tradingBudget > 1_500_000) ns.writePort(2, "STOCK_ACTIVE");
            else ns.clearPort(2);

            if (tradingBudget >= 1_500_000) {
                let maxSpendPerStock = Math.max(1_500_000, tradingBudget * MAX_PORTFOLIO_PCT);

                for (let best of candidates) {
                    if (tradingBudget < 1_500_000) break;

                    let spaceLeft = best.maxShares - best.shares;
                    let affordableByBudget = Math.floor((maxSpendPerStock - 100_000) / best.askPrice);
                    let affordableByMoney = Math.floor((tradingBudget - 100_000) / best.askPrice);
                    
                    let desiredShares = Math.min(spaceLeft, affordableByBudget, affordableByMoney);
                    let investmentVolume = desiredShares * best.askPrice;

                    if (desiredShares > 0 && investmentVolume >= 1_500_000) {
                        let cost = investmentVolume + 100_000;
                        
                        if (myMoney >= cost) {
                            let purchased = ns.stock.buyStock(best.sym, desiredShares);
                            if (purchased > 0) {
                                ns.writePort(1, "PAUSE_BATCHING");
                                let feeImpact = ((200_000 / investmentVolume) * 100).toFixed(1);
                                log(ns, `DIAMOND BUY: ${best.sym} | Vol: $${ns.format.number(investmentVolume)} | Fee: ${feeImpact}%`, "SUCCESS");
                                
                                tradingBudget -= cost;
                                myMoney -= cost; 
                                stockValue += investmentVolume; 
                            }
                        }
                    }
                }
            }
        } catch (e) {
            ns.print("[CRITICAL ERROR] " + e);
        }
    }
}