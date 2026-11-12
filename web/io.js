/*
 * Calcutron-LV-Extraktion – Ein-/Ausgabe (Favoriten, LV-xlsx, GAEB X83, Barebone, Prüfliste)
 * Benötigt SheetJS (XLSX) und einen DOMParser (Browser oder @xmldom/xmldom).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.LVXIO = factory(root.LVX);
})(typeof self !== 'undefined' ? self : this, function (LVX) {
  'use strict';

  const SPALTEN = ['Position', 'Internal Position', 'Type', 'Description', 'Product Catalog Code', 'Product External ID',
    'Product/Service Wage Type', 'Time (minutes)', 'Quantity', 'Profit Surcharge', 'Supplementary Surcharge', 'Surcharge Type', 'Notes'];

  // ---------------------------------------------------------------- Favoriten

  function liesFavoriten(XLSX, wb, dateiname) {
    const los = String(dateiname || '').replace(/^Barebone\s+/i, '').replace(/\.xlsx$/i, '');
    const ws = wb.Sheets['Quotation'];
    if (!ws) throw new Error('Blatt „Quotation“ fehlt in ' + dateiname);
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    const out = [];
    for (const r of rows.slice(1)) {
      if (!r || !r[2]) continue;
      out.push({
        los, pos: String(r[0]), typ: String(r[2]), desc: r[3] == null ? '' : String(r[3]),
        cat: r[4], ext: r[5] == null ? null : String(r[5]), wage: r[6], time: r[7], qty: r[8],
        profit: r[9], supp: r[10], stype: r[11], notes: r[12] == null ? '' : String(r[12])
      });
    }
    return out;
  }

  function infoBlatt(XLSX, wb) {
    const ws = wb.Sheets['Info'];
    return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) : null;
  }

  // ---------------------------------------------------------------- LV aus xlsx

  /**
   * Akzeptiert
   *  a) einfache LV-Tabelle mit Kopfzeile (OZ | Kurztext | Langtext | Menge | Einheit), Spaltennamen flexibel
   *  b) Calcutron-Barebone (Blatt „Quotation“): Gruppen = Positionen, Notes = Langtext.
   *     Vorhandene PRODUCT-Zeilen werden als Referenz für die Auswertung mitgeführt.
   */
  function liesLvXlsx(XLSX, wb) {
    if (wb.Sheets['Quotation']) return liesBareboneAlsLv(XLSX, wb);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    let kopf = -1, idx = {};
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const r = (rows[i] || []).map(x => LVX.norm(x || ''));
      const f = name => r.findIndex(x => name.test(x));
      const oz = f(/^(oz|pos|position|ordnungszahl|pos\.?-?nr)/), kt = f(/kurztext|bezeichnung|beschreibung|text/);
      if (kt >= 0) {
        kopf = i;
        idx = { oz, kt, lt: f(/langtext|notes|notiz|details/), menge: f(/^menge|^anzahl|^stk|^qty/), einheit: f(/einheit|^me$/), ref: f(/^(referenz|soll|erwartet|ext)/) };
        break;
      }
    }
    if (kopf < 0) throw new Error('Keine Kopfzeile mit „Kurztext“ gefunden');
    const pos = [];
    for (const r of rows.slice(kopf + 1)) {
      if (!r) continue;
      const kt = r[idx.kt];
      if (kt == null || String(kt).trim() === '') continue;
      pos.push({
        oz: idx.oz >= 0 && r[idx.oz] != null ? String(r[idx.oz]) : String(pos.length + 1),
        kurztext: String(kt), langtext: idx.lt >= 0 && r[idx.lt] != null ? String(r[idx.lt]) : '',
        menge: idx.menge >= 0 && r[idx.menge] != null ? Number(String(r[idx.menge]).replace(',', '.')) || 1 : 1,
        einheit: idx.einheit >= 0 && r[idx.einheit] != null ? String(r[idx.einheit]) : 'St',
        referenz: idx.ref >= 0 && r[idx.ref] != null ? String(r[idx.ref]).split(/[,;\s]+/).filter(Boolean) : null
      });
    }
    return { quelle: 'xlsx', titel: null, positionen: pos };
  }

  function liesBareboneAlsLv(XLSX, wb) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Quotation'], { header: 1, defval: null, raw: true }).slice(1).filter(r => r && r[2]);
    const pos = [];
    // Blatt-Gruppen (Gruppen ohne Untergruppen) bzw. Gruppen mit Notes werden zu Positionen
    const istGruppe = r => r[2] === 'GROUP';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!istGruppe(r)) continue;
      const p = String(r[0]);
      const kinder = rows.filter(x => String(x[0]).startsWith(p + '.') && String(x[0]).split('.').length === p.split('.').length + 1);
      const hatUntergruppen = kinder.some(istGruppe);
      const produkte = rows.filter(x => !istGruppe(x) && String(x[0]).startsWith(p + '.') && String(x[0]).split('.').length === p.split('.').length + 1);
      if (hatUntergruppen && !produkte.length) continue;
      const teile = p.split('.');
      const titelPfad = [];
      for (let k = 1; k < teile.length; k++) {
        const vor = teile.slice(0, k).join('.');
        const g = rows.find(x => istGruppe(x) && String(x[0]) === vor);
        if (g) titelPfad.push({ oz: vor, name: String(g[3] || '') });
      }
      pos.push({
        oz: p, titelPfad, kurztext: String(r[3] || ''), langtext: String(r[12] || ''), menge: Number(r[8]) || 1, einheit: 'St',
        referenz: produkte.map(x => x[5] ? String(x[5]) : null).filter(Boolean),
        referenzZeilen: produkte.map(x => ({ ext: x[5], desc: x[3], menge: x[8] }))
      });
    }
    return { quelle: 'barebone', titel: rows[0] ? String(rows[0][3] || '') : null, positionen: pos };
  }

  // ---------------------------------------------------------------- GAEB X83

  function textAus(el) {
    if (!el) return '';
    let s = '';
    const lauf = n => {
      for (let c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) s += c.nodeValue;
        else if (c.nodeType === 1) {
          const tag = c.localName || c.nodeName;
          if (/^(br)$/i.test(tag)) s += '\n';
          lauf(c);
          if (/^(p|div|TextOutlTxt|DetailTxt)$/i.test(tag)) s += '\n';
        }
      }
    };
    lauf(el);
    return s.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  }

  function kinderNamens(el, name) {
    const out = [];
    for (let c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (c.localName || c.nodeName) === name) out.push(c);
    return out;
  }
  function ersterNachfahre(el, name) {
    const l = el.getElementsByTagNameNS ? el.getElementsByTagNameNS('*', name) : el.getElementsByTagName(name);
    return l && l.length ? l[0] : null;
  }

  function liesX83(xml, DOMParserImpl) {
    const DP = DOMParserImpl || (typeof DOMParser !== 'undefined' ? DOMParser : null);
    const doc = new DP().parseFromString(xml, 'text/xml');
    const boq = ersterNachfahre(doc, 'BoQ');
    if (!boq) throw new Error('Keine GAEB-Leistungsbeschreibung (BoQ) gefunden');
    const titelEl = ersterNachfahre(boq, 'LblTx') || ersterNachfahre(doc, 'NamePrj');
    const pos = [];
    const lauf = (body, praefix) => {
      if (!body) return;
      for (const ctg of kinderNamens(body, 'BoQCtgy')) {
        const nr = (ctg.getAttribute('RNoPart') || '').trim();
        const name = textAus(kinderNamens(ctg, 'LblTx')[0]);
        const sub = kinderNamens(ctg, 'BoQBody')[0];
        lauf(sub, praefix.concat({ nr, name }));
      }
      for (const il of kinderNamens(body, 'Itemlist')) {
        for (const it of kinderNamens(il, 'Item')) {
          const nr = (it.getAttribute('RNoPart') || '').trim();
          const qty = kinderNamens(it, 'Qty')[0];
          const qu = kinderNamens(it, 'QU')[0];
          const desc = kinderNamens(it, 'Description')[0];
          let kurz = '', lang = '';
          if (desc) {
            const ct = kinderNamens(desc, 'CompleteText')[0];
            if (ct) {
              kurz = textAus(ersterNachfahre(ct, 'OutlineText')) || textAus(ersterNachfahre(ct, 'TextOutlTxt'));
              lang = textAus(ersterNachfahre(ct, 'DetailTxt'));
            }
            if (!kurz) kurz = textAus(kinderNamens(desc, 'OutlineText')[0]) || textAus(desc).split('\n')[0];
          }
          pos.push({
            oz: praefix.map(p => p.nr).concat(nr).filter(Boolean).join('.'),
            titel: praefix.map(p => p.name).join(' / '),
            titelPfad: praefix.map((p, i) => ({ oz: praefix.slice(0, i + 1).map(x => x.nr).filter(Boolean).join('.'), name: p.name })),
            kurztext: kurz, langtext: lang,
            menge: qty ? Number(textAus(qty).replace(',', '.')) || 1 : 1,
            einheit: qu ? textAus(qu) : 'St'
          });
        }
      }
    };
    lauf(kinderNamens(boq, 'BoQBody')[0], []);
    return { quelle: 'x83', titel: textAus(titelEl) || null, positionen: pos };
  }

  // ---------------------------------------------------------------- Ausgabe

  function produktZeile(pos, a, menge, notizZusatz) {
    if (a.typ === 'PLACEHOLDER') return [pos, pos, 'PLACEHOLDER', a.desc, null, null, null, null, menge, null, null, null, a.notes || null];
    const zusatzNotiz = notizZusatz ? (a.notes ? a.notes + '\n' : '') + notizZusatz : a.notes;
    return [pos, pos, a.typ === 'SERVICE' ? 'SERVICE' : 'PRODUCT', a.desc, a.cat, a.ext,
      a.wage || 'Journeyman',
      a.time == null || a.time === '' ? 0 : a.time,
      menge,
      a.profit == null || a.profit === '' ? '0.00' : String(a.profit),
      a.supp == null || a.supp === '' ? '0.00' : String(a.supp),
      a.stype || 'ABSOLUTE',
      zusatzNotiz || null];
  }
  function gruppenZeile(pos, text, menge, notes) { return [pos, pos, 'GROUP', text, null, null, null, null, menge, null, null, null, notes || null]; }
  function platzhalterZeile(pos, text, notes) { return [pos, pos, 'PLACEHOLDER', text, null, null, null, null, 1, null, null, null, notes || null]; }

  const AMPEL_TEXT = { gruen: 'grün', gelb: 'gelb', rot: 'rot', manuell: 'Platzhalter' };

  /**
   * ergebnisse: Liste aus LVX.verarbeitePosition
   * Rückgabe: { zeilen (Barebone-Quotation), pruef (Prüfliste), fallbackLohn }
   */
  function baueAusgabe(titel, ergebnisse) {
    const zeilen = [SPALTEN];
    const pruef = [['Position', 'OZ', 'Ampel', 'LV-Kurztext', 'Erkannte Merkmale', 'Gewählt: Hersteller', 'Gewählt: Ext. ID', 'Gewählt: Bezeichnung', 'Menge je Stück', 'Hinweis', 'Kandidaten (Top 5)', 'Referenz', 'Referenz-Treffer']];
    zeilen.push(gruppenZeile('1', titel || 'Calcutron-LV-Extraktion', 1, 'Erzeugt mit Calcutron-LV-Extraktion (heuristisch, ohne KI)'));
    let n = 0;
    const lohnFallback = [];
    const schreibe = (posNr, erg, menge, oz, kurztext, referenz) => {
      let gewaehlt = null;
      if (erg.paket) {
        zeilen.push(gruppenZeile(posNr, erg.paket.desc, 1, [erg.paket.notes, erg.hinweise.filter(h => /^PL:/.test(h)).join('\n')].filter(Boolean).join('\n') || null));
        let k = 0;
        for (const it of erg.paket.items) {
          const z = produktZeile(posNr + '.' + (++k), it, it.qty == null ? 1 : it.qty);
          if (!it.wage) lohnFallback.push(posNr + '.' + k);
          zeilen.push(z);
        }
        gewaehlt = erg.paket.items[0];
      } else if (erg.artikel) {
        const notiz = erg.hinweise.filter(h => /^PL:/.test(h)).join('\n');
        zeilen.push(produktZeile(posNr, erg.artikel, menge, notiz));
        if (!erg.artikel.wage) lohnFallback.push(posNr);
        gewaehlt = erg.artikel;
      } else {
        const pl = erg.placeholder || 'OFFEN: ' + (kurztext || erg.text || '').slice(0, 60);
        zeilen.push(platzhalterZeile(posNr, pl, ['PL: ' + (erg.hinweise.join('; ') || 'nicht zugeordnet'), erg.text].join('\n')));
      }
      const refTreffer = referenz && referenz.length ? (gewaehlt && referenz.includes(String(gewaehlt.ext)) ? 'ja' : 'nein') : '';
      pruef.push([posNr, oz, AMPEL_TEXT[erg.ampel], (kurztext || erg.text || '').slice(0, 120), LVX.merkmalText(erg.m) + (erg.typ ? ' [' + LVX.TYP_NAME[erg.typ] + ']' : ''),
        gewaehlt ? (erg.paket ? erg.paket.hersteller : erg.artikel.hersteller) : '', gewaehlt ? gewaehlt.ext : '',
        gewaehlt ? (erg.paket ? 'Paket: ' + erg.paket.desc : gewaehlt.desc) : '', menge,
        erg.hinweise.join('; '),
        (erg.kandidaten || []).slice(0, 5).map(k => `${k.hersteller || ''} ${k.ext || ''} ${String(k.desc || '').replace(/\n/g, ' ').slice(0, 40)}`).join(' | '),
        referenz ? referenz.join(', ') : '', refTreffer]);
    };
    for (const e of ergebnisse) {
      n++;
      const gpos = '1.' + n;
      const p = e.pos;
      zeilen.push(gruppenZeile(gpos, `${p.oz} ${p.kurztext}`.slice(0, 250), p.menge || 1, p.langtext || null));
      let k = 0;
      if (e.haupt) schreibe(gpos + '.' + (++k), e.haupt, Number(p._menge) > 0 ? Number(p._menge) : 1, p.oz, p.kurztext, e.unter.length ? null : p.referenz);
      for (const u of e.unter) { if (!u.aus) schreibe(gpos + '.' + (++k), u.erg, u.menge, p.oz, u.erg.text, null); }
      for (const z of (e.zusatz || []).filter(z => z.gruppe)) {
        // Favoritengruppe mit allen Unterzeilen; Gruppenmenge = eingetragene Menge (z. B. Länge in m)
        const gp = gpos + '.' + (++k);
        const gr = z.gruppe;
        zeilen.push(gruppenZeile(gp, gr.desc, z.menge, gr.notes || null));
        for (const r of gr.zeilen) {
          const np = gp + r.pos.slice(gr.pos.length);
          if (r.typ === 'GROUP') zeilen.push(gruppenZeile(np, r.desc, r.qty == null ? 1 : r.qty, r.notes || null));
          else { zeilen.push(produktZeile(np, r, r.qty == null ? 1 : r.qty)); if (r.typ !== 'PLACEHOLDER' && !r.wage) lohnFallback.push(np); }
        }
        pruef.push([gp, p.oz, 'Gruppe', 'Zusatzgruppe (von Hand)', '', '', '', gr.desc, z.menge, `${gr.anzahl} Artikel aus ${String(gr.los).split(' ')[0]} ${gr.pos}`, '', '', '']);
      }
      for (const z of (e.zusatz || []).filter(z => z.artikel)) schreibe(gpos + '.' + (++k), { ampel: 'gruen', artikel: z.artikel, hinweise: ['Zusatzartikel (von Hand)'], m: z.artikel.m || {}, text: z.artikel.desc }, z.menge, p.oz, z.artikel.desc, null);
      if (!e.haupt && !e.unter.length && !(e.zusatz || []).length) schreibe(gpos + '.1', { ampel: 'rot', hinweise: ['nicht verarbeitet'], m: {}, text: p.kurztext }, 1, p.oz, p.kurztext, p.referenz);
    }
    lohnFallback.forEach(p => {
      const z = pruef.find(r => r[0] === p);
      if (z) z[9] = (z[9] ? z[9] + '; ' : '') + 'Lohngruppe fehlte im Favorit → Journeyman';
    });
    return { zeilen, pruef };
  }

  function schreibeBarebone(XLSX, zeilen, info) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(zeilen);
    ws['!cols'] = [10, 10, 12, 50, 10, 16, 14, 10, 9, 10, 10, 12, 60].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
    if (info) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Info');
    return wb;
  }

  function schreibePruefliste(XLSX, pruef) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(pruef);
    ws['!cols'] = [10, 8, 7, 45, 30, 12, 14, 40, 8, 60, 80, 14, 9].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Prüfliste');
    return wb;
  }

  return { SPALTEN, liesFavoriten, infoBlatt, liesLvXlsx, liesX83, baueAusgabe, schreibeBarebone, schreibePruefliste };
});
