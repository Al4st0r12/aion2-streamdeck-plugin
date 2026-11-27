# AION 2 Stats für Elgato Stream Deck

![AION 2 Stats Logo](assets/brand/plugin-logo.png)

![AION 2 Stats Banner](assets/brand/plugin-banner.png)

**Aktuelle Version: 1.0.0.0** · [Änderungen ansehen](CHANGELOG.md) · [Ältere Versionen herunterladen](https://github.com/Al4st0r12/aion2-streamdeck-plugin/releases)

Ein Stream-Deck-Plugin mit zwei Tasten für AION 2:

- **AION 2 CP & Gearscore** zeigt Combat Power, Item Level, Charaktername, Klasse und Level aus dem öffentlichen Charakterprofil. Änderungen zu den zuletzt geladenen Werten werden mit Pfeil und Differenz markiert; die Taste zeigt außerdem die Uhrzeit und den Verbindungsstatus der letzten Aktualisierung. Bei einem API-Fehler bleiben die letzten gespeicherten Werte sichtbar und werden als offline/veraltet markiert. Verlauf und Zeitstempel bleiben auch nach einem Neustart gespeichert. Die Taste aktualisiert sich standardmäßig alle fünf Minuten; ein Tastendruck lädt die Werte sofort neu.
- **Nächstes Shugo-Festival** zeigt den Countdown über dem offiziellen Shugo-Festa-Eingangsicon. Die visuelle Vorwarnung lässt sich pro Taste auf 0, 1, 3, 5 oder 10 Minuten einstellen. Ein zusätzlicher Signalton kann unabhängig davon konfiguriert werden; Klangstil und Lautstärke sind ebenfalls einstellbar. In der Vorwarnzeit wird der Timer farblich hervorgehoben; in den letzten 30 Sekunden blinkt das Shugo-Logo. Während der ersten drei Minuten wird die verbleibende Anmeldezeit angezeigt. Die Serverregion ist ebenfalls pro Taste auswählbar.
- Im Einstellungsfenster wird die installierte Version mit dem neuesten öffentlichen GitHub-Release verglichen. Wenn ein Update verfügbar ist, führt der Download-Link direkt zur Release-Seite. Die Prüfung speichert das Ergebnis lokal bis zu 30 Minuten; dafür werden keine Charakter- oder Kontodaten gesendet.

## Weitere AION-2-Website

[BBAION – Website öffnen](https://bbaion.nightclubcity.de/)

## Plugin installieren und einrichten

1. Stream Deck 7.1 oder neuer öffnen.
2. [AION 2 Stats v1.0.0.0 herunterladen und mit einem Doppelklick installieren](https://github.com/Al4st0r12/aion2-streamdeck-plugin/releases/download/v1.0.0.0/AION-2-Stats-1.0.0.0.streamDeckPlugin). Stream Deck fragt gegebenenfalls nach, ob das Plugin installiert werden soll.
3. **AION 2 CP & Gearscore** auf eine Taste ziehen.
4. Für die Statistiken im Einstellungsbereich Charaktername und Region eintragen. Falls der Name mehrfach vorkommt, zusätzlich den Server setzen. Die Shugo-Taste kann unabhängig davon verwendet werden.

Node.js 24 und `npm install` werden nur benötigt, wenn du den Quellcode selbst bauen möchtest.

## Aus dem Quellcode bauen

1. Node.js 24 installieren.
2. In diesem Ordner `npm install` ausführen.
3. `npm run package` baut das Plugin und aktualisiert automatisch die fertige Installationsdatei in `release/`.

Weitere Befehle: `npm run build` kompiliert das Plugin; `npm run watch` baut bei Änderungen erneut.

## Datenquelle und Grenzen

Das Plugin liest ausschließlich öffentliche Charakterprofile der offiziellen AION-2-Webseite und benötigt keinen Login oder API-Schlüssel. Es greift nicht auf den Spielprozess, Speicher oder Netzwerkverkehr des Spiels zu. Nicht gelistete oder nicht öffentliche Charaktere können nicht angezeigt werden. Die Endpunkte sind nicht als stabile Entwickler-API dokumentiert und können sich ändern.

Der angezeigte Gearscore kommt aus dem offiziellen Profilfeld **Item Level**. Die Aktualisierung hängt davon ab, wann NCSOFT das öffentliche Charakterprofil aktualisiert. Der Shugo-Timer folgt dem veröffentlichten stündlichen Zeitplan; die Anmeldung ist während der ersten drei Minuten offen. Die einstellbare Vorwarnung ist ein lokaler visueller Hinweis und ändert den Spielzeitplan nicht. Das im Timer verwendete Shugo-Festa-Eingangsicon stammt aus dem vom Nutzer bereitgestellten Spielbild.

