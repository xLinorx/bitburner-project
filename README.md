# AUTOMATION

Ein modulares Automatisierungsframework für Bitburner v3.0.x mit Fokus auf Endgame-Optimierung, Cloud-Server-Management, Aktienhandel und autonomer Systemsteuerung.

## Übersicht

Dieses Repository enthält ein eigenständiges Framework für Bitburner, das mehrere Subsysteme und Manager zur vollständigen Automatisierung des Spiels kombiniert. Dazu gehören Batch-Hacking, Cloud-Server-Steuerung, Aktienmarkt-Management, Kontrakt- und Corporation-Automatisierung sowie eine Live-Dashboard-Oberfläche.

## Hauptfeatures

- Phasenorientiertes Ressourcenmanagement für Early-, Mid-, Late- und Endgame
- Automatische Cloud-Server-Verwaltung und RAM-Skalierung
- Hardware-optimierte HWGW-Batching-Engine für Hack/Grow/Weaken
- Autonomer Aktienhandel mit 4S-Datenintegration
- Vollständige Automatisierung von Corporation, Gang, Bladeburner, Hacknet, Darkweb und Stanek
- Robuste Diagnose-, Logging- und Fehlerbehandlungsmechanismen
- TUI-Dashboard für Spielstatus und Systemmetriken

## Projektstruktur

- `boot.js` - Master-Boot-Skript, Startsequenz und Diagnose
- `DOKU.txt` - Technische Projektdokumentation
- `CHANGES.md` - Änderungsprotokoll
- `NetscriptDefinitions.d.ts` - TypeScript-Definitionen für Bitburner

### Ordner

- `batching/`
  - `dispatcher.js`
  - `hack.js`
  - `grow.js`
  - `weaken.js`
- `lib/`
  - `logger.js`
  - `profile.js`
- `managers/`
  - `ascension-manager.js`
  - `bladeburner-manager.js`
  - `cloud-manager.js`
  - `contract-solver.js`
  - `corp-manager.js`
  - `darkweb-manager.js`
  - `favor-optimizer.js`
  - `gang-manager.js`
  - `hacknet-manager.js`
  - `home-upgrade-manager.js`
  - `nuke-manager.js`
  - `staneks-optimizer.js`
  - `task-manager.js`
- `trading/`
  - `stock-engine.js`
- `ui/`
  - `dashboard.js`

## Installation

1. Kopiere den Ordner in dein Bitburner `scripts`-Verzeichnis oder speichere ihn in dein Spieler-Repository.
2. Stelle sicher, dass alle Quelldateien verfügbar sind.
3. Starte das System mit dem Master-Bootskript.

## Nutzung

Führe das Projekt in Bitburner mit dem folgenden Befehl aus:

```bash
run AUTOMATION/boot.js
```

Das Bootskript führt Diagnoseprüfungen aus, beendet alte Prozesse und startet alle Subsysteme automatisch.

## Update aus GitHub

Dieses Repository enthält ein Update-Skript `update.js`, das die ausführbaren Projektdateien direkt aus dem GitHub-Branch lädt.

- `run update.js dev` lädt die Skripte aus dem `dev`-Branch.
- `run update.js main` lädt die Skripte aus dem `main`-Branch.
- Es werden nur die JavaScript-Dateien (`*.js`) geladen, keine Dokumente wie `DOKU.txt` oder `README.md`.

Beispiel:

```bash
run update.js dev
```

Wichtig:

- Das Bitburner-Update-Skript verwendet `ns.wget()` auf `raw.githubusercontent.com`.
- Das GitHub-Repository muss öffentlich sein, damit Bitburner die Dateien direkt herunterladen kann.

## Hinweise

- `DOKU.txt` enthält ausführliche Systemdokumentation zu Architektur und Designprinzipien.
- `CHANGES.md` dokumentiert neuere Änderungen und Verbesserungen.
- Dieses Repository ist für Bitburner v3.0.1+ ausgelegt.

## Lizenz

Keine Lizenz angegeben. Verwende den Code nach eigenem Ermessen oder ergänze eine Lizenzdatei, falls erforderlich.
