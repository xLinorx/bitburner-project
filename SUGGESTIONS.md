# Vorschläge und Verbesserungen

## Dispatcher-Checkliste

### 1. Netzwerk- und Infiltrationslogik
- [ ] Prüfen, ob der Dispatcher den kompletten erreichbaren Netzwerkgraphen zuverlässig erfasst.
- [ ] Sicherstellen, dass alle erreichbaren Server mit Root-Zugang berücksichtigt werden.
- [ ] Falls ein Server nicht infiltrierbar ist, sauber überspringen statt Fehler zu erzeugen.
- [ ] Bei fehlenden Port-Tools oder unzureichender Ausstattung keine Abstürze verursachen.

### 2. Zielauswahl
- [ ] Prüfen, ob `getBestTarget` wirklich das beste Ziel für den aktuellen Stand auswählt.
- [ ] Bei mehreren potenziellen Zielen ggf. Priorisierung nach Geld-/Sicherheitsverhältnis ergänzen.
- [ ] Sicherstellen, dass `pserv`-Server oder andere Spezialserver nicht fälschlich als Ziele verwendet werden.

### 3. Ressourcen- und RAM-Handling
- [ ] Prüfen, ob der Dispatcher bei sehr wenig freier RAM korrekt pausiert oder frühzeitig abbricht.
- [ ] Sicherstellen, dass Threads nicht über die verfügbare RAM hinaus geplant werden.
- [ ] Optional: Reserve-RAM für andere Skripte oder Manager einplanen.

### 4. Start- und Laufzeitstabilität
- [ ] Verhindern, dass der Dispatcher mehrfach dieselben Skripte auf demselben Server startet.
- [ ] Prüfen, ob alte Prozesse sauber beendet oder ersetzt werden, bevor neue Batch-Skripte starten.
- [ ] Wenn ein Zielserver nicht mehr erreichbar ist, die Batch-Tasks sauber stoppen oder neu verteilen.

### 5. Logging und Debugging
- [ ] Wichtige Zustände wie Zielserver, Hostserver und verfügbare RAM protokollieren.
- [ ] Fehlerfälle in den Logs nachvollziehbar machen.
- [ ] Optional: Metriken für Anzahl deployter Hosts und gestarteter Threads sammeln.

### 6. Zukunftsorientierte Verbesserungen
- [ ] Überlegung: Dispatcher kann später auch auf individuelle Zielprioritäten oder Ziellisten reagieren.
- [ ] Überlegung: Batch-Deployment könnte auf mehreren Zielklassen basieren (z. B. High-Value, Low-Risk, Backup-Hosts).
- [ ] Überlegung: Infiltrations- und Deploy-Logik könnten weiter getrennt werden, damit die Verantwortlichkeiten noch klarer sind.
