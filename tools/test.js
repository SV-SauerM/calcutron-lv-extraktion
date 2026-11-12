// Testlauf: node tools/test.js <LV-Datei (.xlsx/.x83)> [...]
const fs = require('fs'), path = require('path'), XLSX = require('xlsx');
const { DOMParser } = require('@xmldom/xmldom');
const LVX = require('../src/engine.js'), IO = require('../src/io.js');
const fav = (() => { global.window = {}; require('../web/favoriten.js'); return global.window.LVX_FAVORITEN; })();
const index = LVX.baueIndex(fav.zeilen);
fs.mkdirSync(path.join(__dirname, '..', 'out'), { recursive: true });
for (const datei of process.argv.slice(2)) {
  const lv = /\.x8\d$/i.test(datei) ? IO.liesX83(fs.readFileSync(datei, 'utf8'), DOMParser) : IO.liesLvXlsx(XLSX, XLSX.readFile(datei));
  const erg = lv.positionen.map(p => LVX.verarbeitePosition(p, index));
  const { zeilen, pruef } = IO.baueAusgabe(lv.titel || path.basename(datei), erg);
  const name = path.basename(datei).replace(/\.\w+$/, '');
  XLSX.writeFile(IO.schreibeBarebone(XLSX, zeilen, fav.info), `out/Barebone ${name}.xlsx`);
  XLSX.writeFile(IO.schreibePruefliste(XLSX, pruef), `out/Prüfliste ${name}.xlsx`);
  const z = { gruen: 0, gelb: 0, rot: 0 }; let ref = 0, refOk = 0, gruenRef = 0, gruenOk = 0;
  for (const e of erg) {
    z[e.ampel]++;
    const g = e.haupt ? (e.haupt.paket ? e.haupt.paket.items[0] : e.haupt.artikel) : null;
    const r = e.pos.referenz && e.pos.referenz.length ? e.pos.referenz : null;
    let tr = '';
    if (r) { ref++; const ok = g && r.includes(String(g.ext)); if (ok) refOk++; if (e.ampel === 'gruen') { gruenRef++; if (ok) gruenOk++; } tr = ok ? 'OK ' : 'FALSCH'; }
    console.log(`${e.pos.oz.padEnd(5)} ${e.ampel.padEnd(5)} ${tr.padEnd(6)} ${String(e.pos.kurztext).slice(0, 48).padEnd(48)} → ${g ? (e.haupt.paket ? e.haupt.paket.hersteller : e.haupt.artikel.hersteller) + ' ' + g.ext : (e.unter.length ? e.unter.length + ' Bestückungszeilen' : '-')} ${r ? '(soll ' + r.join('/') + ')' : ''}`);
    for (const h of (e.haupt ? e.haupt.hinweise : [])) console.log('        · ' + h);
    for (const u of e.unter) console.log(`        + ${u.menge}x ${u.erg.ampel} ${u.erg.text.slice(0, 40)} → ${u.erg.artikel ? u.erg.artikel.hersteller + ' ' + u.erg.artikel.ext : '-'} ${u.erg.hinweise.join('; ')}`);
  }
  console.log(`\n${name}: ${erg.length} Positionen | grün ${z.gruen} | gelb ${z.gelb} | rot ${z.rot} | Referenz-Treffer ${refOk}/${ref} | davon grün korrekt ${gruenOk}/${gruenRef}\n`);
}
