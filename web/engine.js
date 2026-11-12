/*
 * Calcutron-LV-Extraktion – Kern (heuristischer Abgleich, ohne KI)
 * Läuft im Browser (window.LVX) und in Node (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LVX = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- Stammdaten

  const KATALOG = {
    HAG: 'Hager', HAH: 'Hager', MOE: 'Eaton', SIE: 'Siemens', ABB: 'ABB', SOC: 'Socomec',
    LO: 'Lovato', JMU: 'Jean Müller', EFE: 'Efen', KEL: "K'electric", DEH: 'Dehn',
    PHO: 'Phoenix', CIT: 'Citel', MEA00: 'Meanwell', PEO: 'Meanwell', JAN: 'Janitza',
    RED: 'Redur', WEI: 'Weidmüller', WAG: 'Wago', SCH: 'Schneider', MDT: 'MDT',
    HUN: 'Hundt', CAL00: 'Calcutron', HEN: 'Hensel', ADL: 'Adel', DEP: 'Deppe',
    MET: 'Meter', BEN: 'Bender', PCP: 'Ziehl', EGH: 'Eltako', SRK: 'Schrack', GOE: 'Göbel',
    SEK: 'SEKO', ICO: 'Icotek', EMK: 'EMKA', HEL: 'Helukabel'
  };

  // Gerätetypen: Reihenfolge = Priorität (spezifisch vor allgemein)
  const TYPEN = [
    { id: 'nshv', name: 'NSHV', re: /\b(nshv|niederspannungs-?haupt|hauptverteilung|schaltgeraetekombination|einspeisefeld|abgangsfeld|kuppelfeld)/ },
    { id: 'fi_ls', name: 'FI/LS', re: /(fi\s*\/\s*ls|fi-ls|rcbo|fehlerstrom-?\s*(?:und\s*)?leitungsschutz|fi-?ls-schalter|fi\/ls)/ },
    { id: 'afdd', name: 'Brandschutzschalter', re: /(afdd|brandschutzschalter|fehlerlichtbogen)/ },
    { id: 'fi', name: 'FI', re: /(fi-?schutzschalter|fehlerstrom-?schutzschalter|fi-?schalter|\brcd\b|\brccb\b|\bfi\b)/ },
    { id: 'ls', name: 'LS', re: /(leitungsschutzschalter|ls-?schalter|\blss?\b|\bmcb\b|sicherungsautomat|leitungsschutz-?automat)/ },
    { id: 'uss', name: 'Überspannungsschutz', re: /(ueberspannung|ableiter|blitzstrom|\bspd\b|dehnguard|dehnventil|\buess\b|\buss\b)/ },
    { id: 'umschalter', name: 'Umschalter', re: /(lastumschalter|netzumschalter|umschalter|\bats\b)/ },
    { id: 'nh_leiste', name: 'NH-Leiste', re: /(leiste|sasil|\bsl-?\d)/, need: /(nh|sicherung|sasil)/ },
    { id: 'nh_trenner', name: 'Sicherungslasttrenner', re: /(sicherungs-?lasttrenn|sicherungs-?lastschalter|nh-?trenner|nh-?lasttrenn|\blatr\b|ltl\d)/ },
    { id: 'sls', name: 'SLS', re: /(\bsls\b|selektive?r? haupt)/ },
    { id: 'lsw', name: 'Leistungsschalter', re: /(leistungsschalter|\bacb\b|\bmccb\b|izmx|\bnzm|\bhw[1-4]\b|kompaktschalter)/ },
    { id: 'lts', name: 'Lasttrennschalter', re: /(lasttrennschalter|lasttrenner|hauptschalter|trennschalter|lastschalter)/ },
    { id: 'sockel', name: 'Sicherungssockel', re: /(sicherungssockel|sicherungsunterteil|sicherungselement|sockel d0|d0[123]-?sockel|neozed-?sockel|kunstst\.?sockel|sockel)/, need: /(d0|neozed|sicherung|e18|e14|e33)/ },
    { id: 'sich_einsatz', name: 'Sicherungseinsatz', re: /(sicherungseinsatz|sicherungseinsaetze|schmelzeinsatz|nh-?sicherung)/ },
    { id: 'schraubkappe', name: 'Schraubkappe', re: /(schraubkappe)/ },
    { id: 'fernschalter', name: 'Fernschalter', re: /(fernschalter|stromstoss|eltako)/ },
    { id: 'zeitrelais', name: 'Zeitrelais', re: /(zeitrelais|treppenlicht)/ },
    { id: 'schuetz', name: 'Schütz', re: /(schuetz)/ },
    { id: 'koppelrelais', name: 'Koppelrelais', re: /(koppelrelais|relais)/ },
    { id: 'schaltuhr', name: 'Schaltuhr', re: /(schaltuhr|zeitschaltuhr)/ },
    { id: 'daemmerung', name: 'Dämmerungsschalter', re: /(daemmerung|aufbaufuehler|lichtsensor)/ },
    { id: 'netzteil', name: 'Netzteil', re: /(netzteil|netzgeraet|stromversorgung|schaltnetzteil|power supply|hdr-\d)/ },
    { id: 'trafo', name: 'Transformator', re: /(klingeltrafo|transformator|\btrafo\b)/ },
    { id: 'zaehler', name: 'Zähler', re: /(zaehler(?!schrank|platz|feld)|energiezaehler|wirkenergie|\bkwh)/ },
    { id: 'messgeraet', name: 'Messgerät', re: /(messgeraet|multimess|netzanalys|\bumg\s?\d)/ },
    { id: 'wandler', name: 'Wandler', re: /(stromwandler|wandler)/ },
    { id: 'klemme', name: 'Klemme', re: /(klemme|klemmenblock|\bpt\s?\d|\bpti\s?\d)/ },
    { id: 'taster', name: 'Taster/Schalter Türeinbau', re: /(drucktaster|leuchttaster|wahlschalter|wahltaster|not-?aus|meldeleuchte|leuchtmelder)/ },
    { id: 'knx', name: 'KNX', re: /(\bknx|\beib\b)/ },
    { id: 'motorschutz', name: 'Motorschutz', re: /(motorschutz)/ },
    { id: 'verschraubung', name: 'Verschraubung', re: /(verschraubung|kabeleinfuehrung)/ },
    { id: 'sammelschiene', name: 'Sammelschiene', re: /(sammelschiene|kupferschiene|cu-?schiene|flachkupfer|kupfer-?flach)/ },
    { id: 'schrank', name: 'Schrank', re: /(schrank|verteiler|gehaeuse|unterverteilung|\buv\s?\d|\buv\b|standverteiler|wandverteiler)/ }
  ];
  const TYP_NAME = Object.fromEntries(TYPEN.map(t => [t.id, t.name]));

  // Kategorie (Spalte Herstellerprofil) je Gerätetyp
  const KATEGORIE = {
    schrank: 'Schränke', nshv: 'NSHV-Systeme', lsw: 'ACB/MCCB', lts: 'Lasttrenn-/Umschalter', umschalter: 'Lasttrenn-/Umschalter',
    nh_leiste: 'Sicherungen, NH-Leisten', nh_trenner: 'Sicherungen, NH-Leisten', sockel: 'Sicherungen, NH-Leisten',
    sich_einsatz: 'Sicherungen, NH-Leisten', schraubkappe: 'Sicherungen, NH-Leisten', sls: 'Sicherungen, NH-Leisten',
    fi: 'FI, LS, FI/LS', ls: 'FI, LS, FI/LS', fi_ls: 'FI, LS, FI/LS', afdd: 'FI, LS, FI/LS',
    schuetz: 'Schütze, Relais', fernschalter: 'Schütze, Relais', zeitrelais: 'Schütze, Relais', koppelrelais: 'Schütze, Relais',
    schaltuhr: 'Installationsgeräte, Netzteile', daemmerung: 'Installationsgeräte, Netzteile', netzteil: 'Installationsgeräte, Netzteile',
    trafo: 'Installationsgeräte, Netzteile', taster: 'Installationsgeräte, Netzteile', knx: 'KNX',
    zaehler: 'Zähler, Messgeräte', messgeraet: 'Zähler, Messgeräte', wandler: 'Zähler, Messgeräte',
    klemme: 'Klemmen', uss: 'Überspannungsschutz', sammelschiene: 'Sammelschienen', motorschutz: 'Schütze, Relais',
    verschraubung: 'Schränke'
  };

  // Standardprofil „Standard Hundt“ (bestätigt 12.11.2026)
  const PROFIL_STANDARD = {
    name: 'Standard Hundt',
    reihenfolge: {
      'Schränke': ['Hager', 'Eaton', 'KVS'],
      'NSHV-Systeme': ['Hager', 'Eaton'],
      'ACB/MCCB': ['Hager', 'Eaton', 'Siemens'],
      'Lasttrenn-/Umschalter': ['Hager', 'Eaton', 'ABB', 'Socomec', 'Lovato'],
      'Sicherungen, NH-Leisten': ['Hager', 'Eaton', 'ABB', 'Efen', "K'electric", 'Jean Müller'],
      'FI, LS, FI/LS': ['Hager', 'Eaton', 'ABB', 'Siemens'],
      'Schütze, Relais': ['Hager', 'Eaton', 'ABB'],
      'Installationsgeräte, Netzteile': ['Hager', 'Eaton', 'Meanwell'],
      'KNX': ['Hager', 'ABB', 'MDT', 'Schneider'],
      'Zähler, Messgeräte': ['Hager', 'ABB', 'Janitza', "K'electric", 'Meter'],
      'Klemmen': ['Phoenix', 'Hager', 'Jean Müller'],
      'Überspannungsschutz': ['Dehn', 'Hager', "K'electric", 'Phoenix', 'Citel'],
      'Sammelschienen': ['Hundt']
    }
  };

  // Regeln je Merkmal: exakt / min / max (Spezifikation 4.3)
  const IN_MIN_TYPEN = new Set(['lts', 'umschalter', 'nh_trenner', 'nh_leiste', 'fi', 'lsw', 'sammelschiene', 'schrank', 'nshv', 'klemme', 'schuetz', 'fernschalter']);
  // Pflichtmerkmale je Typ (für Grün)
  const PFLICHT = {
    ls: ['pole', 'In', 'char'], fi_ls: ['pole', 'In', 'char', 'mA'], fi: ['pole', 'In', 'mA', 'fiTyp'],
    afdd: ['In'], lts: ['pole', 'In'], umschalter: ['pole', 'In'], lsw: ['pole', 'In'],
    nh_leiste: ['nh'], nh_trenner: ['nh'], sockel: ['sich', 'pole'], sich_einsatz: ['In'],
    schuetz: ['In'], fernschalter: [], zeitrelais: [], koppelrelais: ['volt'], netzteil: ['volt', 'In'],
    uss: ['ussTyp'], klemme: ['mm2'], zaehler: [], messgeraet: [], wandler: ['In'], schaltuhr: [], daemmerung: [],
    trafo: [], taster: [], knx: [], motorschutz: ['In'], verschraubung: ['gewinde'], schraubkappe: [], sls: ['In']
  };

  // ---------------------------------------------------------------- Text

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/²/g, '2').replace(/×/g, 'x').replace(/–|—/g, '-')
      .replace(/(\d),(\d)/g, '$1.$2')
      .replace(/[ \t]+/g, ' ');
  }
  const num = s => parseFloat(String(s).replace(',', '.'));

  const STOP = new Set('und mit fuer der die das in im auf zur zum von bis inkl inkl. oder ohne als ein eine st stk stueck x fabr typ fabr. typ:'.split(' '));
  function tokens(s) {
    return norm(s).split(/[^a-z0-9.+]+/).filter(t => t.length > 1 && !STOP.has(t));
  }

  // ---------------------------------------------------------------- Merkmale

  function typErkennen(t) {
    for (const ty of TYPEN) {
      if (ty.re.test(t) && (!ty.need || ty.need.test(t))) return ty.id;
    }
    return null;
  }

  function merkmale(text, typHint) {
    const t = ' ' + norm(text) + ' ';
    const m = {};
    let r;
    m.typ = typHint || typErkennen(t);

    // Charakteristik + In aus B16 / C-16A / B 16 A
    for (const r2 of t.matchAll(/(?:^|[^a-z0-9])([bcdk])\s?-?\s?(\d{1,3})\s?a?(?![0-9a-z.])/g)) {
      if (r2[1] === 'd' && r2[2].startsWith('0')) continue;
      if (/\b(typ|gr|nh|e|m)\s?$/.test(t.slice(0, r2.index + 1))) continue;
      m.char = r2[1].toUpperCase(); m.In = num(r2[2]); break;
    }
    if (!m.char && (r = t.match(/(?:char(?:akteristik)?\.?\s*:?\s*|\b)([bcdk])-?\s?char/))) m.char = r[1].toUpperCase();
    if (!m.char && (r = t.match(/charakteristik\s*:?\s*([bcdk])\b/))) m.char = r[1].toUpperCase();

    // FI-Schreibweise 40/0,03 A
    if ((r = t.match(/\b(\d{1,3})\s?\/\s?0\.(\d{1,3})\s?a\b/))) { if (m.In == null) m.In = num(r[1]); m.mA = Math.round(num('0.' + r[2]) * 1000); }
    // Nennstrom
    if (m.In == null) {
      const alle = [...t.matchAll(/(?<![0-9a-z.])(\d{1,4}(?:\.\d+)?)\s?a(?![a-z0-9])/g)].map(x => num(x[1])).filter(x => x >= 1 || m.typ === 'netzteil');
      if (alle.length) m.In = alle[0];
    }
    if ((r = t.match(/\bin\s*[=:]?\s*(\d{1,4})\s?a\b/))) m.In = num(r[1]);

    // kA / Icw
    if ((r = t.match(/(\d{1,3}(?:\.\d+)?)\s?ka\b/))) m.kA = num(r[1]);
    if ((r = t.match(/icw\s*[=:]?\s*(\d{1,3})\s?ka/))) m.icw = num(r[1]);
    // mA
    if (m.mA == null && (r = t.match(/(\d{1,4})\s?ma\b/))) m.mA = num(r[1]);
    // FI-Typ
    if ((r = t.match(/\btyp\s?:?\s?(b\+|a|f|b|ac|g)(?![a-z0-9])/))) m.fiTyp = r[1].toUpperCase();
    else if ((r = t.match(/\b(a|f|b)-?typ\b/))) m.fiTyp = r[1].toUpperCase();

    // Pole
    if ((r = t.match(/\b([1-4])\s?(?:p|pol|polig|pol\.)\s?\+\s?n\b/))) m.pole = r[1] + '+N';
    else if ((r = t.match(/\b([1-4])\s?-?\s?(?:polig|pol\.?|p)(?![a-z])/))) m.pole = r[1];
    else if ((r = t.match(/\b(ein|zwei|drei|vier)\s?-?polig/))) m.pole = String({ ein: 1, zwei: 2, drei: 3, vier: 4 }[r[1]]);
    else if (/\b3\s?\+\s?1\b/.test(t)) m.pole = '4';
    else if ((r = t.match(/\b([1-4])p\b/))) m.pole = r[1];

    // Kontakte (Schütz, Fernschalter): 3S, 1S, 2S2Ö, 1NO
    {
      const sch = t.match(/\b(\d)\s?(?:s|no|schliesser)\b/), oe = t.match(/\b(\d)\s?(?:oe|nc|oeffner)\b/), we = t.match(/\b(\d)\s?(?:w|co|wechsler|we)\b/);
      if (sch || oe || we) m.kontakte = (sch ? sch[1] + 'S' : '') + (oe ? oe[1] + 'Oe' : '') + (we ? we[1] + 'W' : '');
    }

    // Spannung
    const volts = [...t.matchAll(/(?<![\d.])(\d{1,3})\s?v\s?(ac\/dc|ac|dc|uc)?\b/g)];
    if (volts.length) {
      const dc = volts.find(x => x[2] && /dc|uc/.test(x[2]));
      const w = dc || volts[0];
      m.volt = num(w[1]); if (w[2]) m.stromart = w[2].toUpperCase();
      m.voltAlle = [...new Set(volts.map(x => num(x[1])))];
    }
    if ((r = t.match(/\b(?:hdr|ndr|sdr|edr|dr|mdr)-\d{2,3}-(12|24|48)\b/))) { m.volt = num(r[1]); m.voltAlle = [...new Set([num(r[1])].concat(m.voltAlle || []))]; }

    // Querschnitt, Adern
    if ((r = t.match(/(?<![\d.x])(\d{1,2})\s?x\s?(\d{1,3}(?:\.\d+)?)\s?mm(?!\s?x)/))) { m.adern = num(r[1]); m.mm2 = num(r[2]); }
    else if ((r = t.match(/(\d{1,3}(?:\.\d+)?)\s?(?:mm2|mm\^2|qmm|mm\b(?=.*klemme))/))) m.mm2 = num(r[1]);
    else if ((r = t.match(/\b(?:pt|pti|ut|st)\s?(\d{1,2}(?:\.\d+)?)\b/))) m.mm2 = num(r[1]);

    // IP, Schutzklasse
    if ((r = t.match(/\bip\s?(\d)(\d)/))) m.ip = num(r[1] + r[2]);
    if ((r = t.match(/\b(?:sk|schutzklasse)\s?(ii|i|2|1)\b/))) m.sk = /ii|2/.test(r[1]) ? 2 : 1;

    // Maße (Standard HxBxT, BxHxT wenn so beschriftet)
    if ((r = t.match(/(\d{3,4})\s?x\s?(\d{3,4})\s?x\s?(\d{2,4})/))) {
      const a = [num(r[1]), num(r[2]), num(r[3])];
      const vor = t.slice(Math.max(0, r.index - 14), r.index);
      if (/bxhxt/.test(vor)) m.mass = { h: a[1], b: a[0], t: a[2] };
      else if (/bxtxh/.test(vor)) m.mass = { h: a[2], b: a[0], t: a[1] };
      else m.mass = { h: a[0], b: a[1], t: a[2] };
    }
    if ((r = t.match(/(\d{2,4})\s?(?:ple|plz)\b/)) || (r = t.match(/\b(?:ple|plz)\s?:?\s?(\d{2,4})/))) m.ple = num(r[1]);
    if ((r = t.match(/(\d{1,3})\s?te\b/))) m.te = num(r[1]);

    // Sicherungsgrößen
    if ((r = t.match(/\bnh\s?-?\s?(000|00|0|1|2|3|4a?)\b/)) || (r = t.match(/\bgr(?:oesse|\.)?\s?(000|00|0|1|2|3)\b/))) m.nh = r[1];
    if ((r = t.match(/\bd0\s?([123])\b/))) m.sich = 'D0' + r[1];
    else if (/neozed/.test(t)) m.sich = 'D0';
    else if (/\bd\s?ii\b|\be27\b/.test(t)) m.sich = 'DII';
    else if (/\bdiii\b|\be33\b/.test(t)) m.sich = 'DIII';
    if (m.nh) m.sich = m.sich || 'NH';

    // Überspannungsschutz
    if (m.typ === 'uss' || /ableiter|ueberspannung|dehn/.test(t)) {
      const ty = new Set();
      for (const x of t.matchAll(/\b(?:typ|type|t|klasse)\s?((?:[123]|i{1,3})(?:\s?[\/+]\s?(?:[123]|i{1,3}))*)\b(?!\d)/g)) {
        x[1].split(/[\/+]/).forEach(v => { v = v.trim(); ty.add({ i: '1', ii: '2', iii: '3' }[v] || v); });
      }
      if (/kombi-?ableiter|blitzstrom/.test(t) && !ty.size) { ty.add('1'); ty.add('2'); }
      if (ty.size) m.ussTyp = [...ty].sort().join('+');
      const netz = new Set();
      if (/tn-?s\b|tns/.test(t)) netz.add('TNS');
      if (/tn-?c\b|tnc/.test(t)) netz.add('TNC');
      if (/\btt\b/.test(t)) netz.add('TT');
      if (/3\s?\+\s?1/.test(t)) { netz.add('TT'); netz.add('TNS'); }
      if (netz.size) m.netz = [...netz];
    }

    // Klemmenart
    if (/klemme|\bpti?\s?\d/.test(t)) {
      if (/schutzleiter|-pe\b|\bpe\b|erd/.test(t)) m.klemmeArt = 'PE';
      else if (/\bbu\b|blau|neutralleiter|n-klemme/.test(t)) m.klemmeArt = 'N';
      else if (/durchgang|grau|\bpt\s?\d/.test(t)) m.klemmeArt = 'L';
    }
    // Gewinde
    if ((r = t.match(/\bm\s?(12|16|20|25|32|40|50|63)\b/))) m.gewinde = 'M' + r[1];
    // Form (NSHV)
    if ((r = t.match(/\bform\s?([1-4])\s?([ab])?/))) m.form = r[1] + (r[2] || '');
    // Lose Lieferung
    if (/lose\s?(lieferung|liefern|beigestellt|beipack)/.test(t)) m.lose = true;
    // Fabrikat
    if ((r = t.match(/fabrikat\s*:?\s*([a-z'´ ]{3,25}?)(?:,|\.|\s(?:typ|oder|o\.|gleich)|$|\n)/))) {
      m.fabrikat = r[1].trim();
      m.gleichwertig = /(oder\s+gleichwertig|o\.\s?glw|gleichwertig|oder\s+glw)/.test(t);
    }
    return m;
  }

  function herstellerAusText(t) {
    const n = norm(t);
    const namen = ['hager', 'eaton', 'moeller', 'abb', 'siemens', 'efen', 'dehn', 'janitza', "k'electric", 'kelectric', 'jean mueller', 'deppe', 'mdt', 'schneider', 'socomec', 'striebel', 'phoenix', 'citel', 'lovato', 'meanwell', 'mean well', 'doepke', 'weidmueller', 'wago'];
    const map = { moeller: 'Eaton', kelectric: "K'electric", 'mean well': 'Meanwell', 'jean mueller': 'Jean Müller', weidmueller: 'Weidmüller', striebel: 'Striebel & John' };
    for (const x of namen) if (n.includes(x)) return map[x] || x.charAt(0).toUpperCase() + x.slice(1).replace("k'electric", "K'electric");
    return null;
  }
  function herstellerNorm(h) {
    if (!h) return null;
    const n = norm(h);
    if (n.includes('k') && n.includes('electric')) return "K'electric";
    return herstellerAusText(h) || h;
  }

  // ---------------------------------------------------------------- Index

  /**
   * favoriten: Liste von Zeilen {los, pos, typ:'GROUP'|'PRODUCT'|..., desc, cat, ext, wage, time, qty, profit, supp, stype, notes}
   */
  function baueIndex(favoriten) {
    const artikel = [];
    const pakete = [];
    const gruppen = new Map();
    for (const z of favoriten) {
      if (z.typ === 'GROUP') gruppen.set(z.los + '|' + z.pos, z);
    }
    const pfad = (los, pos) => {
      const teile = pos.split('.');
      const p = [];
      for (let i = teile.length - 1; i >= 1; i--) {
        const g = gruppen.get(los + '|' + teile.slice(0, i).join('.'));
        if (g) p.push(g.desc || '');
      }
      return p; // nächste Gruppe zuerst
    };
    // Schrankpakete aus LOS03.1: Gruppe mit „Kleinteile und Verdrahtungsmaterial“ als direktem Kind
    const kinder = new Map();
    for (const z of favoriten) {
      if (z.typ === 'GROUP') continue;
      const eltern = z.los + '|' + z.pos.split('.').slice(0, -1).join('.');
      if (!kinder.has(eltern)) kinder.set(eltern, []);
      kinder.get(eltern).push(z);
    }
    for (const [key, liste] of kinder) {
      const g = gruppen.get(key);
      if (!g || !/^LOS03\.1/.test(g.los)) continue;
      if (!liste.some(k => /kleinteile und verdrahtung/i.test(k.desc || ''))) continue;
      const haupt = liste[0];
      const text = [g.desc, g.notes, haupt.desc, haupt.notes].join(' \n ');
      const mm = merkmale(text, 'schrank');
      const h = KATALOG[haupt.cat] || herstellerAusText(text) || haupt.cat;
      pakete.push({ los: g.los, pos: g.pos, desc: g.desc, notes: g.notes, items: liste, m: mm, hersteller: h, pfad: pfad(g.los, g.pos) });
    }
    for (const z of favoriten) {
      if (z.typ !== 'PRODUCT' && z.typ !== 'SERVICE') continue;
      if (/^LOS03 /.test(z.los)) continue; // LOS03 ohne Ausbau wird nicht verwendet
      const p = pfad(z.los, z.pos);
      const eigen = [z.desc, z.notes].join(' \n ');
      let typ = typErkennen(' ' + norm(z.desc) + ' ') || typErkennen(' ' + norm(eigen) + ' ');
      const pfadTyp = typErkennen(' ' + norm(p.slice(0, 3).join(' | ')) + ' ');
      if (!typ || (pfadTyp && pfadTyp !== typ && ['fi', 'fi_ls', 'ls', 'afdd', 'uss', 'nh_leiste', 'lsw', 'zaehler', 'wandler', 'klemme'].includes(pfadTyp))) typ = pfadTyp || typ;
      const mm = merkmale(eigen + ' \n ' + p.slice(0, 2).join(' \n '), typ);
      const hersteller = KATALOG[z.cat] || herstellerAusText(eigen + ' ' + p.join(' ')) || z.cat || '';
      artikel.push({
        ...z, pfad: p, m: mm, hersteller,
        tok: new Set(tokens(z.desc + ' ' + z.notes + ' ' + p.slice(0, 2).join(' '))),
        prio: /^LOS1[89]/.test(z.los) ? 1 : 0
      });
    }
    const nachTyp = new Map();
    for (const a of artikel) {
      const k = a.m.typ || '?';
      if (!nachTyp.has(k)) nachTyp.set(k, []);
      nachTyp.get(k).push(a);
    }
    return { artikel, pakete, nachTyp };
  }

  // ---------------------------------------------------------------- Abgleich

  const MERKMAL_REGEL = {
    pole: 'exakt', char: 'exakt', fiTyp: 'exakt', mA: 'max', kA: 'min', icw: 'min', ip: 'min', ple: 'min',
    nh: 'exakt', sich: 'exakt', volt: 'exakt', mm2: 'exakt', ussTyp: 'enthalten', netz: 'enthalten', gewinde: 'exakt',
    kontakte: 'exakt', klemmeArt: 'exakt', sk: 'min'
  };

  function regelFuer(key, typ) {
    if (key === 'In') return IN_MIN_TYPEN.has(typ) ? 'min' : 'exakt';
    return MERKMAL_REGEL[key];
  }

  function pruefe(lv, art, typ) {
    // Rückgabe: {ok, abw:[...], unbekannt:[...], ueber:{key:excess}}
    const res = { ok: true, abw: [], unbekannt: [], ueber: {}, ersatz: [] };
    for (const key of Object.keys(MERKMAL_REGEL).concat('In')) {
      const v = lv[key];
      if (v == null) continue;
      const a = art.m[key];
      if (a == null) { res.unbekannt.push(key); continue; }
      const regel = regelFuer(key, typ);
      if (regel === 'exakt') {
        if (key === 'pole') { const pn = x => ({ '1+N': '2', '3+N': '4' }[String(x)] || String(x)); if (pn(a) === pn(v)) continue; res.ok = false; res.abw.push(key); continue; }
        if (key === 'volt' && (art.m.voltAlle || [a]).includes(v)) continue;
        if (key === 'pole' && String(a).replace('+N', '') === String(v).replace('+N', '') && (a.includes?.('+N') || v.includes?.('+N'))) {
          // 1+N vs 2-polig: als Ersatz zulassen
          if (!(String(a) === '1+N' && String(v) === '2') && !(String(a) === '2' && String(v) === '1+N')) { res.ok = false; res.abw.push(key); }
          continue;
        }
        if (String(a) !== String(v)) {
          // Netzteil-Strom: größer zulässig als Ersatz (gelb)
          if (key === 'In' && typ === 'netzteil' && a > v) { res.ersatz.push(`In ${a} A statt ${v} A`); res.ueber.In = a - v; continue; }
          res.ok = false; res.abw.push(key);
        }
      } else if (regel === 'min') {
        if (a < v) { res.ok = false; res.abw.push(key); } else if (a > v) res.ueber[key] = a - v;
      } else if (regel === 'max') {
        if (a > v) { res.ok = false; res.abw.push(key); } else if (a < v) res.ueber[key] = v - a;
      } else if (regel === 'enthalten') {
        const soll = Array.isArray(v) ? v : String(v).split('+');
        const ist = Array.isArray(a) ? a : String(a).split('+');
        if (key === 'ussTyp') { if (soll.join('+') !== ist.join('+')) { res.ok = false; res.abw.push(key); } }
        else if (!soll.every(x => ist.includes(x))) { res.ok = false; res.abw.push(key); }
      }
    }
    return res;
  }

  function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let n = 0;
    for (const x of a) if (b.has(x)) n++;
    return n / (a.size + b.size - n);
  }

  function profilReihenfolge(profil, typ) {
    const kat = KATEGORIE[typ];
    return (profil.reihenfolge[kat] || []).slice();
  }

  /**
   * Gleicht einen Text (eine LV-Position oder eine Bestückungszeile) ab.
   * opts: {profil, herstellerVorgabe}
   */
  function gleicheAb(text, index, opts = {}) {
    const profil = opts.profil || PROFIL_STANDARD;
    const lv = merkmale(text, opts.typ);
    const out = { text, m: lv, typ: lv.typ, ampel: 'rot', artikel: null, paket: null, kandidaten: [], hinweise: [] };
    if (!lv.typ) { out.hinweise.push('Gerätetyp nicht erkannt'); return out; }

    // Sonderfälle
    if (lv.typ === 'nshv') {
      const sys = (lv.In >= 1600 || (lv.form && lv.form > '2b')) ? 'LOS02 (Unimes/xEnergy)' : 'LOS03.1';
      out.placeholder = 'OFFEN: NSHV – Preset';
      out.hinweise.push(`PL: NSHV-Feldaufbau festlegen (Preset), Systemwahl laut Regel 12: ${sys}`);
      out.ampel = 'rot';
      return out;
    }
    if (lv.typ === 'sammelschiene') {
      out.placeholder = 'OFFEN: Sammelschiene';
      out.hinweise.push('PL: Länge festlegen (LOS04 pro Meter × Länge)');
      return out;
    }
    if (lv.typ === 'schrank') return schrankWaehlen(lv, text, index, profil, out, opts);

    let kand = (index.nachTyp.get(lv.typ) || []).slice();
    if (!kand.length) { out.hinweise.push(`Kein Favorit vom Typ ${TYP_NAME[lv.typ]}`); return out; }

    // Fabrikat verbindlich?
    let verbindlich = null;
    if (lv.fabrikat && !lv.gleichwertig) {
      verbindlich = herstellerNorm(lv.fabrikat);
    }

    const geprueft = [];
    for (const a of kand) {
      const p = pruefe(lv, a, lv.typ);
      if (!p.ok) continue;
      geprueft.push({ a, p, score: jaccard(new Set(tokens(text)), a.tok) });
    }
    // Streng: Pflichtmerkmale, die das LV nennt, müssen am Favorit lesbar sein
    const pflichtLv = (PFLICHT[lv.typ] || []).filter(k => lv[k] != null);
    const streng = geprueft.filter(g => !g.p.unbekannt.some(k => pflichtLv.includes(k)));
    if (streng.length) geprueft.splice(0, geprueft.length, ...streng);
    if (!geprueft.length) {
      // nächstliegende Kandidaten mit Abweichungen nennen
      out.hinweise.push('Kein Favorit erfüllt alle Merkmale (' + merkmalText(lv) + ')');
      out.kandidaten = kand.map(a => ({ a, s: jaccard(new Set(tokens(text)), a.tok) })).sort((x, y) => y.s - x.s).slice(0, 5).map(x => x.a);
      return out;
    }

    // Hersteller
    let reihenfolge = opts.herstellerVorgabe ? [opts.herstellerVorgabe] : profilReihenfolge(profil, lv.typ);
    let auswahl = geprueft;
    let fallback = false;
    if (verbindlich) {
      const v = geprueft.filter(g => norm(g.a.hersteller) === norm(verbindlich));
      if (!v.length) {
        out.hinweise.push(`PL: Fabrikat verbindlich (${verbindlich}), nicht in Favoriten`);
        out.kandidaten = geprueft.slice(0, 5).map(g => g.a);
        return out;
      }
      auswahl = v;
    } else if (reihenfolge.length) {
      let gefunden = false;
      for (let i = 0; i < reihenfolge.length; i++) {
        const v = geprueft.filter(g => norm(g.a.hersteller) === norm(reihenfolge[i]));
        if (v.length) { auswahl = v; fallback = i > 0; gefunden = true; if (fallback) out.hinweise.push(`Hersteller-Fallback: ${reihenfolge[i]} statt ${reihenfolge[0]}`); break; }
      }
      if (!gefunden) { fallback = true; out.hinweise.push(`Kein Favorit der Profil-Hersteller (${reihenfolge.join(', ')}), anderer Hersteller gewählt`); }
    }

    // Sortierung: wenig Unbekanntes, LOS01–17 vor 18/19, kleinste Übererfüllung, Textähnlichkeit
    const ueberSumme = p => Object.entries(p.ueber).reduce((s, [k, v]) => s + v / ({ In: 100, kA: 10, ip: 10, ple: 100, mA: 100, icw: 10 }[k] || 1), 0);
    auswahl.sort((x, y) =>
      x.p.unbekannt.length - y.p.unbekannt.length ||
      x.a.prio - y.a.prio ||
      ueberSumme(x.p) - ueberSumme(y.p) ||
      MIN_KEYS.reduce((s, k) => s || ((x.a.m[k] || 0) - (y.a.m[k] || 0)), 0) ||
      y.score - x.score);

    // Dubletten (gleiche Ext. ID in mehreren Losen) entfernen
    const gesehen = new Set();
    auswahl = auswahl.filter(g => { const k = g.a.cat + '|' + g.a.ext; if (gesehen.has(k)) return false; gesehen.add(k); return true; });
    const best = auswahl[0];
    out.artikel = best.a;
    out.kandidaten = auswahl.slice(0, 5).map(g => g.a);

    // Ampel
    const fehlend = (PFLICHT[lv.typ] || []).filter(k => lv[k] == null);
    const gelb = [];
    if (fehlend.length) gelb.push('Merkmal fehlt im LV: ' + fehlend.join(', '));
    if (best.p.unbekannt.length) gelb.push('Merkmal am Favorit nicht lesbar: ' + best.p.unbekannt.join(', '));
    if (best.p.ersatz.length) gelb.push('Ersatz mit Abweichung: ' + best.p.ersatz.join(', '));

    // Mehrdeutigkeit: zweiter Kandidat mit gleichen Merkmalen, aber anderem Artikel
    const zweit = auswahl[1];
    if (zweit && zweit.a.ext !== best.a.ext && zweit.p.unbekannt.length === best.p.unbekannt.length && zweit.a.prio === best.a.prio &&
        Math.abs(ueberSumme(zweit.p) - ueberSumme(best.p)) < 1e-9) {
      // Unterschiede nur in Mindestmerkmalen, die das LV nicht nennt → kleinster passender (grün)
      const roh = merkmalUnterschiede(best.a.m, zweit.a.m);
      const unterschiede = roh.filter(k => !(MIN_KEYS.includes(k) && lv[k] == null));
      if (unterschiede.length || (!roh.length && Math.abs(best.score - zweit.score) < 0.08)) {
        gelb.push('Mehrdeutig: ' + (unterschiede.length ? 'unterscheidet sich in ' + unterschiede.join(', ') : 'mehrere gleichwertige Varianten'));
      }
    }
    if (lv.lose) gelb.push('PL: lose Lieferung – Zeit prüfen');
    if (best.a.time == null || best.a.time === '') gelb.push('PL: Zeit fehlt');
    out.hinweise.push(...gelb);
    out.ampel = (gelb.length || fallback) ? 'gelb' : 'gruen';
    return out;
  }

  const MIN_KEYS = ['kA', 'icw', 'ip', 'ple'];
  function merkmalUnterschiede(a, b) {
    const keys = ['pole', 'In', 'char', 'kA', 'mA', 'fiTyp', 'volt', 'kontakte', 'mm2', 'nh', 'sich', 'ussTyp', 'netz', 'ip'];
    return keys.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  }

  function merkmalText(m) {
    const t = [];
    if (m.pole) t.push(m.pole + 'p');
    if (m.char) t.push(m.char);
    if (m.In != null) t.push(m.In + 'A');
    if (m.kA) t.push(m.kA + 'kA');
    if (m.mA) t.push(m.mA + 'mA');
    if (m.fiTyp) t.push('Typ ' + m.fiTyp);
    if (m.volt) t.push(m.volt + 'V');
    if (m.mm2) t.push(m.mm2 + 'mm²');
    if (m.ip) t.push('IP' + m.ip);
    if (m.mass) t.push(`${m.mass.h}x${m.mass.b}x${m.mass.t}`);
    if (m.ple) t.push(m.ple + ' PLE');
    if (m.nh) t.push('NH' + m.nh);
    if (m.sich && m.sich !== 'NH') t.push(m.sich);
    if (m.ussTyp) t.push('Typ ' + m.ussTyp);
    if (m.netz) t.push(m.netz.join('/'));
    return t.join(' ');
  }

  function signatur(m) {
    return [TYP_NAME[m.typ] || '?', m.pole && m.pole + 'p', m.char, m.In != null && m.In + 'A', m.kA && m.kA + 'kA', m.mA && m.mA + 'mA', m.fiTyp, m.ussTyp && 'T' + m.ussTyp, m.netz && m.netz.join('/'), m.nh && 'NH' + m.nh, m.sich, m.mm2 && m.mm2 + 'mm2', m.volt && m.volt + 'V']
      .filter(Boolean).join('|');
  }

  // ---------------------------------------------------------------- Schränke

  function schrankWaehlen(lv, text, index, profil, out, opts) {
    let pakete = index.pakete.slice();
    const reihenfolge = opts.herstellerVorgabe ? [opts.herstellerVorgabe] : profilReihenfolge(profil, 'schrank');
    const ok = [];
    const teBedarf = opts.teBedarf || 0;
    for (const p of pakete) {
      const m = p.m;
      if (lv.ip && (!m.ip || m.ip < lv.ip)) continue;
      if (lv.ple && (!m.ple || m.ple < lv.ple)) continue;
      if (lv.sk && m.sk && m.sk < lv.sk) continue;
      if (teBedarf && !lv.ple && (!m.ple || m.ple < Math.ceil(teBedarf * 1.3))) continue;
      let abstand = 0;
      if (lv.mass && m.mass) abstand = Math.abs(m.mass.h - lv.mass.h) + Math.abs(m.mass.b - lv.mass.b) + Math.abs(m.mass.t - lv.mass.t);
      else if (lv.mass) abstand = 1e6;
      ok.push({ p, abstand, ple: m.ple || 1e6 });
    }
    if (!ok.length) {
      out.hinweise.push('Kein Schrankpaket in LOS03.1 erfüllt IP/PLE (' + merkmalText(lv) + ')');
      return out;
    }
    let auswahl = ok, fallback = false;
    for (let i = 0; i < reihenfolge.length; i++) {
      const v = ok.filter(x => norm(x.p.hersteller) === norm(reihenfolge[i]));
      if (v.length) { auswahl = v; fallback = i > 0; break; }
    }
    // Typ-Hinweise (Wand/Stand) aus dem Text
    const t = norm(text);
    const wand = /wand|aufputz|\bap\b/.test(t), stand = /stand|anreih/.test(t);
    auswahl.forEach(x => {
      const pt = norm(x.p.pfad.join(' ') + ' ' + x.p.desc);
      x.typStrafe = (wand && !/wand/.test(pt) ? 1 : 0) + (stand && !/stand|anreih/.test(pt) ? 1 : 0);
    });
    auswahl.sort((x, y) => x.typStrafe - y.typStrafe || x.abstand - y.abstand || x.ple - y.ple);
    const best = auswahl[0];
    out.paket = best.p;
    out.kandidaten = auswahl.slice(0, 5).map(x => ({ ...x.p.items[0], pfad: x.p.pfad, hersteller: x.p.hersteller }));
    const gelb = [];
    if (!lv.ip) gelb.push('IP nicht angegeben');
    if (!lv.mass && !lv.ple && !teBedarf) gelb.push('Maße/PLE nicht angegeben');
    if (lv.mass && best.p.m.mass) {
      const d = best.abstand;
      if (d > 150) gelb.push(`Maße weichen ab: ${best.p.m.mass.h}x${best.p.m.mass.b}x${best.p.m.mass.t} statt ${lv.mass.h}x${lv.mass.b}x${lv.mass.t}`);
    }
    if (fallback) gelb.push('Hersteller-Fallback: ' + best.p.hersteller);
    out.hinweise.push(...gelb);
    out.ampel = gelb.length ? 'gelb' : 'gruen';
    return out;
  }

  // ---------------------------------------------------------------- Positionen

  // Bestückungszeilen: „16 St. LS B16A 1-polig“, „16x LS …“, „- 4 Stück FI …“
  function bestueckung(langtext) {
    const zeilen = String(langtext || '').split(/\r?\n|;|•/);
    const liste = [];
    for (const z of zeilen) {
      const r = z.match(/^\s*[-–*]?\s*(\d{1,3})\s?(?:st(?:ue?ck|k)?\.?|x|×)\s+(.{4,})$/i);
      if (r) liste.push({ menge: parseInt(r[1], 10), text: r[2].trim() });
    }
    return liste;
  }

  function teSchaetzung(erg) {
    const m = erg.m;
    if (!erg.typ) return 0;
    const p = parseInt(String(m.pole || '1'), 10) + (String(m.pole || '').includes('+N') ? 1 : 0);
    if (['ls', 'fi', 'fi_ls', 'afdd', 'sockel', 'lts', 'schuetz', 'fernschalter', 'koppelrelais', 'zeitrelais'].includes(erg.typ)) return p;
    if (erg.typ === 'uss') return 4;
    if (['schaltuhr', 'netzteil', 'zaehler', 'messgeraet'].includes(erg.typ)) return 4;
    return 0;
  }

  /**
   * Verarbeitet eine LV-Position {oz, kurztext, langtext, menge, einheit}
   */
  function verarbeitePosition(pos, index, opts = {}) {
    const text = [pos.kurztext, pos.langtext].filter(Boolean).join('\n');
    const best = bestueckung(pos.langtext);
    const res = { pos, haupt: null, unter: [] };
    if (best.length) {
      for (const b of best) {
        const e = gleicheAb(b.text, index, opts);
        res.unter.push({ menge: b.menge, erg: e });
      }
    }
    // Hauptgerät / Schrank
    const typKurz = merkmale(pos.kurztext || '').typ;
    const typGes = typKurz || merkmale(text).typ;
    if (best.length) {
      // Schrank: nur Text ohne Bestückungszeilen
      const ohne = String(pos.langtext || '').split(/\r?\n|;|•/).filter(z => !/^\s*[-–*]?\s*\d{1,3}\s?(?:st(?:ue?ck|k)?\.?|x|×)\s+/i.test(z)).join('\n');
      const schrankText = [pos.kurztext, ohne].filter(Boolean).join('\n');
      if (merkmale(schrankText).typ === 'schrank' || typKurz === 'schrank') {
        const te = res.unter.reduce((s, u) => s + u.menge * teSchaetzung(u.erg), 0);
        res.haupt = gleicheAb(schrankText, index, { ...opts, teBedarf: te, typ: 'schrank' });
      }
    } else {
      // Kurztext bestimmt den Gerätetyp, Langtext liefert zusätzliche Merkmale
      res.haupt = gleicheAb(text, index, { ...opts, typ: typKurz || undefined });
    }
    // Gesamtampel
    const alle = [res.haupt, ...res.unter.map(u => u.erg)].filter(Boolean);
    res.ampel = alle.some(e => e.ampel === 'rot') ? 'rot' : alle.some(e => e.ampel === 'gelb') ? 'gelb' : (alle.length ? 'gruen' : 'rot');
    return res;
  }

  return {
    KATALOG, TYPEN, TYP_NAME, KATEGORIE, PROFIL_STANDARD, PFLICHT,
    norm, tokens, merkmale, merkmalText, signatur, typErkennen, baueIndex, gleicheAb, bestueckung, verarbeitePosition
  };
});
