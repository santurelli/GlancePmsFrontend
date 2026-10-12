import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api';
import { Search, X, User, ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { findPlace, placeLabel, DOCUMENTI } from './places';

interface Customer {
  id: number;
  nome: string;
  cognome: string;
  sesso: string;
  dataNascita: string;
  luogoNascita: string;
  provinciaNascita?: string;
  statoNascita?: string;
  cittadinanza: string;
  tipoDocumento: string;
  numeroDocumento: string;
  luogoRilascio: string;
  dataCreazione: string;
}

interface Reservation {
  id: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  source: string;
  status: string;
  room: { id: number; name: string };
}

interface CustomerDetail {
  customer: Customer;
  reservations: Reservation[];
}

interface PageResult {
  items: Customer[];
  total: number;
  page: number;
  size: number;
}


const DOC_LABEL: Record<string, string> = {
  ...Object.fromEntries(DOCUMENTI.map(d => [d.code, d.name])),
  CARTA_IDENTITA: "Carta d'identità",
  PASSAPORTO: 'Passaporto',
  PATENTE: 'Patente',
};

// Official code -> readable place name; anything that is not a known code (old free text) is shown as is.
const placeName = (v?: string | null): string => {
  if (!v) return '—';
  const pl = findPlace(v);
  return pl ? placeLabel(pl) : v;
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Confermata',
  CANCELLED: 'Annullata',
  READY_FOR_CHECKIN: 'Pronta per check-in',
};

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
  READY_FOR_CHECKIN: 'bg-blue-100 text-blue-700',
};

const PAGE_SIZE = 20;

export const CustomersPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (debouncedQuery) params.set('q', debouncedQuery);
      const res = await apiFetch(`/api/v1/customers?${params}`);
      if (res.ok) {
        setResult(await res.json());
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [debouncedQuery, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openDetail = async (customerId: number) => {
    setDetailLoading(true);
    setSelectedDetail(null);
    try {
      const res = await apiFetch(`/api/v1/customers/${customerId}`);
      if (res.ok) setSelectedDetail(await res.json());
    } catch (_) {}
    finally { setDetailLoading(false); }
  };

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('it-IT') : '—';

  return (
    <div className="flex gap-6 h-full">
      {/* Left: table */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">Clienti</h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
              {result ? `${result.total} clienti registrati` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cerca per nome o cognome..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="glass-input pl-9 pr-8 py-2 rounded-xl text-slate-900 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={fetchCustomers}
              className="p-2 rounded-xl bg-white border border-slate-200/70 text-slate-500 hover:bg-slate-50 shadow-sm transition-all"
              title="Aggiorna"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/60 bg-slate-50/80">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Cognome</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Sesso</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Data nascita</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Cittadinanza</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">N. Documento</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Registrato il</th>
                </tr>
              </thead>
              <tbody>
                {loading && !result?.items.length && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">Caricamento...</td>
                  </tr>
                )}
                {!loading && result?.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">Nessun cliente trovato</td>
                  </tr>
                )}
                {result?.items.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c.id)}
                    className={`border-b border-slate-100 hover:bg-accent-50/40 cursor-pointer transition-colors ${selectedDetail?.customer.id === c.id ? 'bg-accent-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">{c.cognome}</td>
                    <td className="px-4 py-3 text-slate-700">{c.nome}</td>
                    <td className="px-4 py-3 text-slate-500">{c.sesso || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.dataNascita)}</td>
                    <td className="px-4 py-3 text-slate-600">{placeName(c.cittadinanza)}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{c.numeroDocumento || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{c.dataCreazione ? formatDate(c.dataCreazione) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 mt-auto">
              <span className="text-xs text-slate-500">
                Pagina {page + 1} di {totalPages} &middot; {result?.total} totali
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-slate-600 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-slate-600 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {(selectedDetail || detailLoading) && (
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 animate-fade-in">
          <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm p-5 flex flex-col gap-4">
            {detailLoading && (
              <div className="flex items-center justify-center py-8 text-slate-400 text-xs">Caricamento...</div>
            )}
            {selectedDetail && !detailLoading && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-accent-500 flex items-center justify-center text-white font-extrabold text-base shadow-sm flex-shrink-0">
                      {selectedDetail.customer.cognome[0]}{selectedDetail.customer.nome[0]}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm leading-tight">
                        {selectedDetail.customer.cognome} {selectedDetail.customer.nome}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                        {selectedDetail.customer.sesso === 'M' ? 'Uomo' : selectedDetail.customer.sesso === 'F' ? 'Donna' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Anagrafica */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anagrafica</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-slate-500">Data nascita</dt>
                    <dd className="text-slate-800 font-medium">{formatDate(selectedDetail.customer.dataNascita)}</dd>
                    <dt className="text-slate-500">Luogo nascita</dt>
                    <dd className="text-slate-800 font-medium">{selectedDetail.customer.statoNascita && selectedDetail.customer.statoNascita !== '100000100' ? placeName(selectedDetail.customer.statoNascita) : placeName(selectedDetail.customer.luogoNascita)}</dd>
                    <dt className="text-slate-500">Cittadinanza</dt>
                    <dd className="text-slate-800 font-medium">{placeName(selectedDetail.customer.cittadinanza)}</dd>
                  </dl>
                </div>

                {/* Documento */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documento</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-slate-500">Tipo</dt>
                    <dd className="text-slate-800 font-medium">{DOC_LABEL[selectedDetail.customer.tipoDocumento] ?? (selectedDetail.customer.tipoDocumento || '—')}</dd>
                    <dt className="text-slate-500">Numero</dt>
                    <dd className="text-slate-800 font-mono font-medium">{selectedDetail.customer.numeroDocumento || '—'}</dd>
                    <dt className="text-slate-500">Rilasciato a</dt>
                    <dd className="text-slate-800 font-medium">{placeName(selectedDetail.customer.luogoRilascio)}</dd>
                  </dl>
                </div>

                {/* Prenotazioni */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Prenotazioni ({selectedDetail.reservations.length})
                  </p>
                  {selectedDetail.reservations.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nessuna prenotazione</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {selectedDetail.reservations.map(r => (
                        <div key={r.id} className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 text-xs">{r.room?.name ?? '—'}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                              {STATUS_LABEL[r.status] ?? r.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{r.source}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
