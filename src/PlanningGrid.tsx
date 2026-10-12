import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch } from './api';
import { ChevronLeft, ChevronRight, Calendar, User, Move, RefreshCw, Lock, X, Search, Filter, AlertTriangle } from 'lucide-react';

interface Room {
  id: number;
  name: string;
  type: string;
  capacity: number;
}

interface Reservation {
  id: number;
  tenantId: string;
  room: { id: number; name: string };
  guestName: string;
  checkIn: string; // yyyy-MM-dd
  checkOut: string; // yyyy-MM-dd
  source: string;
  status: string;
}

interface PlanningGridProps {
  rooms: Room[];
  reservations: Reservation[];
  onRefresh: () => void;
  subscriptionStatus: string;
  onReservationClick: (res: Reservation) => void; // Click to edit callback
  onCellClick: (roomId: number, date: Date) => void; // Click empty cell to create callback
}

export const PlanningGrid: React.FC<PlanningGridProps> = ({ 
  rooms, 
  reservations, 
  onRefresh, 
  subscriptionStatus, 
  onReservationClick,
  onCellClick
}) => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const monthInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drag and Drop States
  const [draggedRes, setDraggedRes] = useState<Reservation | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: number; date: Date } | null>(null);

  // Dynamic Viewport Days State & Auto-detection on mount
  const [visibleDays, setVisibleDays] = useState<number>(14);

  // Search & Filter States
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');

  // Reassignment Mode for Touch Screens / Mobile Fallback
  const [reassignModeRes, setReassignModeRes] = useState<Reservation | null>(null);
  const [showReassignModal, setShowReassignModal] = useState<Reservation | null>(null); // For detail preview overlay

  // Reservation ids that genuinely overlap another active reservation in the same room —
  // a real interval overlap (checkIn < other.checkOut && checkOut > other.checkIn), not just
  // a same-day check-in collision, so staggered double-bookings get flagged too. This should
  // never happen going forward (the backend now rejects it), but existing data or an iCal
  // import that bypasses the validator can still produce one, and it must stay visible/flagged
  // rather than silently disappear.
  const conflictedReservationIds = useMemo(() => {
    const conflicted = new Set<number>();
    const active = reservations.filter(r => r.status !== 'CANCELLED');
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j];
        if (a.room.id === b.room.id && a.checkIn < b.checkOut && a.checkOut > b.checkIn) {
          conflicted.add(a.id);
          conflicted.add(b.id);
        }
      }
    }
    return conflicted;
  }, [reservations]);

  useEffect(() => {
    const handleResize = () => {
      // Auto-scale date viewport based on screen width
      if (window.innerWidth < 640) {
        setVisibleDays(4); // Mobile view
      } else if (window.innerWidth < 1024) {
        setVisibleDays(7); // Tablet view
      } else {
        setVisibleDays(14); // Desktop view
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate dynamic days based on current visibleDays state
  const days: Date[] = [];
  for (let i = 0; i < visibleDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }

  // Extract unique room types dynamically from rooms list
  const uniqueRoomTypes = Array.from(new Set(rooms.map(r => r.type)));

  // Client-side quick row filtering
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(roomSearchQuery.toLowerCase());
    const matchesType = roomTypeFilter === 'ALL' || room.type === roomTypeFilter;
    return matchesSearch && matchesType;
  });

  const formatDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayName = (date: Date) => {
    const daysName = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return daysName[date.getDay()];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Navigations
  const handlePrev = () => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() - 7);
    setStartDate(d);
  };

  const handleNext = () => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + 7);
    setStartDate(d);
  };

  const handleToday = () => {
    setStartDate(new Date());
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, res: Reservation) => {
    setDraggedRes(res);
    e.dataTransfer.setData('text/plain', res.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedRes(null);
    setDragOverCell(null);
  };

  const handleDragEnter = (e: React.DragEvent, roomId: number, date: Date) => {
    e.preventDefault();
    if (draggedRes) {
      setDragOverCell({ roomId, date });
    }
  };

  const handleDrop = async (e: React.DragEvent, targetRoomId: number, targetDate: Date) => {
    e.preventDefault();
    const resIdStr = e.dataTransfer.getData('text/plain');
    setDraggedRes(null);
    setDragOverCell(null);

    if (!resIdStr) return;
    const resId = parseInt(resIdStr);

    const reservation = reservations.find(r => r.id === resId);
    if (!reservation) return;

    if (subscriptionStatus === 'EXPIRED') {
      setError('Abbonamento scaduto. Impossibile modificare le prenotazioni.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const origCheckIn = new Date(reservation.checkIn);
      const origCheckOut = new Date(reservation.checkOut);
      
      const durationMs = origCheckOut.getTime() - origCheckIn.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      const newCheckIn = new Date(targetDate);
      const newCheckOut = new Date(targetDate);
      newCheckOut.setDate(targetDate.getDate() + durationDays);

      const payload = {
        guestName: reservation.guestName,
        checkIn: formatDateString(newCheckIn),
        checkOut: formatDateString(newCheckOut),
        status: reservation.status,
        source: reservation.source,
        room: { id: targetRoomId }
      };

      const res = await apiFetch(`/api/reservations/${resId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Errore durante lo spostamento della prenotazione');
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Colore del blocco prenotazione in base allo stato, cosi' il calendario si legge a colpo d'occhio
  // senza dover aprire ogni prenotazione. I sync esterni (iCal) restano sempre grigi/bloccati.
  const getBlockColorClasses = (res: Reservation) => {
    if (res.source === 'EXTERNAL_ICAL') {
      return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white border-slate-500/10 shadow-slate-400/10 cursor-default';
    }
    const interactive = 'cursor-grab active:cursor-grabbing hover:scale-[1.015] hover:shadow-lg';
    switch (res.status) {
      case 'READY_FOR_CHECKIN':
        return `bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600/10 shadow-blue-500/10 ${interactive}`;
      case 'CHECKED_IN':
        return `bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-600/10 shadow-emerald-500/10 ${interactive}`;
      case 'CHECKED_OUT':
        return `bg-gradient-to-r from-slate-400 to-slate-500 text-white border-slate-500/10 shadow-slate-400/10 ${interactive}`;
      case 'NO_SHOW':
        return `bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-600/10 shadow-orange-500/10 ${interactive}`;
      case 'CONFIRMED':
      default:
        return `bg-gradient-to-r from-accent-500 to-accent-600 text-white border-accent-600/10 shadow-accent-500/10 ${interactive}`;
    }
  };

  const getActiveReservation = (roomId: number, date: Date) => {
    const dateStr = formatDateString(date);
    return reservations.find(r => 
      r.room.id === roomId &&
      r.status !== 'CANCELLED' &&
      dateStr >= r.checkIn &&
      dateStr < r.checkOut
    );
  };

  const getReservationDurationDays = (res: Reservation) => {
    const cIn = new Date(res.checkIn);
    const cOut = new Date(res.checkOut);
    return Math.ceil((cOut.getTime() - cIn.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isRangeOverbooked = (roomId: number, start: Date, end: Date, excludeResId: number) => {
    const startStr = formatDateString(start);
    const endStr = formatDateString(end);
    return reservations.some(r => 
      r.id !== excludeResId &&
      r.room.id === roomId &&
      r.status !== 'CANCELLED' &&
      r.checkIn < endStr &&
      r.checkOut > startStr
    );
  };

  // Touch screen tap reassignment logic
  const handleTouchReassign = async (targetRoomId: number, targetDate: Date) => {
    if (!reassignModeRes) return;
    
    if (subscriptionStatus === 'EXPIRED') {
      setError('Abbonamento scaduto. Impossibile modificare le prenotazioni.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const origCheckIn = new Date(reassignModeRes.checkIn);
      const origCheckOut = new Date(reassignModeRes.checkOut);
      
      const durationMs = origCheckOut.getTime() - origCheckIn.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      const newCheckIn = new Date(targetDate);
      const newCheckOut = new Date(targetDate);
      newCheckOut.setDate(targetDate.getDate() + durationDays);

      // Perform local overbooking check
      if (isRangeOverbooked(targetRoomId, newCheckIn, newCheckOut, reassignModeRes.id)) {
        throw new Error('Spostamento fallito: La camera è già occupata nelle date selezionate.');
      }

      const payload = {
        guestName: reassignModeRes.guestName,
        checkIn: formatDateString(newCheckIn),
        checkOut: formatDateString(newCheckOut),
        status: reassignModeRes.status,
        source: reassignModeRes.source,
        room: { id: targetRoomId }
      };

      const res = await apiFetch(`/api/reservations/${reassignModeRes.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Errore durante lo spostamento della prenotazione');
      }

      setReassignModeRes(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Luminous Control Toolbar */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/70 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/70 text-sm font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Oggi
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/70 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => monthInputRef.current?.showPicker()}
            className="ml-2 flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-accent-500 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-accent-500 flex-shrink-0" />
            {startDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase()}
          </button>
          <input
            ref={monthInputRef}
            type="month"
            value={`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              if (y && m) setStartDate(new Date(y, m - 1, 1));
            }}
            className="sr-only"
          />

          {/* Scale override selector */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Vista:</span>
            <select
              value={visibleDays}
              onChange={(e) => setVisibleDays(parseInt(e.target.value))}
              className="glass-input px-3.5 py-2.5 rounded-xl text-slate-900 text-xs focus:outline-none bg-white cursor-pointer shadow-sm border border-slate-200/60"
            >
              <option value={3}>3 Giorni</option>
              <option value={4}>4 Giorni</option>
              <option value={7}>7 Giorni</option>
              <option value={10}>10 Giorni</option>
              <option value={14}>14 Giorni</option>
              <option value={30}>30 Giorni</option>
            </select>
          </div>
        </div>

        {/* Search & Dynamic Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search */}
          <div className="relative w-full sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={roomSearchQuery}
              onChange={(e) => setRoomSearchQuery(e.target.value)}
              className="glass-input block w-full pl-9 pr-3.5 py-2.5 rounded-xl text-slate-900 text-xs focus:outline-none shadow-sm"
              placeholder="Cerca camera..."
            />
          </div>

          {/* Quick Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="glass-input block w-full sm:w-36 px-3.5 py-2.5 rounded-xl text-slate-900 text-xs focus:outline-none bg-white cursor-pointer shadow-sm border border-slate-200/60"
            >
              <option value="ALL">Tutte le tipologie</option>
              {uniqueRoomTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {loading && <RefreshCw className="w-5 h-5 text-accent-500 animate-spin" />}
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/70 text-sm text-slate-700 font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            Aggiorna
          </button>
        </div>
      </div>

      {/* Legenda colori stato prenotazione */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 -mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-accent-500 to-accent-600" /> Confermata</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" /> Pronta Check-in</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" /> In struttura</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-slate-400 to-slate-500" /> Check-out</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600" /> No Show</span>
        <span className="flex items-center gap-1.5"><Lock className="w-2.5 h-2.5 text-slate-400" /> Sync Esterno</span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-xl text-sm mb-4 font-medium animate-shake">
          {error}
        </div>
      )}

      {/* Reassignment Active Notification Banner */}
      {reassignModeRes && (
        <div className="bg-gradient-to-r from-accent-500/20 to-primary-600/20 border border-accent-500/40 text-slate-800 p-3.5 rounded-2xl text-xs mb-4 flex justify-between items-center font-bold animate-pulse shadow-md backdrop-blur">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-accent-500 animate-bounce" />
            <span>
              SPOSTAMENTO ATTIVO: Tocca una cella vuota per spostare la prenotazione di <span className="text-accent-600 underline font-extrabold">{reassignModeRes.guestName}</span>.
            </span>
          </div>
          <button 
            onClick={() => setReassignModeRes(null)} 
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] uppercase tracking-wider font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer border-0"
          >
            Annulla
          </button>
        </div>
      )}

      {/* Luminous Grid Container */}
      <div className="gradient-border-wrapper flex-grow flex flex-col overflow-hidden relative z-10 shadow-lg">
        <div className="glass-panel w-full h-full flex flex-col overflow-hidden">
          
          {/* Scrollable area - Dual scrolling enabled */}
          <div className="overflow-auto flex-grow select-none max-h-[600px] w-full relative">
            <div className="w-full h-full min-w-max">
              
              {/* Header Row */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: `200px repeat(${visibleDays}, minmax(100px, 1fr))`
                }}
                className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-100/90 backdrop-blur"
              >
                {/* Intersection Top-Left cell: Locked in both directions */}
                <div className="sticky left-0 top-0 z-40 p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 bg-slate-100/95 backdrop-blur-md">
                  Camere / Date
                </div>
                {days.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-3 text-center border-r border-slate-200/50 last:border-0 flex flex-col items-center justify-center ${
                      isToday(day) ? 'bg-accent-500/10 text-accent-600' : 'text-slate-700'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                      {getDayName(day)}
                    </span>
                    <span className="text-lg font-extrabold mt-0.5">
                      {day.getDate()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Room Rows */}
              <div className="divide-y divide-slate-200/60">
                {filteredRooms.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-medium text-sm">
                    {rooms.length === 0 
                      ? 'Nessuna camera creata. Clicca su "Gestisci Camere" in alto per iniziare!'
                      : 'Nessuna camera corrisponde ai filtri selezionati.'}
                  </div>
                ) : (
                  filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `200px repeat(${visibleDays}, minmax(100px, 1fr))`
                      }}
                      className="h-20 items-stretch bg-white/20 hover:bg-slate-50/[0.3] transition-colors"
                    >
                      {/* Room Info Cell - STICKY LEFT */}
                      <div className="sticky left-0 z-20 p-4 border-r border-slate-200/50 flex flex-col justify-center bg-white/95 backdrop-blur-md shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                        <span className="font-bold text-slate-900 tracking-wide text-sm truncate">{room.name}</span>
                        <span className="text-[10px] text-accent-500 uppercase tracking-widest font-bold mt-0.5 truncate">
                          {room.type} ({room.capacity} posti)
                        </span>
                      </div>

                      {/* Day Cells */}
                      {days.map((day, idx) => {
                        const dateStr = formatDateString(day);
                        const activeRes = getActiveReservation(room.id, day);

                        // Every reservation whose block should start being drawn in this cell
                        // (own check-in day, or clipped to the first visible day if it started
                        // earlier). Normally 0 or 1 — but if the same room has two overlapping
                        // reservations (shouldn't happen, but can via iCal sync or legacy data),
                        // all of them are collected here and stacked instead of one silently
                        // hiding the other.
                        const blocksStartingHere = reservations.filter(r =>
                          r.room.id === room.id &&
                          r.status !== 'CANCELLED' &&
                          dateStr >= r.checkIn && dateStr < r.checkOut &&
                          (r.checkIn === dateStr || (idx === 0 && r.checkIn < dateStr))
                        );
                        const isOverlapping = blocksStartingHere.length > 1;

                        // Determine if there is a real-time DND preview for this cell
                        const isPreviewCell = draggedRes && dragOverCell && 
                          dragOverCell.roomId === room.id && 
                          formatDateString(dragOverCell.date) === dateStr;

                        let previewWidthStyle = '100%';
                        let previewOverbooked = false;
                        if (isPreviewCell) {
                          const durationDays = getReservationDurationDays(draggedRes);
                          previewWidthStyle = `calc(${durationDays} * 100% - 8px)`;
                          
                          const proposedEnd = new Date(day);
                          proposedEnd.setDate(day.getDate() + durationDays);
                          previewOverbooked = isRangeOverbooked(room.id, day, proposedEnd, draggedRes.id);
                        }

                        return (
                          <div
                            key={idx}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnter={(e) => handleDragEnter(e, room.id, day)}
                            onDrop={(e) => handleDrop(e, room.id, day)}
                            onClick={() => {
                              if (!activeRes && subscriptionStatus !== 'EXPIRED') {
                                if (reassignModeRes) {
                                  // Touch reassign cell tap
                                  handleTouchReassign(room.id, day);
                                } else {
                                  onCellClick(room.id, day);
                                }
                              }
                            }}
                            className={`border-r border-slate-200/40 relative flex items-center p-1 transition-all duration-150 ${
                              activeRes ? 'bg-slate-100/50' : 'cursor-pointer hover:bg-accent-500/[0.04]'
                            } ${isToday(day) ? 'bg-accent-500/[0.03]' : ''} ${
                              reassignModeRes && !activeRes 
                                ? 'border border-dashed border-accent-500/40 bg-accent-500/[0.02] hover:bg-accent-500/10 animate-pulse' 
                                : ''
                            }`}
                          >
                            {/* Visual Reservation Block(s) — stacked when the room is double-booked */}
                            {blocksStartingHere.map((res, bIdx) => {
                              const startDateStr = formatDateString(startDate);
                              const visualStartStr = res.checkIn > startDateStr ? res.checkIn : startDateStr;
                              const blockStart = new Date(visualStartStr);
                              const blockEnd = new Date(res.checkOut);
                              const spanDays = Math.ceil((blockEnd.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24));
                              const blockStyle: React.CSSProperties = {
                                width: `calc(${spanDays} * 100% - 8px)`,
                                zIndex: 10 + bIdx,
                              };
                              if (isOverlapping) {
                                const slotHeight = 100 / blocksStartingHere.length;
                                blockStyle.top = `${bIdx * slotHeight}%`;
                                blockStyle.height = `${slotHeight - 4}%`;
                              }
                              const hasConflict = conflictedReservationIds.has(res.id);
                              return (
                                <div
                                  key={res.id}
                                  draggable={res.source !== 'EXTERNAL_ICAL'}
                                  onDragStart={(e) => handleDragStart(e, res)}
                                  onDragEnd={handleDragEnd}
                                  onClick={(ev) => {
                                    ev.stopPropagation(); // Avoid day cell triggers
                                    setShowReassignModal(res);
                                  }}
                                  style={blockStyle}
                                  title={hasConflict ? 'Attenzione: camera sovrapprenotata in queste date' : undefined}
                                  className={`absolute left-1.5 ${isOverlapping ? '' : 'h-[80%]'} rounded-xl flex items-center justify-between px-3 text-xs font-bold shadow-md border transition-all select-none ${
                                    getBlockColorClasses(res)
                                  } ${hasConflict ? 'ring-2 ring-red-500/70' : ''} ${reassignModeRes && reassignModeRes.id === res.id ? 'ring-4 ring-accent-500 ring-offset-2' : ''}`}
                                >
                                  <div className="flex items-center gap-1.5 overflow-hidden truncate">
                                    {hasConflict ? (
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    ) : res.source === 'EXTERNAL_ICAL' ? (
                                      <Lock className="w-3.5 h-3.5 shrink-0 opacity-90" />
                                    ) : (
                                      <User className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    <span className="truncate">{res.guestName}</span>
                                  </div>
                                  {res.source !== 'EXTERNAL_ICAL' && !hasConflict && (
                                    <Move className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                  )}
                                </div>
                              );
                            })}

                            {/* Drag and Drop Premium Preview Block */}
                            {isPreviewCell && (
                              <div
                                style={{
                                  width: previewWidthStyle,
                                  zIndex: 20,
                                }}
                                className={`absolute left-1.5 h-[80%] rounded-xl flex items-center justify-between px-3 text-xs font-bold border border-dashed pointer-events-none select-none animate-pulse ${
                                  previewOverbooked
                                    ? 'bg-red-500/20 border-red-500 text-red-700 shadow-lg shadow-red-500/5'
                                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/5'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 overflow-hidden truncate">
                                  {previewOverbooked ? (
                                    <>
                                      <X className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">Occupato! ⚠️</span>
                                    </>
                                  ) : (
                                    <>
                                      <Move className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                                      <span className="truncate">Sposta qui ({draggedRes.guestName})</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Floating Action Overlay for touch-tap reassignment */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm select-none animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 shadow-2xl border border-slate-200/50 backdrop-blur-md rounded-2xl bg-white/95">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Opzioni Prenotazione
              </h3>
              <button 
                onClick={() => setShowReassignModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ospite</div>
                <div className="text-sm font-bold text-slate-800">{showReassignModal.guestName}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-In</div>
                  <div className="text-xs font-bold text-slate-700">{showReassignModal.checkIn.split('-').reverse().join('/')}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-Out</div>
                  <div className="text-xs font-bold text-slate-700">{showReassignModal.checkOut.split('-').reverse().join('/')}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Camera Corrente</div>
                <div className="text-xs font-bold text-slate-700">{showReassignModal.room.name}</div>
              </div>
            </div>

            <div className="space-y-2">
              {showReassignModal.source !== 'EXTERNAL_ICAL' && (
                <button
                  onClick={() => {
                    setReassignModeRes(showReassignModal);
                    setShowReassignModal(null);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl text-white font-bold uppercase tracking-widest text-xs shadow-md bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  <Move className="w-4 h-4" /> Sposta Prenotazione
                </button>
              )}

              <button
                onClick={() => {
                  onReservationClick(showReassignModal);
                  setShowReassignModal(null);
                }}
                className="w-full py-3.5 px-4 rounded-xl text-slate-700 font-bold uppercase tracking-widest text-xs border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer bg-white"
              >
                <User className="w-4 h-4 text-slate-400" /> Dettagli / Modifica
              </button>

              <button
                onClick={() => setShowReassignModal(null)}
                className="w-full py-3 px-4 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer bg-transparent border-0"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
