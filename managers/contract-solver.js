import { log } from "D:/Development/Bitburner/AUTOMATION/AUTOMATION/lib/logger.js";

/*TODO: Implement file creation and management for contract solving statistics based on this function in the dashboard.js 
 // 4. Solver-Statistiken aus optionaler Log-Datei einlesen (falls vom Solver geschrieben)
        let solvedCount = 0;
        let failedCount = 0;
        try {
            if (ns.fileExists("D:/Development/Bitburner/AUTOMATION/AUTOMATION/data/contract-stats.json", "home")) {
                let stats = JSON.parse(ns.read("D:/Development/Bitburner/AUTOMATION/AUTOMATION/data/contract-stats.json"));
                solvedCount = stats.solved || 0;
                failedCount = stats.failed || 0;
            }
        } catch (e) {}. */

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Master-Contract-Solver (Production Ready) aktiv.", "INFO");
    const STATS_PATH = "D:/Development/Bitburner/AUTOMATION/AUTOMATION/data/contract-stats.json";

    // Ensure stats file exists on startup
    await ensureStatsFile(ns, STATS_PATH);

    while (true) {
        try {
            let servers = getNetwork(ns);
            
            for (let server of servers) {
                let files = ns.ls(server, ".cct");
                
                for (let file of files) {
                    try {
                        let type = ns.codingcontract.getContractType(file, server);
                        let data = ns.codingcontract.getData(file, server);
                        let answer = solveContract(type, data);
                        
                        if (answer !== undefined && answer !== null) {
                            let reward = ns.codingcontract.attempt(answer, file, server, { returnReward: true });
                            if (reward) {
                                log(ns, `[SUCCESS] '${type}' auf '${server}' gelöst! Belohnung: ${reward}`, "SUCCESS");
                                try { await incrementSolved(ns, STATS_PATH); } catch (e) {}
                            } else {
                                log(ns, `[FAIL] Fehler beim Einlösen von '${type}' auf '${server}' (Falsche Antwort).`, "WARN");
                                try { await incrementFailed(ns, STATS_PATH); } catch (e) {}
                            }
                        } else {
                            log(ns, `[INFO] Unbekannter oder nicht unterstützter Vertrag: '${type}' auf '${server}'.`, "WARN");
                        }
                    } catch (innerErr) {
                        // Fängt Fehler bei einzelnen korrupten Contracts ab, ohne den Loop zu stoppen
                        try { await incrementFailed(ns, STATS_PATH); } catch (e) {}
                    }
                }
            }
        } catch (outerErr) {
            // Globaler Netzwerkschutz
            try { await incrementFailed(ns, STATS_PATH); } catch (e) {}
        }
        
        // Alle 60 Sekunden das Netzwerk prüfen
        await ns.sleep(60000);
    }
}

function getNetwork(ns) {
    let servers = ["home"];
    for (let i = 0; i < servers.length; i++) {
        let scan = ns.scan(servers[i]);
        for (let node of scan) {
            if (!servers.includes(node)) servers.push(node);
        }
    }
    return servers;
}

async function ensureStatsFile(ns, path) {
    try {
        if (!ns.fileExists(path, "home")) {
            ns.write(path, JSON.stringify({ solved: 0, failed: 0 }), "w");
            return;
        }
        // If file exists but is corrupt, reinitialize
        try {
            JSON.parse(ns.read(path));
        } catch (e) {
            ns.write(path, JSON.stringify({ solved: 0, failed: 0 }), "w");
        }
    } catch (e) {
        // best-effort
    }
}

function readStats(ns, path) {
    try {
        if (!ns.fileExists(path, "home")) return { solved: 0, failed: 0 };
        const raw = ns.read(path);
        const obj = JSON.parse(raw);
        return { solved: obj.solved || 0, failed: obj.failed || 0 };
    } catch (e) {
        return { solved: 0, failed: 0 };
    }
}

function writeStats(ns, path, stats) {
    try {
        ns.write(path, JSON.stringify({ solved: stats.solved || 0, failed: stats.failed || 0 }), "w");
    } catch (e) {
        // ignore
    }
}

async function incrementSolved(ns, path) {
    try {
        const s = readStats(ns, path);
        s.solved = (s.solved || 0) + 1;
        writeStats(ns, path, s);
    } catch (e) {}
}

async function incrementFailed(ns, path) {
    try {
        const s = readStats(ns, path);
        s.failed = (s.failed || 0) + 1;
        writeStats(ns, path, s);
    } catch (e) {}
}

