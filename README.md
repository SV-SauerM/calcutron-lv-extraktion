# Calcutron-LV-Extraktion

Machbarkeitstest: LV-Positionen **rein heuristisch, ohne KI** den Calcutron-Favoritengruppen (LOS01–LOS19, LOS03.1) zuordnen und als importfähiges Calcutron-Barebone ausgeben.

Grundlage ist die Spezifikation im claude.ai-Projekt („Spezifikation Favoriten-Matcher.md“, v2.3).

## Benutzung

**Im Browser:** `web/index.html` öffnen (Repo als ZIP laden, entpacken, Doppelklick). Es läuft alles lokal im Browser, es werden keine Daten verschickt.

1. LV öffnen oder hineinziehen:
   - Calcutron-Barebone (`.xlsx`, Blatt „Quotation“; Gruppen = Positionen, Notes = Langtext)
   - einfache Tabelle mit Kopfzeile `OZ | Kurztext | Langtext | Menge | Einheit` (optional `Referenz` = erwartete Ext. IDs)
   - GAEB X83
2. Ergebnis mit Ampel prüfen, Hersteller je Position oder für alles umstellen.
3. „Barebone (.xlsx)“ und „Prüfliste (.xlsx)“ exportieren.

**Favoriten aktualisieren:** im Browser über den Button (ersetzt einzelne Lose, gilt nur in diesem Browser) oder dauerhaft für alle: neue Exporte in `Favoritengruppen/` legen und `node tools/build-favoriten.js` ausführen.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/engine.js` | Merkmalserkennung, Gerätetypen, Regeln (exakt/min/max), Herstellerprofil, Ampel, Schrankwahl, Bestückung |
| `src/io.js` | Einlesen (Favoriten, LV-xlsx, X83), Ausgabe Barebone und Prüfliste |
| `web/` | Browser-Oberfläche; `favoriten.js`, `beispiel.js`, `engine.js`, `io.js` werden von `tools/build-favoriten.js` erzeugt |
| `tools/test.js` | Testlauf auf der Kommandozeile: `node tools/test.js "tests/LV synthetisch 146327.xlsx"` |
| `tests/` | synthetisches Test-LV (Texte angelehnt an Barebone 146327, Referenz = dortige Artikel), X83-Beispiel |

## Stand 12.11.2026

Synthetisches Test-LV, 30 Positionen: grün 21, gelb 8, rot 0 (NSHV jetzt als Feld aus LOS02). Von 18 grünen Positionen mit Referenz stimmen 17 mit der Referenz überein; die Abweichung ist ein gleichwertiger Dehn-Ableiter.

Aussagekraft begrenzt: Die Testtexte sind selbst formuliert. Der eigentliche Test folgt mit echten LV-/Angebots-Paaren.
