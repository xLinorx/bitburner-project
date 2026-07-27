/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("Zwei-Wege-Early-Stock-Trader gestartet (Low RAM)...");

    const HISTORY_LENGTH = 30;
    const MIN_TX_VAL = 10_000_000; // Mindestens 10M pro Transaktion wegen 100k Gebühr
    const KEEP_CASH = 5_000_000;   // 5M Reserve behalten

    const priceHistory = {};

    while (true) {
        if (!ns.stock.hasWseAccount() || !ns.stock.hasTixApiAccess()) {
            ns.print("Warten auf WSE-Konto und TIX-API-Zugang...");
            await ns.sleep(10000);
            continue;
        }

        try {
            await ns.stock.nextUpdate();
        } catch (e) {
            ns.print("Fehler beim Warten auf Aktien-Update: " + e);
            await ns.sleep(6000);
            continue;
        }

        let symbols = ns.stock.getSymbols();

        // 1. Historie und Prognosen aktualisieren
        let candidates = [];
        for (let sym of symbols) {
            let askPrice = ns.stock.getAskPrice(sym);
            let bidPrice = ns.stock.getBidPrice(sym);
            let [shares, avgPrice] = ns.stock.getPosition(sym);

            if (!priceHistory[sym]) priceHistory[sym] = [];
            priceHistory[sym].push(askPrice);
            if (priceHistory[sym].length > HISTORY_LENGTH) priceHistory[sym].shift();

            let forecast = 0.5;
            let history = priceHistory[sym];
            if (history.length >= 10) {
                let increases = 0;
                for (let i = 1; i < history.length; i++) {
                    if (history[i] > history[i - 1]) increases++;
                }
                forecast = increases / (history.length - 1);
            }

            candidates.push({
                sym,
                forecast,
                askPrice,
                bidPrice,
                shares,
                avgPrice
            });
        }

        // 2. VERKAUFS-LOGIK (Zuerst verkaufen, um Kapital freizugeben)
        for (let c of candidates) {
            if (c.shares > 0) {
                // Wenn die Prognose unter 0.52 sinkt, verkaufen wir
                if (c.forecast < 0.52) {
                    let soldPrice = ns.stock.sellStock(c.sym, c.shares);
                    if (soldPrice > 0) {
                        let profit = c.shares * (soldPrice - c.avgPrice) - 200_000;
                        ns.tprint(`[STOCK] EXIT: ${c.sym} verkauft | Gewinn: $${ns.format.number(profit)}`);
                    }
                }
            }
        }

        // 3. KAUF-LOGIK
        // Aktualisiere Geldbestand nach Verkäufen
        let myMoney = ns.getServerMoneyAvailable("home");
        let spendable = myMoney - KEEP_CASH;

        if (spendable >= MIN_TX_VAL) {
            // Sortiere Kandidaten mit bester Prognose (>= 0.60) nach oben
            let buyCandidates = candidates
                .filter(c => c.forecast >= 0.60)
                .sort((a, b) => b.forecast - a.forecast);

            for (let c of buyCandidates) {
                let maxShares = ns.stock.getMaxShares(c.sym);
                let [shares] = ns.stock.getPosition(c.sym);
                let spaceLeft = maxShares - shares;

                if (spaceLeft <= 0) continue;

                // Wie viel können wir uns leisten?
                let maxAffordable = Math.floor((spendable - 100_000) / c.askPrice);
                let toBuy = Math.min(spaceLeft, maxAffordable);
                let cost = toBuy * c.askPrice;

                if (toBuy > 0 && cost >= MIN_TX_VAL) {
                    let boughtShares = ns.stock.buyStock(c.sym, toBuy);
                    if (boughtShares > 0) {
                        ns.tprint(`[STOCK] BUY: ${c.sym} | ${ns.format.number(boughtShares)} Shares für $${ns.format.number(cost)} gekauft (Prognose: ${(c.forecast * 100).toFixed(1)}%)`);
                        spendable -= (cost + 100_000);
                    }
                }
            }
        }
    }
}
