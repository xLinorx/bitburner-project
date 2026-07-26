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

## 2026-07-26 14:30 - HWGW-Engine Komplette Optimierung

### Dispatcher: Maximierung des Geldflusses durch präzise Batch-Kalkulation

Der Dispatcher wurde vollständig optimiert für maximalen Geldfluss mit garantierter 25% Hack-Quote pro Server-Zyklus.

#### Hauptverbesserungen

* **25% Hack-Quote garantiert**: Verwendet `ns.hackAnalyze()` für exakte Berechnung der Hack-Threads
* **Optimale HWGW-Verhältnisse**: Thread-Verhältnisse werden dynamisch pro Target berechnet
* **Intelligente Grow-Berechnung**: Basiert auf tatsächlichem Wachstumsbedarf via `ns.growthAnalyze()`
* **Präzise Weaken-Threads**: Berechnet aus Security-Steigerung von Hack + Grow Operationen
* **Keine Restart-Zyklen**: Batche folgen natürlichem HWGW-Rhythmus ohne unnötige Unterbrechungen
* **RAM-Budgetierung**: `calculateRamPerBatch()` berechnet exakten RAM-Bedarf pro Batch
* **Stabile Server**: Alle Worker-Server halten maximale Geldmengen
* **Multi-Target-Verteilung**: Top 10 Targets werden parallel mit Round-Robin-Verteilung angegriffen

#### Batch-Berechnungslogik

```js
// Für jeden Target werden folgende Werte berechnet:
Hack-Threads = CEIL(25% / hackAnalyze(target))
Grow-Multiplier = 1 / (1 - 0.25) = 1.33
Grow-Threads = CEIL(growthAnalyze(target, 1.33))
Security-Anstieg = (Hack-Threads * 0.002) + (Grow-Threads * 0.004)
Weaken-Threads = CEIL(Security-Anstieg / 0.05)
```

#### Zyklus-Ablauf

1. Top 10 profitabelste Targets identifizieren (alle 10 Sekunden)
2. Für jeden Target: HWGW-Batch-Requirements berechnen
3. RAM-Budgets pro Server berechnen
4. Worker round-robin auf Targets verteilen
5. Batch-Sequenzen mit präzisen Delays ausführen
6. Schlaf bis nächster natürlicher Zyklus (Weaken-Zeit)

#### Performance-Metriken

* **Durchsatz**: Kontinuierlich 25% vom maximalen Server-Geld pro Zyklus
* **Sicherheit**: Alle Server bleiben auf Min-Security (Weaken ist Teil des HWGW)
* **Stabilität**: Volle Geldmengen während kontinuierlichen Hackers
* **RAM-Effizienz**: Keine verschwendeten Threads durch ungenaue Berechnungen

#### Timing-Optimierung

* Sleep-Zeit ist `MAX(Weaken-Zeiten aller Targets) + 500ms`
* Verhindert Overloading durch zu schnelle Batch-Starts
* Sorgt für konsistente, messbare Geldflussrate

#### Konfigurierbare Parameter

```js
const HACK_PERCENT = 0.25;           // 25% Hack-Quote
const targetUpdateInterval = 10000;  // Re-Evaluierung alle 10 Sekunden
const TOP_TARGETS = 10;              // Top 10 beste Targets gleichzeitig
```

#### Implementierungsdetails

Neue Funktion `calculateRamPerBatch()`:
- Summiert RAM-Kosten für alle HWGW-Skripte
- Gibt sichere Obergrenze für RAM-Check zurück
- Verhindert unvollständige Batch-Starts

Optimierte Targeting:
- `getBestTargets()` sortiert nach Score (maxMoney / minSec)
- Dynamische Neupriorisierung bei neuen besten Targets
- Kill-Funktion entfernt veraltete Skripte automatisch

---

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
