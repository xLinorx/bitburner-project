# Änderungen

## 2026-07-26

### Dispatcher: vollständige Netzwerk-Infiltration und Verteilung
- Der Dispatcher scannt den erreichbaren Netzwerkgraphen vollständig ab.
- Für jeden erreichbaren Server wird geprüft, ob Root-Rechte vorhanden sind. Wenn nicht, werden die verfügbaren Port-Programme genutzt und anschließend `ns.nuke(server)` ausgeführt, sofern die Voraussetzungen erfüllt sind.
- Der beste Zielserver wird über den gesamten erreichbaren, infiltrierten Serverraum bestimmt.
- Die Batch-Skripte werden auf allen infiltrierbaren Hosts verteilt, sofern ausreichend RAM vorhanden ist.

### Relevanter Code im Dispatcher
```js
let reachableServers = getReachableServers(ns);
for (let server of reachableServers) {
    if (server === "home") continue;
    if (ns.hasRootAccess(server)) continue;

    let portsNeeded = ns.getServerNumPortsRequired(server);
    let openPorts = 0;
    if (ns.fileExists("BruteSSH.exe", "home")) { ns.brutessh(server); openPorts++; }
    if (ns.fileExists("FTPCrack.exe", "home")) { ns.ftpcrack(server); openPorts++; }
    if (ns.fileExists("relaySMTP.exe", "home")) { ns.relaysmtp(server); openPorts++; }
    if (ns.fileExists("HTTPWorm.exe", "home")) { ns.httpworm(server); openPorts++; }
    if (ns.fileExists("SQLInject.exe", "home")) { ns.sqlinject(server); openPorts++; }

    if (openPorts >= portsNeeded) {
        try { ns.nuke(server); } catch (e) {}
    }
}
```

```js
let target = getBestTarget(ns, reachableServers);
let hostServers = reachableServers.filter(server => server !== "home" && ns.hasRootAccess(server));
```

```js
function getReachableServers(ns, startServer = "home") {
    const visited = new Set([startServer]);
    const queue = [startServer];

    while (queue.length > 0) {
        const current = queue.shift();
        for (const neighbor of ns.scan(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return Array.from(visited);
}
```
