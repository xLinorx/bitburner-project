import { log } from "/lib/logger.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    log(ns, "Master-Contract-Solver (Production Ready) aktiv.", "INFO");

    const STATS_PATH = "contract-stats.json";   // FIX: Bitburner-kompatibel

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
                                await incrementSolved(ns, STATS_PATH);
                            } else {
                                log(ns, `[FAIL] Falsche Antwort für '${type}' auf '${server}'.`, "WARN");
                                await incrementFailed(ns, STATS_PATH);
                            }
                        } else {
                            log(ns, `[INFO] Unbekannter Vertrag: '${type}' auf '${server}'.`, "WARN");
                        }

                    } catch (innerErr) {
                        await incrementFailed(ns, STATS_PATH);
                    }
                }
            }

        } catch (outerErr) {
            await incrementFailed(ns, STATS_PATH);
        }

        await ns.sleep(60000);
    }
}

function getNetwork(ns) {
    let servers = ["home"];
    for (let i = 0; i < servers.length; i++) {
        for (let node of ns.scan(servers[i])) {
            if (!servers.includes(node)) servers.push(node);
        }
    }
    return servers;
}

async function ensureStatsFile(ns, path) {
    if (!ns.fileExists(path, "home")) {
        ns.write(path, JSON.stringify({ solved: 0, failed: 0 }), "w");
        return;
    }
    try {
        JSON.parse(ns.read(path));
    } catch {
        ns.write(path, JSON.stringify({ solved: 0, failed: 0 }), "w");
    }
}

function readStats(ns, path) {
    try {
        const raw = ns.read(path);
        const obj = JSON.parse(raw);
        return { solved: obj.solved || 0, failed: obj.failed || 0 };
    } catch {
        return { solved: 0, failed: 0 };
    }
}

function writeStats(ns, path, stats) {
    ns.write(path, JSON.stringify(stats), "w");
}

async function incrementSolved(ns, path) {
    const s = readStats(ns, path);
    s.solved++;
    writeStats(ns, path, s);
}

async function incrementFailed(ns, path) {
    const s = readStats(ns, path);
    s.failed++;
    writeStats(ns, path, s);
}

function solveContract(type, data) {
    switch (type) {
        case "Largest Prime Factor":
        case "Find Largest Prime Factor": {
            let n = data;
            let f = 2;
            while (n > f * f) {
                if (n % f === 0) n /= f;
                else f++;
            }
            return n;
        }

        case "Subarray with Maximum Sum": {
            let max = data[0], cur = data[0];
            for (let i = 1; i < data.length; i++) {
                cur = Math.max(data[i], cur + data[i]);
                max = Math.max(max, cur);
            }
            return max;
        }

        case "Total Ways to Sum":
        case "Total Ways to Sum II": {
            let ways = Array(data + 1).fill(0);
            ways[0] = 1;
            for (let i = 1; i < data; i++) {
                for (let j = i; j <= data; j++) {
                    ways[j] += ways[j - i];
                }
            }
            return ways[data];
        }

        case "Spiralize Matrix": {
            let m = JSON.parse(JSON.stringify(data));
            let out = [];
            while (m.length && m[0].length) {
                out.push(...m.shift());
                for (let r of m) out.push(r.pop());
                if (m.length) out.push(...m.pop().reverse());
                for (let r = m.length - 1; r >= 0; r--) out.push(m[r].shift());
            }
            return out;
        }

        case "Minimum Path Sum in a Triangle": {
            let t = JSON.parse(JSON.stringify(data));
            for (let r = t.length - 2; r >= 0; r--) {
                for (let c = 0; c <= r; c++) {
                    t[r][c] += Math.min(t[r+1][c], t[r+1][c+1]);
                }
            }
            return t[0][0];
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
            let g = data;
            let R = g.length, C = g[0].length;
            let dp = Array(R).fill(0).map(() => Array(C).fill(0));
            dp[0][0] = g[0][0] === 1 ? 0 : 1;
            for (let i = 0; i < R; i++) {
                for (let j = 0; j < C; j++) {
                    if (g[i][j] === 1) dp[i][j] = 0;
                    else {
                        if (i > 0) dp[i][j] += dp[i-1][j];
                        if (j > 0) dp[i][j] += dp[i][j-1];
                    }
                }
            }
            return dp[R-1][C-1];
        }

        case "Algorithmic Stock Trader I": {
            let min = data[0], max = 0;
            for (let p of data) {
                min = Math.min(min, p);
                max = Math.max(max, p - min);
            }
            return max;
        }

        case "Algorithmic Stock Trader II": {
            let profit = 0;
            for (let i = 1; i < data.length; i++) {
                if (data[i] > data[i-1]) profit += data[i] - data[i-1];
            }
            return profit;
        }

        case "Algorithmic Stock Trader III": {
            let t1c = Infinity, t1p = 0;
            let t2c = Infinity, t2p = 0;
            for (let p of data) {
                t1c = Math.min(t1c, p);
                t1p = Math.max(t1p, p - t1c);
                t2c = Math.min(t2c, p - t1p);
                t2p = Math.max(t2p, p - t2c);
            }
            return t2p;
        }

        case "Encryption I: Caesar Cipher": {
            let [txt, shift] = data;
            return txt.split("").map(c => {
                if (c >= 'A' && c <= 'Z') {
                    return String.fromCharCode(((c.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
                }
                return c;
            }).join("");
        }

        case "Find All Valid IP Addresses": {
            let s = data;
            let out = [];
            for (let i = 1; i < 4 && i < s.length; i++) {
                for (let j = i + 1; j < i + 4 && j < s.length; j++) {
                    for (let k = j + 1; k < j + 4 && k < s.length; k++) {
                        let p1 = s.slice(0, i);
                        let p2 = s.slice(i, j);
                        let p3 = s.slice(j, k);
                        let p4 = s.slice(k);
                        if (isValidIpPart(p1) && isValidIpPart(p2) && isValidIpPart(p3) && isValidIpPart(p4)) {
                            out.push(`${p1}.${p2}.${p3}.${p4}`);
                        }
                    }
                }
            }
            return out;
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
