---
description: >-
  Modulares Bitburner-Automatisierungsframework für Endgame-Optimierung und
  autonome Systemsteuerung.
---

# Automation

Dieses Framework automatisiert Bitburner v3.0.x. Es optimiert Endgame-Abläufe, verwaltet Cloud-Server und handelt Aktien autonom.

## Übersicht

Das Repository bündelt spezialisierte Manager und Subsysteme. Sie automatisieren zentrale Spielabläufe in einer gemeinsamen Laufzeit.

Enthalten sind Batch-Hacking, Cloud-Server-Verwaltung und Aktienhandel. Das Framework automatisiert außerdem Contracts, Corporations und weitere Endgame-Systeme. Ein Dashboard zeigt Status und Kennzahlen live an.

Einige Module benötigen Geld, Root-Zugriff oder freigeschaltete APIs. Sie stehen erst nach dem entsprechenden Spielfortschritt zur Verfügung.

## Funktionen

* Ressourcenmanagement für Early, Mid, Late und Endgame.
* Cloud-Server-Verwaltung mit automatischer RAM-Skalierung.
* HWGW-Batching für Hack, Grow und Weaken.
* Aktienhandel mit optionalen 4S-Daten.
* Manager für Corporation, Gang, Bladeburner, Hacknet, Darkweb und Stanek.
* Diagnosen, Logging, Fehlerbehandlung und TUI-Dashboard.

### Voraussetzungen

* Verwende Bitburner `v3.0.1` oder neuer.
* Stelle alle Projektdateien auf `home` bereit.
* Der Dispatcher benötigt Root-Zugriff und freien RAM auf Zielhosts.
* API- und kaufabhängige Funktionen starten erst nach ihrer Freischaltung.

## Projektstruktur

### Dateien

* `boot.js` — Startskript und Diagnose
* `DOKU.txt` — technische Dokumentation
* `CHANGES.md` — Änderungsprotokoll
* `NetscriptDefinitions.d.ts` — TypeScript-Definitionen für Bitburner

### Verzeichnisse

* `batching/` — `dispatcher.js`, `hack.js`, `grow.js`, `weaken.js`
* `lib/` — `logger.js`, `profile.js`
* `managers/` — Manager für Fortschritt, Infrastruktur und Endgame-Systeme
* `trading/` — `stock-engine.js`
* `ui/` — `dashboard.js`

## Installation

Folge der Anleitung [How to install and usage](./).

1. Erstelle `install.js` in Bitburner.
2. Führe `run install.js main` aus.
3. Prüfe, ob `boot.js` auf `home` vorhanden ist.

## Nutzung

Starte das Framework auf `home`:

```bash
run boot.js
```

Das Skript führt Diagnosen aus und beendet alte Prozesse. Anschließend startet es alle Subsysteme.

{% hint style="warning" %}
Der Start kann laufende Prozesse beeinflussen. Prüfe `boot.js`, bevor du es in einem bestehenden Spielstand ausführst.
{% endhint %}

## Updates aus GitHub

`update.js` lädt ausführbare Projektdateien direkt aus einem GitHub-Branch.

* `run update.js dev` lädt den Branch `dev`.
* `run update.js main` lädt den Branch `main`.
* Das Skript lädt nur JavaScript-Dateien.

Beispiel für den `dev`-Branch:

```bash
run update.js dev
```

{% hint style="warning" %}
Das Update-Skript verwendet `ns.wget()` mit `raw.githubusercontent.com`. Das Repository muss öffentlich sein.
{% endhint %}

{% hint style="warning" %}
Updates können lokale Änderungen an Projektdateien überschreiben. Sichere Anpassungen vor dem Update.
{% endhint %}

## Fehlerbehebung

* **`boot.js` fehlt:** Führe `run update.js main` erneut aus.
* **Ein Modul startet nicht:** Prüfe RAM, Root-Zugriff und benötigte APIs.
* **Update schlägt fehl:** Prüfe Branch-Namen und Repository-Erreichbarkeit.

## Hinweise

* `DOKU.txt` beschreibt Architektur und Designprinzipien ausführlich.
* `CHANGES.md` dokumentiert Änderungen und Verbesserungen.
* Das Framework unterstützt Bitburner v3.0.1 und neuer.

## Lizenz

Für dieses Repository ist keine Lizenz angegeben. Ergänze eine Lizenzdatei, wenn du Nutzungsrechte festlegen möchtest.
