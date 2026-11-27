# Änderungsprotokoll

## 0.2.9.0 — Verbindungsstatus und Offline-Werte

- Bei erfolgreicher Abfrage zeigt die Charaktertaste „ONLINE“ mit Aktualisierungszeit.
- Bei API- oder Verbindungsfehlern bleiben die letzten gespeicherten Charakterwerte auf der Taste sichtbar und werden mit „OFFLINE“ sowie „ALT“ markiert.
- Beim erneuten Laden wird der Status „PRÜFE“ angezeigt; erfolgreiche Aktualisierungen schalten ihn zurück auf „ONLINE“.
- GitHub-Quellordner in `AION-2-Stats.sdPlugin` umbenannt; die Stream-Deck-Kennung bleibt unverändert.

### Aktualisieren

1. [AION-2-Stats-0.2.9.0.streamDeckPlugin herunterladen](https://github.com/Al4st0r12/aion2-streamdeck-plugin/releases/download/v0.2.9.0/AION-2-Stats-0.2.9.0.streamDeckPlugin) und doppelklicken.
2. Bei einem Ausfall bleiben die letzten bekannten Werte erhalten. Sobald eine Abfrage wieder gelingt, wechselt die Taste zurück zu „ONLINE“.

## 0.2.8.0 — Verlauf bleibt gespeichert

- Der letzte Combat-Power- und Item-Level-Stand sowie die Aktualisierungszeit bleiben je Charaktertaste auch nach einem Neustart von Stream Deck erhalten.
- README ergänzt um den Link zur [BBAION-Website](https://bbaion.nightclubcity.de/).

### Aktualisieren

1. [AION-2-Stats-0.2.8.0.streamDeckPlugin herunterladen](https://github.com/Al4st0r12/aion2-streamdeck-plugin/releases/download/v0.2.8.0/AION-2-Stats-0.2.8.0.streamDeckPlugin) und doppelklicken.
2. Die Änderungspfeile vergleichen Werte weiterhin mit dem zuletzt erfolgreich gespeicherten Stand.

## 0.2.7.0 — Charakterverlauf und Shugo-Erinnerungen

- Combat-Power- und Item-Level-Änderungen erscheinen mit Richtungspfeil, Farbe und Differenz zur letzten erfolgreichen Aktualisierung. Der Verlauf bleibt pro Taste auch nach einem Stream-Deck-Neustart gespeichert.
- Die Uhrzeit der letzten Aktualisierung ist auf der Charaktertaste und im Einstellungsbereich sichtbar.
- Shugo-Erinnerungen bieten einen zweiten, optionalen Signalzeitpunkt sowie drei Klangstile und einstellbare Lautstärke.
- Bei Profil-, Server-, Verbindungs- und AION-2-Dienstfehlern gibt es konkrete Hinweise auf der Taste und im Einstellungsbereich.

### Aktualisieren

1. [AION-2-Stats-0.2.7.0.streamDeckPlugin herunterladen](https://github.com/Al4st0r12/aion2-streamdeck-plugin/releases/download/v0.2.7.0/AION-2-Stats-0.2.7.0.streamDeckPlugin) und doppelklicken.
2. Auf der Shugo-Taste können zweiter Hinweiszeitpunkt, Klangstil und Lautstärke angepasst werden.

Vorhandene Charakter- und Regions-Einstellungen bleiben erhalten.

## 0.2.6.0 — Akustischer Shugo-Hinweis

- Zu Beginn der gewählten Shugo-Vorwarnung ertönt einmalig ein leiser Signalton.
- Der Signalton kann pro Stream-Deck-Taste in den Einstellungen deaktiviert werden.
- Bestehende Shugo-Tasten übernehmen den Signalton standardmäßig; Region und Vorwarnzeit bleiben gespeichert.

### Aktualisieren

1. Die Datei [AION-2-Stats-0.2.6.0.streamDeckPlugin](https://github.com/Al4st0r12/aion2-streamdeck-plugin/releases/download/v0.2.6.0/AION-2-Stats-0.2.6.0.streamDeckPlugin) herunterladen.
2. Datei doppelklicken und die Aktualisierung in Stream Deck bestätigen.
3. Auf der Shugo-Taste lässt sich der Signalton im Einstellungsbereich ausschalten.

Vorhandene Charakter-, Regions- und Vorwarneinstellungen bleiben beim Aktualisieren erhalten.

## 0.2.5.0 — Shugo-Timer erweitert

- Einstellbare visuelle Vorwarnung pro Stream-Deck-Taste: aus, 1, 3, 5 oder 10 Minuten vor dem nächsten Shugo-Festival.
- Während der Vorwarnung werden Countdown und Status farblich hervorgehoben.
- Das Shugo-Logo blinkt weiterhin automatisch in den letzten 30 Sekunden vor dem Start.
- Während des dreiminütigen Anmeldefensters zählt der Timer die verbleibende Anmeldezeit herunter.
- Die ausgewählte Region und Vorwarnung werden je Taste gespeichert.

### Aktualisieren

1. Die Datei [AION-2-Stats-0.2.5.0.streamDeckPlugin](https://github.com/Al4st0r12/aion2-streamdeck-plugin/releases/download/v0.2.5.0/AION-2-Stats-0.2.5.0.streamDeckPlugin) herunterladen.
2. Datei doppelklicken und die Aktualisierung in Stream Deck bestätigen.
3. Eine vorhandene Shugo-Taste auswählen und Region sowie Vorwarnung im Einstellungsbereich festlegen.

Vorhandene Charaktereinstellungen bleiben beim Aktualisieren erhalten. Die Shugo-Vorwarnung ist standardmäßig auf 5 Minuten eingestellt; sie lässt sich jederzeit auf „Aus“ stellen.
