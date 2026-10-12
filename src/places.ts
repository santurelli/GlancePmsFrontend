import comuniRaw from './data/comuni.json';
import statiRaw from './data/stati.json';
import documentiRaw from './data/documenti.json';

// Official Alloggiati Web code tables (Polizia di Stato), active entries only.
// Comuni: [code, name, province]  Stati: [code, name]  Documenti: [code, name]
export const ITALY_CODE = '100000100';

export interface Place {
  code: string;
  name: string;
  province?: string; // only for Italian comuni
  kind: 'comune' | 'stato';
}

export const COMUNI: Place[] = (comuniRaw as [string, string, string][]).map(
  ([code, name, province]) => ({ code, name, province, kind: 'comune' as const }),
);
export const STATI: Place[] = (statiRaw as [string, string][]).map(
  ([code, name]) => ({ code, name, kind: 'stato' as const }),
);
export const LUOGHI: Place[] = [...COMUNI, ...STATI];

export const DOCUMENTI: { code: string; name: string }[] = (documentiRaw as [string, string][]).map(
  ([code, name]) => ({ code, name }),
);

const byCode = new Map<string, Place>([...COMUNI, ...STATI].map(p => [p.code, p]));
export const findPlace = (code?: string): Place | undefined => (code ? byCode.get(code) : undefined);

export const placeLabel = (p: Place): string =>
  p.kind === 'comune' && p.province ? `${p.name} (${p.province})` : p.name;

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const index = new WeakMap<Place[], string[]>();
export const searchPlaces = (list: Place[], query: string, limit = 8): Place[] => {
  const q = normalize(query);
  if (q.length < 2) return [];
  let keys = index.get(list);
  if (!keys) {
    keys = list.map(p => normalize(p.name));
    index.set(list, keys);
  }
  const starts: Place[] = [];
  const contains: Place[] = [];
  for (let i = 0; i < list.length; i++) {
    const k = keys[i];
    if (k.startsWith(q)) starts.push(list[i]);
    else if (k.includes(q)) contains.push(list[i]);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
};

// Sensible form value mapping for a person's birth place.
export interface BirthPlace {
  luogoNascita: string; // comune code, '' if born abroad
  provinciaNascita: string; // 2-letter province, '' if born abroad
  statoNascita: string; // state code
}

// Birth place as edited in the reception forms.
export interface BirthGeo {
  abroad: boolean;
  comune: string; // comune code (Italy)
  provincia: string; // 2-letter province (Italy)
  stato: string; // state code
}

export const EMPTY_BIRTH: BirthGeo = { abroad: false, comune: '', provincia: '', stato: ITALY_CODE };

export const birthGeoToPayload = (g: BirthGeo): BirthPlace => ({
  luogoNascita: g.abroad ? '' : g.comune,
  provinciaNascita: g.abroad ? '' : g.provincia,
  statoNascita: g.abroad ? g.stato : ITALY_CODE,
});

export const birthGeoFromCustomer = (c: {
  luogoNascita?: string | null;
  provinciaNascita?: string | null;
  statoNascita?: string | null;
}): BirthGeo => {
  const stato = c.statoNascita || '';
  const abroad = !!stato && stato !== ITALY_CODE;
  // A free-text luogoNascita saved before the official codes existed is not a valid comune code: drop it.
  const comune = c.luogoNascita && /^\d{9}$/.test(c.luogoNascita) ? c.luogoNascita : '';
  return {
    abroad,
    comune: abroad ? '' : comune,
    provincia: abroad ? '' : c.provinciaNascita || findPlace(comune)?.province || '',
    stato: abroad ? stato : ITALY_CODE,
  };
};

// Document types saved before the official Alloggiati Web codes were used.
export const normalizeDocType = (t?: string | null): string => {
  switch (t) {
    case 'CARTA_IDENTITA': return 'IDENT';
    case 'PASSAPORTO': return 'PASOR';
    case 'PATENTE': return 'PATEN';
    default: return t || 'IDENT';
  }
};

// Likewise, a place saved as free text (e.g. "milano") is not a valid code.
export const validPlaceCode = (v?: string | null): string => (v && /^\d{9}$/.test(v) ? v : '');
