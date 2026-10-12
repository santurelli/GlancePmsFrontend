import React, { useMemo, useState } from 'react';
import { findPlace } from './places';
import { TrendingUp, BedDouble, Users, CalendarRange, Globe, Home, Euro, Wallet, Info } from 'lucide-react';

/* ─── Interfaces ─────────────────────────────────────────────────── */
interface Customer { cittadinanza?: string; }
interface Reservation {
  id: number;
  room: { id: number; name: string };
  checkIn: string;
  checkOut: string;
  source: string;
  status: string;
  primaryCustomer?: Customer | null;
  prezzoNotte?: number | null;
}
interface Room { id: number; name: string; type: string; }

interface Props {
  reservations: Reservation[];
  rooms: Room[];
}

/* ─── Constants ──────────────────────────────────────────────────── */
type Period = 'month' | 'quarter' | 'half' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  month:   'Questo mese',
  quarter: 'Ultimi 3 mesi',
  half:    'Ultimi 6 mesi',
  year:    'Quest\'anno',
};

const SOURCE_LABEL: Record<string, string> = {
  DIRECT:        'Diretto',
  AIRBNB:        'Airbnb',
  EXTERNAL_ICAL: 'OTA / iCal',
};
const SOURCE_COLOR: Record<string, string> = {
  DIRECT:        'bg-accent-500',
  AIRBNB:        'bg-pink-500',
  EXTERNAL_ICAL: 'bg-slate-400',
};
const SOURCE_TEXT: Record<string, string> = {
  DIRECT:        'text-accent-600',
  AIRBNB:        'text-pink-600',
  EXTERNAL_ICAL: 'text-slate-500',
};

// Names come from the official Alloggiati Web state table (same codes stored on the customer).
const citizenshipName = (code: string): string => findPlace(code)?.name ?? code;

const MONTH_NAMES = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

/* ─── Helpers ────────────────────────────────────────────────────── */
function getPeriodRange(period: Period): [Date, Date] {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (period === 'quarter') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  } else if (period === 'half') {
    start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
    end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  }
  return [start, end];
}

/** Notti di una prenotazione che cadono nel periodo [start, end] */
function nightsInPeriod(checkIn: Date, checkOut: Date, start: Date, end: Date): number {
  const s = Math.max(checkIn.getTime(), start.getTime());
  const e = Math.min(checkOut.getTime(), end.getTime() + 86400000);
  const diff = (e - s) / 86400000;
  return Math.max(0, diff);
}

function daysInRange(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

/* ─── Sub-components ─────────────────────────────────────────────── */
const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  tooltip?: string;
}> = ({ icon, label, value, sub, color = 'text-accent-500', tooltip }) => (
  <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm p-5 flex flex-col gap-2">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100 ${color}`}>
      {icon}
    </div>
    <div className="flex items-center gap-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      {tooltip && (
        <div className="relative group/tip">
          <Info className="w-3 h-3 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2.5 rounded-lg bg-slate-900 text-white text-[10px] font-medium leading-relaxed normal-case tracking-normal opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-10 pointer-events-none">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
          </div>
        </div>
      )}
    </div>
    <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
    {sub && <p className="text-[10px] text-slate-400 font-medium">{sub}</p>}
  </div>
);

