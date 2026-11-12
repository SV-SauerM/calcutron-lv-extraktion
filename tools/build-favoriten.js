// Liest Favoritengruppen/*.xlsx und schreibt web/favoriten.js (für Browser, auch per Doppelklick)
// sowie web/beispiel.js (Beispiel-LV für den Start der Seite). Favoriten enthalten keine Preise.
const fs = require('fs'), path = require('path'), XLSX = require('xlsx');
const IO = require('../src/io.js');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'Favoritengruppen');
const zeilen = []; let info = null;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).sort()) {
  const wb = XLSX.readFile(path.join(dir, f));
  zeilen.push(...IO.liesFavoriten(XLSX, wb, f));
  if (!info) info = IO.infoBlatt(XLSX, wb);
}
const stand = new Date().toISOString().slice(0, 10);
const daten = { stand, zeilen, info };
fs.writeFileSync(path.join(root, 'web', 'favoriten.js'), 'window.LVX_FAVORITEN = ' + JSON.stringify(daten) + ';\n');
const lv = IO.liesLvXlsx(XLSX, XLSX.readFile(path.join(root, 'tests', 'LV synthetisch 146327.xlsx')));
lv.titel = 'Beispiel-LV (synthetisch, angelehnt an 146327)';
fs.writeFileSync(path.join(root, 'web', 'beispiel.js'), 'window.LVX_BEISPIEL = ' + JSON.stringify(lv) + ';\n');
for (const f of ['engine.js', 'io.js']) fs.copyFileSync(path.join(root, 'src', f), path.join(root, 'web', f));
console.log('Favoriten:', zeilen.length, 'Zeilen, Stand', stand);
