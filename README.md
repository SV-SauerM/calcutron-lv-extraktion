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

Synthetisches Test-LV, 30 Positionen: grün 21, gelb 9, rot 0 (NSHV jetzt als Feld aus LOS02, immer gelb). Von 18 grünen Positionen mit Referenz stimmen 17 mit der Referenz überein; die Abweichung ist ein gleichwertiger Dehn-Ableiter.

Aussagekraft begrenzt: Die Testtexte sind selbst formuliert. Der eigentliche Test folgt mit echten LV-/Angebots-Paaren.

## Nachgezogen aus OM-TOOL (Stand 13.11.2026)

Regeln, die nach der Übergabe an OM-TOOL (`calcutron-vibes/OM-TOOL`) dort ergänzt wurden, gelten auch hier:

- **STLB-Bau:** Kurztext „STLB-Bau“ (bzw. leer, „STLB“, „Standardleistungsbuch“) wird in Tabelle, Gruppenname und Prüfliste durch den Anfang des Langtexts ersetzt; der Abgleich liest weiter den Originaltext. Einzelangaben „Höhe '700' mm“, „Breite …“, „Tiefe …“ und „Anzahl Teilungseinheiten '48'“ (= PLE) werden gelesen.
- **Schrankhöhe ist Mindestmaß bei Wand- und Kleinverteilern** (unter 1600 mm, nicht Stand/Anreih), solange ein ausreichend hoher Schrank passt; sonst gelb „PL: kein Schrank mit Höhe ≥ … mm“. Standschränke und NSHV-Felder: Maße nächstliegend wie bisher. Fehlende Einzelmaße werden nicht verglichen. Vorgabe auch als `H700` oder `700 hoch`.
- **Hohlwand-/Unterputzverteiler** (Hohlwand, Trockenbauwand, Ständerwand, Unterputz): nur passende Verteiler aus LOS03 (komplett mit Innenausstattung), nie ein Aufputzschrank als Ersatz; sonst rot „OFFEN: Hohlwandverteiler“.
- **Herstellerprofil:** Button „Alle Kategorien auf ‚Standard Hundt‘“.
- Unterzeilen in der Tabelle deutlicher eingerückt.

## Automatik Sammelschienen und Leistungsschalter (Stand 12.11.2026)

Gilt für Schaltfelder aus LOS03.1 (Einspeise-, Kuppel-, Abgangs-, Leistenfeld, Sammelschienensystem):

| Fall | Zusatz | Größe | Länge |
|---|---|---|---|
| jedes Feld | Hauptsammelschiene (LOS04) | Nennstrom wie LV; Einspeise-/Kuppelfeld zusätzlich Icw ≥ LV | Feldbreite |
| Leistungsschalter im Feldtext ausgeschrieben | Leistungsschalter (LOS06-Gruppe bevorzugt) + Feldverteilschiene | FVS ≥ Nennstrom Leistungsschalter | 1,40 m |
| SL-/NH-Leisten-Abgangsfeld | Hauptsammelschiene laut LV + Feldverteilschiene 3-polig | FVS = Hauptsammelschiene, max. 1600 A | 1,40 m + Feldbreite |
| eigene LV-Position Leistungsschalter ≥ 400 A | Feldverteilschiene | ≥ Nennstrom, Polzahl wie Schalter | 1,40 m |

Ohne Nennstrom im Leistenfeld gilt der Nennstrom der Hauptsammelschiene aus dem übrigen LV.