const HBar: React.FC<{ label: string; value: number; max: number; color?: string; suffix?: string }> = ({
  label, value, max, color = 'bg-accent-500', suffix = ''
}) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-28 flex-shrink-0 font-semibold text-slate-700 truncate text-right">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 flex-shrink-0 text-slate-500 font-medium">{value}{suffix}</span>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
export const StatisticsPage: React.FC<Props> = ({ reservations, rooms }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [periodStart, periodEnd] = useMemo(() => getPeriodRange(period), [period]);

  const totalDays = daysInRange(periodStart, periodEnd);

  /* Prenotazioni valide nel periodo (escluse cancellate) */
  const periodRes = useMemo(() => reservations.filter(r => {
    if (r.status === 'CANCELLED') return false;
    const cIn  = new Date(r.checkIn);
    const cOut = new Date(r.checkOut);
    return cIn < new Date(periodEnd.getTime() + 86400000) && cOut > periodStart;
  }), [reservations, periodStart, periodEnd]);

  /* Solo prenotazioni dirette/OTA (no iCal esterno) per stats guest */
  const humanRes = useMemo(() => periodRes.filter(r => r.source !== 'EXTERNAL_ICAL'), [periodRes]);

  /* ── KPI ── */
  const occupiedRoomNights = useMemo(() =>
    periodRes.reduce((acc, r) =>
      acc + nightsInPeriod(new Date(r.checkIn), new Date(r.checkOut), periodStart, periodEnd), 0),
  [periodRes, periodStart, periodEnd]);

  const totalRoomNights = rooms.length * totalDays;
  const occupancyRate   = totalRoomNights > 0 ? (occupiedRoomNights / totalRoomNights) * 100 : 0;

  const avgStay = humanRes.length > 0
    ? humanRes.reduce((acc, r) => {
        const nights = (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000;
        return acc + nights;
      }, 0) / humanRes.length
    : 0;

  /* ── Ricavi: ADR e RevPAR ──
     Solo prenotazioni dirette/OTA con un prezzo impostato: i blocchi iCal esterni non hanno un
     importo affidabile (sono solo disponibilità bloccata) e non vanno confusi con ricavo zero. */
  const revenueRes = useMemo(() =>
    periodRes.filter(r => r.source !== 'EXTERNAL_ICAL' && r.prezzoNotte != null),
  [periodRes]);

  const totalRevenue = useMemo(() =>
    revenueRes.reduce((acc, r) => {
      const nights = nightsInPeriod(new Date(r.checkIn), new Date(r.checkOut), periodStart, periodEnd);
      return acc + nights * (r.prezzoNotte ?? 0);
    }, 0),
  [revenueRes, periodStart, periodEnd]);

  const soldNightsWithPrice = useMemo(() =>
    revenueRes.reduce((acc, r) =>
      acc + nightsInPeriod(new Date(r.checkIn), new Date(r.checkOut), periodStart, periodEnd), 0),
  [revenueRes, periodStart, periodEnd]);

  const adr = soldNightsWithPrice > 0 ? totalRevenue / soldNightsWithPrice : 0;
  const revPar = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;

  /* ── Fonte prenotazioni ── */
  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    periodRes.forEach(r => { map[r.source] = (map[r.source] ?? 0) + 1; });
    return Object.entries(map)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [periodRes]);

  const maxSource = Math.max(...bySource.map(b => b.count), 1);

  /* ── Occupazione per camera ── */
  const roomOccupancy = useMemo(() =>
    rooms.map(room => {
      const nights = periodRes
        .filter(r => r.room.id === room.id)
        .reduce((acc, r) =>
          acc + nightsInPeriod(new Date(r.checkIn), new Date(r.checkOut), periodStart, periodEnd), 0);
      return { room, nights: Math.round(nights) };
    }).sort((a, b) => b.nights - a.nights),
  [rooms, periodRes, periodStart, periodEnd]);

  const maxRoomNights = Math.max(...roomOccupancy.map(r => r.nights), 1);

  /* ── Andamento ultimi 12 mesi ── */
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const nights = reservations
        .filter(r => r.status !== 'CANCELLED')
        .reduce((acc, r) =>
          acc + nightsInPeriod(new Date(r.checkIn), new Date(r.checkOut), mStart, mEnd), 0);
      return { label: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), nights: Math.round(nights) };
    });
  }, [reservations]);

  const maxMonthNights = Math.max(...monthlyTrend.map(m => m.nights), 1);

  /* ── Top nazionalità ── */
  const topNationalities = useMemo(() => {
    const map: Record<string, number> = {};
    humanRes.forEach(r => {
      const c = r.primaryCustomer?.cittadinanza;
      if (c) map[c] = (map[c] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([code, count]) => ({ label: citizenshipName(code), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [humanRes]);

  const maxNat = Math.max(...topNationalities.map(n => n.count), 1);

  /* ─── Render ──────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Header + period selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">Statistiche</h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            Analisi delle performance della struttura
          </p>
        </div>
        <div className="flex gap-1 bg-white/60 backdrop-blur border border-slate-200/50 rounded-xl p-1 shadow-sm">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                period === p
                  ? 'bg-accent-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Tasso di occupazione"
          value={`${occupancyRate.toFixed(1)}%`}
          sub={`${Math.round(occupiedRoomNights)} notti su ${totalRoomNights}`}
          color="text-accent-500"
        />
        <KpiCard
          icon={<Euro className="w-4 h-4" />}
          label="ADR (tariffa media)"
          value={adr > 0 ? `€ ${adr.toFixed(2)}` : '—'}
          sub="Per notte venduta, escluso iCal"
          color="text-amber-500"
          tooltip="Quanto incassi in media a notte, contando solo le notti vendute. Non tiene conto delle camere rimaste vuote."
        />
        <KpiCard
          icon={<Wallet className="w-4 h-4" />}
          label="RevPAR"
          value={revPar > 0 ? `€ ${revPar.toFixed(2)}` : '—'}
          sub="Ricavo per camera disponibile"
          color="text-indigo-500"
          tooltip="Quanto rende in media ogni camera che possiedi, occupata o no. A differenza dell'ADR, viene 'penalizzato' se hai molte camere vuote — è il numero più onesto per capire il rendimento reale."
        />
        <KpiCard
          icon={<CalendarRange className="w-4 h-4" />}
          label="Prenotazioni"
          value={String(periodRes.length)}
          sub={`${humanRes.length} dirette/OTA · ${periodRes.length - humanRes.length} iCal`}
          color="text-primary-500"
        />
        <KpiCard
          icon={<BedDouble className="w-4 h-4" />}
          label="Durata media soggiorno"
          value={avgStay > 0 ? `${avgStay.toFixed(1)} notti` : '—'}
          sub="Prenotazioni dirette e OTA"
          color="text-emerald-500"
        />
        <KpiCard
          icon={<Users className="w-4 h-4" />}
          label="Ospiti registrati"
          value={String(humanRes.filter(r => r.primaryCustomer).length)}
          sub="Con anagrafica compilata"
          color="text-pink-500"
        />
      </div>

      {/* Middle row: Fonte + Nazionalità */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Fonte prenotazioni */}
        <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent-500" />
            <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Fonte prenotazioni</p>
          </div>
          {bySource.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nessuna prenotazione nel periodo</p>
          ) : (
            <div className="space-y-3">
              {bySource.map(({ source, count }) => (
                <div key={source} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${SOURCE_TEXT[source] ?? 'text-slate-500'}`}>
                      {SOURCE_LABEL[source] ?? source}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {count} · {Math.round((count / periodRes.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${SOURCE_COLOR[source] ?? 'bg-slate-400'}`}
                      style={{ width: `${(count / maxSource) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top nazionalità */}
        <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Provenienza ospiti</p>
          </div>
          {topNationalities.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nessun dato di cittadinanza disponibile</p>
          ) : (
            <div className="space-y-3">
              {topNationalities.map(({ label, count }) => (
                <HBar
                  key={label}
                  label={label}
                  value={count}
                  max={maxNat}
                  color="bg-emerald-500"
                  suffix=" pren."
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Occupazione per camera */}
      <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-primary-500" />
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Occupazione per camera</p>
          <span className="text-[10px] text-slate-400 ml-auto font-medium">su {totalDays} giorni</span>
        </div>
        {roomOccupancy.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Nessuna camera configurata</p>
        ) : (
          <div className="space-y-3">
            {roomOccupancy.map(({ room, nights }) => (
              <div key={room.id} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700">{room.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {nights} notti · {totalDays > 0 ? Math.round((nights / totalDays) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${(nights / maxRoomNights) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Andamento mensile - ultimi 12 mesi */}
      <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-500" />
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Andamento notti occupate</p>
          <span className="text-[10px] text-slate-400 ml-auto font-medium">ultimi 12 mesi</span>
        </div>
        <div className="flex items-end gap-1.5 h-36 pt-2">
          {monthlyTrend.map((m, i) => {
            const heightPct = maxMonthNights > 0 ? (m.nights / maxMonthNights) * 100 : 0;
            const isCurrentMonth = i === 11;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className="relative w-full flex flex-col items-center justify-end h-full">
                  {/* Tooltip */}
                  {m.nights > 0 && (
                    <span className="absolute -top-5 text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {m.nights}n
                    </span>
                  )}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${isCurrentMonth ? 'bg-accent-500' : 'bg-accent-500/30 group-hover:bg-accent-500/50'}`}
                    style={{ height: `${Math.max(heightPct, m.nights > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide ${isCurrentMonth ? 'text-accent-600' : 'text-slate-400'}`}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
        {maxMonthNights === 0 && (
          <p className="text-xs text-slate-400 text-center -mt-2">Nessun dato disponibile</p>
        )}
      </div>

    </div>
  );
};
