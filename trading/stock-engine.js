import { log } from "/lib/logger.js";
import { getGameProfile } from "/lib/profile.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "HIGH-IMPACT STOCK ENGINE aktiv (Stabilitäts-Fix)", "SUCCESS");

    const HISTORY = {};
    const HISTORY_LEN = 40;

    while (true) {
        try {
            let profile = getGameProfile(ns);
            let money = ns.getServerMoneyAvailable("home");

            // === 1. API-Käufe (WSE, TIX, 4S) ============================
            let apiBudget = money - profile.safetyReserve;
            if (apiBudget > 0) {
                try { if (!ns.stock.hasWSEAccount()) ns.stock.purchaseWseAccount(); } catch {}
                try { if (!ns.stock.hasTixApiAccess()) ns.stock.purchaseTixApi(); } catch {}
                try { if (!ns.stock.has4SDataTixApi()) ns.stock.purchase4SMarketDataTixApi(); } catch {}
            }

            // === 2. Historie aktualisieren ==============================
            let symbols = [];
            try { symbols = ns.stock.getSymbols(); } catch { symbols = []; }

            for (let sym of symbols) {
                let price = ns.stock.getPrice(sym);
                if (!HISTORY[sym]) HISTORY[sym] = [];
                HISTORY[sym].push(price);
                if (HISTORY[sym].length > HISTORY_LEN) HISTORY[sym].shift();
            }

            // === 3. Forecast / Momentum ================================
            function getMomentum(sym) {
                let h = HISTORY[sym];
                if (!h || h.length < 5) return 0.5;

                let recent = h.slice(-5);
                let older = h.slice(0, -5);

                let avgRecent = recent.reduce((a,b)=>a+b,0) / recent.length;
                let avgOlder = older.reduce((a,b)=>a+b,0) / older.length;

                return avgRecent > avgOlder ? 0.60 : 0.40;
            }

            // === 4. Aktienbewertung ====================================
            let candidates = [];
            for (let sym of symbols) {
                let price = ns.stock.getPrice(sym);
                let momentum = ns.stock.has4SDataTixApi()
                    ? ns.stock.getForecast(sym)
                    : getMomentum(sym);

                candidates.push({ sym, price, momentum });
            }

            candidates.sort((a,b)=>b.momentum - a.momentum);

            // === 5. Corp-Trigger (150b Nettovermögen) ===================
            let stockValue = 0;
            for (let sym of symbols) {
                let [shares, avg] = ns.stock.getPosition(sym);
                if (shares > 0) stockValue += shares * ns.stock.getBidPrice(sym);
            }

            let netWorth = money + stockValue;

            if (profile.phase === "LATE" && netWorth >= 150e9) {
                log(ns, "CORP-TRIGGER ausgelöst! Liquidation aller Positionen...", "WARN");

                for (let sym of symbols) {
                    let [shares] = ns.stock.getPosition(sym);
                    if (shares > 0) ns.stock.sell(sym, shares);
                }

                ns.writePort(2, "CORP_READY");
                await ns.sleep(5000);
                continue;
            }

            // === 6. Trading-Budget (Two-Tier) ===========================
            let tradingBudget = money - 100e6;
            if (tradingBudget < 0) tradingBudget = 0;

            // === 7. Port-2-Lock setzen ==================================
            if (tradingBudget > 0) {
                ns.writePort(2, "STOCK_ACTIVE");
            }

            // === 8. Kauf/Verkauf ========================================
            for (let asset of candidates) {
                let { sym, price, momentum } = asset;
                let [shares, avg] = ns.stock.getPosition(sym);

                // Verkaufssignal
                if (shares > 0 && momentum < 0.52) {
                    ns.stock.sell(sym, shares);
                    log(ns, `SELL ${sym} (Momentum: ${momentum.toFixed(2)})`, "INFO");
                    continue;
                }

                // Kaufsignal
                if (momentum > 0.58 && tradingBudget > price * 10) {
                    let maxShares = Math.floor(tradingBudget / price);
                    let buyShares = Math.min(maxShares, 10000);

                    if (buyShares > 0) {
                        ns.stock.buy(sym, buyShares);
                        log(ns, `BUY ${sym} (${buyShares} Shares)`, "SUCCESS");
                    }
                }
            }

        } catch (e) {
            log(ns, `Stock Engine Fehler: ${String(e)}`, "ERROR");
        }

        await ns.sleep(1000);
    }
}
