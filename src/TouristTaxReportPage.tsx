import React, { useState, useCallback, useEffect } from 'react';
import { apiFetch } from './api';
import { Download, RefreshCw, Receipt } from 'lucide-react';
import Swal from 'sweetalert2';

interface ReportRow {
  reservationId: number;
  checkIn: string;
  checkOut: string;
  guestName: string;
  ospiteNome: string;
  notti: number;
  tassabile: boolean;
  motivoEsenzione: string | null;
  importo: number;
}

interface ReportResult {
  righe: ReportRow[];
  totale: number;
}

const firstDayOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

const today = () => new Date().toISOString().split('T')[0];

export const TouristTaxReportPage: React.FC = () => {
  const [da, setDa] = useState(firstDayOfMonth());
  const [a, setA] = useState(today());
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/tourist-tax/report?da=${da}&a=${a}`);
      if (res.status === 409) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Configurazione tassa di soggiorno non impostata per questa struttura');
      }
      if (!res.ok) throw new Error('Impossibile generare il report');
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [da, a]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportFile = async (format: 'csv' | 'excel') => {
    const path = format === 'csv' ? '/api/tourist-tax/report/export' : '/api/tourist-tax/report/export/excel';
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    try {
      const res = await apiFetch(`${path}?da=${da}&a=${a}`);
      if (!res.ok) throw new Error(`Impossibile generare l'export ${format.toUpperCase()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tassa_soggiorno_${da}_${a}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Errore export', text: err.message, background: 'rgba(255,255,255,0.95)' });
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('it-IT') : '—';

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-accent-500" /> Report Tassa di Soggiorno
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            {result ? `${result.righe.length} prenotazioni nel periodo` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={da}
            onChange={(e) => setDa(e.target.value)}
            className="glass-input px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
          />
          <span className="text-xs text-slate-400 font-semibold">→</span>
          <input
            type="date"
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="glass-input px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
          />
          <button
            onClick={fetchReport}
            className="p-2 rounded-xl bg-white border border-slate-200/70 text-slate-500 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
            title="Aggiorna"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => exportFile('csv')}
            disabled={!result || result.righe.length === 0}
            className="px-4 py-2 rounded-xl text-accent-600 font-bold bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20 transition-all text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={() => exportFile('excel')}
            disabled={!result || result.righe.length === 0}
            className="px-4 py-2 rounded-xl text-white font-bold bg-accent-500 hover:bg-accent-600 transition-all text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Esporta Excel
          </button>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200/60 bg-slate-50/80">
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Check-in</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Check-out</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Prenotazione</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Ospite</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Notti Tassabili</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Tassabile</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Motivo Esenzione</th>
                <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Importo</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">Caricamento...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-amber-600 font-semibold">{error}</td>
                </tr>
              )}
              {!loading && !error && result?.righe.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">Nessuna prenotazione nel periodo selezionato</td>
                </tr>
              )}
              {!loading && !error && result?.righe.map((row, i) => (
                <tr key={`${row.reservationId}-${i}`} className="border-b border-slate-100 hover:bg-accent-50/40 transition-colors">
                  <td className="px-4 py-3 text-slate-600">{formatDate(row.checkIn)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(row.checkOut)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.guestName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.ospiteNome}</td>
                  <td className="px-4 py-3 text-slate-600">{row.notti}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${row.tassabile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {row.tassabile ? 'Tassabile' : 'Esente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{!row.tassabile ? (row.motivoEsenzione || '—') : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">€ {row.importo.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {!loading && !error && result && result.righe.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                  <td colSpan={7} className="px-4 py-3 text-right font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">Totale</td>
                  <td className="px-4 py-3 text-right font-extrabold text-accent-600 text-sm">€ {result.totale.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