function solveContract(type, data) {
    switch (type) {
        case "Largest Prime Factor":
        case "Find Largest Prime Factor": {
            let n = data;
            let factor = 2;
            while (n > (factor * factor)) {
                if (n % factor === 0) {
                    n = n / factor;
                    factor = 2;
                } else {
                    factor++;
                }
            }
            return n > factor ? n : factor;
        }
        case "Subarray with Maximum Sum": {
            let maxSoFar = data[0];
            let currentMax = data[0];
            for (let i = 1; i < data.length; i++) {
                currentMax = Math.max(data[i], currentMax + data[i]);
                maxSoFar = Math.max(maxSoFar, currentMax);
            }
            return maxSoFar;
        }
        case "Total Ways to Sum":
        case "Total Ways to Sum II": {
            let ways = new Array(data + 1).fill(0);
            ways[0] = 1;
            for (let i = 1; i < data; i++) {
                for (let j = i; j <= data; j++) {
                    ways[j] += ways[j - i];
                }
            }
            return ways[data];
        }
        case "Spiralize Matrix": {
            let matrix = JSON.parse(JSON.stringify(data));
            let result = [];
            while (matrix.length > 0 && matrix[0].length > 0) {
                result = result.concat(matrix.shift());
                for (let i = 0; i < matrix.length; i++) {
                    result.push(matrix[i].pop());
                }
                if (matrix.length > 0) {
                    result = result.concat(matrix.pop().reverse());
                }
                for (let i = matrix.length - 1; i >= 0; i--) {
                    result.push(matrix[i].shift());
                }
            }
            return result;
        }
        case "Minimum Path Sum in a Triangle": {
            let triangle = JSON.parse(JSON.stringify(data));
            for (let r = triangle.length - 2; r >= 0; r--) {
                for (let c = 0; c <= r; c++) {
                    triangle[r][c] += Math.min(triangle[r+1][c], triangle[r+1][c+1]);
                }
            }
            return triangle[0][0];
        }
        case "Unique Paths in a Grid I": {
            let [n, m] = data;
            let dp = Array(n).fill(0).map(() => Array(m).fill(0));
            for (let i = 0; i < n; i++) dp[i][0] = 1;
            for (let j = 0; j < m; j++) dp[0][j] = 1;
            for (let i = 1; i < n; i++) {
                for (let j = 1; j < m; j++) {
                    dp[i][j] = dp[i-1][j] + dp[i][j-1];
                }
            }
            return dp[n-1][m-1];
        }
        case "Unique Paths in a Grid II": {
            let grid = data;
            let rows = grid.length;
            let cols = grid[0].length;
            let dp = Array(rows).fill(0).map(() => Array(cols).fill(0));
            dp[0][0] = grid[0][0] === 1 ? 0 : 1;
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    if (grid[i][j] === 1) {
                        dp[i][j] = 0;
                    } else {
                        if (i > 0) dp[i][j] += dp[i-1][j];
                        if (j > 0) dp[i][j] += dp[i][j-1];
                    }
                }
            }
            return dp[rows-1][cols-1];
        }
        case "Algorithmic Stock Trader I": {
            let maxProfit = 0;
            let minPrice = data[0];
            for (let price of data) {
                if (price < minPrice) minPrice = price;
                if (price - minPrice > maxProfit) maxProfit = price - minPrice;
            }
            return maxProfit;
        }
        case "Algorithmic Stock Trader II": {
            let profit = 0;
            for (let i = 1; i < data.length; i++) {
                if (data[i] > data[i - 1]) {
                    profit += data[i] - data[i - 1];
                }
            }
            return profit;
        }
        case "Algorithmic Stock Trader III": {
            let t1Cost = Infinity, t1Profit = 0;
            let t2Cost = Infinity, t2Profit = 0;
            for (let p of data) {
                t1Cost = Math.min(t1Cost, p);
                t1Profit = Math.max(t1Profit, p - t1Cost);
                t2Cost = Math.min(t2Cost, p - t1Profit);
                t2Profit = Math.max(t2Profit, p - t2Cost);
            }
            return t2Profit;
        }
        case "Encryption I: Caesar Cipher": {
            let [plainText, shift] = data;
            let cipher = "";
            for (let i = 0; i < plainText.length; i++) {
                let c = plainText[i];
                if (c >= 'A' && c <= 'Z') {
                    let code = ((c.charCodeAt(0) - 65 - shift + 26) % 26) + 65;
                    cipher += String.fromCharCode(code);
                } else {
                    cipher += c;
                }
            }
            return cipher;
        }
        case "Find All Valid IP Addresses": {
            let s = data;
            let ret = [];
            for (let i = 1; i < 4 && i < s.length; i++) {
                for (let j = i + 1; j < i + 4 && j < s.length; j++) {
                    for (let k = j + 1; k < j + 4 && k < s.length; k++) {
                        let p1 = s.substring(0, i);
                        let p2 = s.substring(i, j);
                        let p3 = s.substring(j, k);
                        let p4 = s.substring(k, s.length);
                        if (isValidIpPart(p1) && isValidIpPart(p2) && isValidIpPart(p3) && isValidIpPart(p4)) {
                            ret.push(`${p1}.${p2}.${p3}.${p4}`);
                        }
                    }
                }
            }
            return ret;
        }
        default:
            return undefined;
    }
}

function isValidIpPart(str) {
    if (str.length > 1 && str.startsWith("0")) return false;
    let val = parseInt(str);
    return val >= 0 && val <= 255;
}