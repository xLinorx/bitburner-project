---
description: Änderungen am Dispatcher für Netzwerkscan, Root-Zugriff und Batch-Verteilung.
layout:
  width: default
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: false
  outline:
    visible: false
  pagination:
    visible: true
  metadata:
    visible: false
  tags:
    visible: true
  actions:
    visible: false
---

# Änderungen

## 2026-07-26

### Dispatcher: Netzwerkscan und Batch-Verteilung

Der Dispatcher erkennt erreichbare Server jetzt automatisch. Er versucht Root-Zugriff zu erhalten und nutzt geeignete Hosts für Batch-Skripte.

#### Verhalten

* Der Dispatcher durchsucht den von `home` erreichbaren Netzwerkgraphen vollständig.
* Für Hosts ohne Root-Zugriff nutzt er alle verfügbaren Port-Programme.
* Bei ausreichend geöffneten Ports führt er `ns.nuke(server)` aus.
* Die Zielauswahl berücksichtigt alle erreichbaren Server.
* Batch-Skripte laufen nur auf Hosts mit Root-Zugriff und freiem RAM.
* `home` wird bei der Host-Auswahl ausgeschlossen.

#### Voraussetzungen

* Port-Programme müssen auf `home` liegen.
* Ein Server benötigt mindestens die geforderte Anzahl geöffneter Ports.
* Die Batch-Verteilung benötigt ausreichenden freien RAM auf dem Host.

### Implementierungsdetails

#### Root-Zugriff erhalten

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

Der Dispatcher überspringt `home` und bereits gerootete Server. Fehler beim Nuking eines Servers unterbrechen den Durchlauf nicht.

#### Ziel und Hosts bestimmen

```js
let target = getBestTarget(ns, reachableServers);
let hostServers = reachableServers.filter(server => server !== "home" && ns.hasRootAccess(server));
```

Die Zielauswahl verwendet die vollständige Liste erreichbarer Server. Die Host-Liste enthält nur gerootete Server außerhalb von `home`.

#### Netzwerk durchsuchen

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

Die Breitensuche besucht jeden Host höchstens einmal und gibt alle erreichbaren Server zurück.
