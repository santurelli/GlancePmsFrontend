import React, { useState, useEffect } from 'react';
import {
  Hotel, User, Users, CheckCircle2, ChevronRight, ChevronLeft,
  Plus, Trash2, Calendar, ShieldAlert, Sparkles, Loader2
} from 'lucide-react';
import Swal from 'sweetalert2';
import { DocumentScanner } from './DocumentScanner';
import { PlaceSelect } from './PlaceSelect';
import { COMUNI, STATI, LUOGHI, ITALY_CODE, Place } from './places';
import { Lang, LANGS, detectLang, t, ocrLangFor } from './checkinI18n';

// Hand-drawn flag icons instead of Unicode flag emoji: on Windows most browsers have no glyph for
// flag emoji and fall back to showing the raw two-letter country code as plain text, which reads
// as broken/duplicated next to our own language-code label. SVGs render identically everywhere.
const FLAG_ICONS: Record<Lang, React.ReactElement> = {
  it: (
    <svg width="18" height="13" viewBox="0 0 3 2" className="rounded-[2px] flex-shrink-0">
      <rect width="1" height="2" x="0" fill="#009246" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#ce2b37" />
    </svg>
  ),
  en: (
    <svg width="18" height="13" viewBox="0 0 60 40" className="rounded-[2px] flex-shrink-0">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="7" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="12" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  ),
  es: (
    <svg width="18" height="13" viewBox="0 0 3 2" className="rounded-[2px] flex-shrink-0">
      <rect width="3" height="2" fill="#AA151B" />
      <rect width="3" height="1" y="0.5" fill="#F1BF00" />
    </svg>
  ),
  de: (
    <svg width="18" height="13" viewBox="0 0 3 2" className="rounded-[2px] flex-shrink-0">
      <rect width="3" height="0.667" y="0" fill="#000" />
      <rect width="3" height="0.667" y="0.667" fill="#DD0000" />
      <rect width="3" height="0.667" y="1.333" fill="#FFCE00" />
    </svg>
  ),
  fr: (
    <svg width="18" height="13" viewBox="0 0 3 2" className="rounded-[2px] flex-shrink-0">
      <rect width="1" height="2" x="0" fill="#0055A4" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#EF4135" />
    </svg>
  ),
};

interface PublicCheckinPageProps {
  token: string;
}

interface ReservationDetails {
  id: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  roomName: string;
}

interface GuestProfile {
  nome: string;
  cognome: string;
  sesso: string;
  dataNascita: string; // YYYY-MM-DD
  bornAbroad: boolean; // UI only, not sent to the server
  luogoNascita: string; // Alloggiati Web comune code (born in Italy)
  provinciaNascita: string; // 2-letter province (born in Italy)
  statoNascita: string; // Alloggiati Web state code
  cittadinanza: string; // Alloggiati Web state code (defaults to '100000100' for Italy)
  tipoDocumento?: string; // Only primary
  numeroDocumento?: string; // Only primary
  luogoRilascio?: string; // Only primary
  tipoAlloggiati?: string; // Only accompanying: 'FAMILIARE' or 'MEMBRO_GRUPPO'
}

const birthPlaceComplete = (g: GuestProfile) =>
  g.bornAbroad ? !!g.statoNascita && g.statoNascita !== ITALY_CODE : !!g.luogoNascita && !!g.provinciaNascita;

interface BirthFieldsProps {
  guest: GuestProfile;
  onPatch: (patch: Partial<GuestProfile>) => void;
  tt: (key: Parameters<typeof t>[1]) => string;
  labelClass: string;
  inputClass: string;
}

// Birth place as Alloggiati Web wants it: Italian comune (+province) or, if born abroad, only the state.
const BirthFields: React.FC<BirthFieldsProps> = ({ guest, onPatch, tt, labelClass, inputClass }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className={labelClass}>{tt('labelNatoIn')}</label>
      <select
        value={guest.bornAbroad ? 'ESTERO' : 'ITALIA'}
        onChange={(e) => {
          const abroad = e.target.value === 'ESTERO';
          onPatch({
            bornAbroad: abroad,
            luogoNascita: '',
            provinciaNascita: '',
            statoNascita: abroad ? '' : ITALY_CODE,
          });
        }}
        className={`${inputClass} bg-white`}
      >
        <option value="ITALIA">{tt('optionNatoItalia')}</option>
        <option value="ESTERO">{tt('optionNatoEstero')}</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>{guest.bornAbroad ? tt('labelStatoNascita') : tt('labelComuneNascita')}</label>
      {guest.bornAbroad ? (
        <PlaceSelect
          key="stato"
          options={STATI.filter(s => s.code !== ITALY_CODE)}
          value={guest.statoNascita}
          onChange={(p: Place | null) => onPatch({ statoNascita: p ? p.code : '' })}
          placeholder={tt('placeholderSearchPlace')}
          noResultsText={tt('noResultsText')}
          pickFromListText={tt('pickFromListText')}
          className={inputClass}
          required
        />
      ) : (
        <PlaceSelect
          key="comune"
          options={COMUNI}
          value={guest.luogoNascita}
          onChange={(p: Place | null) =>
            onPatch({
              luogoNascita: p ? p.code : '',
              provinciaNascita: p?.province ?? '',
              statoNascita: ITALY_CODE,
            })
          }
          placeholder={tt('placeholderSearchPlace')}
          noResultsText={tt('noResultsText')}
          pickFromListText={tt('pickFromListText')}
          className={inputClass}
          required
        />
      )}
    </div>
  </div>
);

export const PublicCheckinPage: React.FC<PublicCheckinPageProps> = ({ token }) => {
  const [lang, setLang] = useState<Lang>(() => detectLang());
  const tt = (key: Parameters<typeof t>[1], vars?: Record<string, string | number>) => t(lang, key, vars);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resDetails, setResDetails] = useState<ReservationDetails | null>(null);

  // Form State - Primary Guest (Step 1)
  const [primary, setPrimary] = useState<GuestProfile>({
    nome: '',
    cognome: '',
    sesso: 'M',
    dataNascita: '',
    bornAbroad: false,
    luogoNascita: '',
    provinciaNascita: '',
    statoNascita: ITALY_CODE,
    cittadinanza: ITALY_CODE,
    tipoDocumento: 'IDENT',
    numeroDocumento: '',
    luogoRilascio: ''
  });

  // Form State - Accompanying Guests (Step 2)
  const [accompanying, setAccompanying] = useState<GuestProfile[]>([]);
  
  // OCR Camera Modal Trigger
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'primary' | number>('primary');

  // Load Reservation details on mount
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/v1/public/checkin/${token}`);
        if (!res.ok) {
          throw new Error('not_found');
        }
        const data = await res.json();
        setResDetails(data);
        
        // Default the name in primary if reservation has guestName
        if (data.guestName) {
          const parts = data.guestName.split(' ');
          if (parts.length > 1) {
            setPrimary(p => ({
              ...p,
              cognome: parts[parts.length - 1],
              nome: parts.slice(0, parts.length - 1).join(' ')
            }));
          } else {
            setPrimary(p => ({ ...p, nome: data.guestName }));
          }
        }
      } catch (err: any) {
        setHasError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [token]);

  const addAccompanying = () => {
    setAccompanying([...accompanying, {
      nome: '',
      cognome: '',
      sesso: 'M',
      dataNascita: '',
      bornAbroad: false,
      luogoNascita: '',
      provinciaNascita: '',
      statoNascita: ITALY_CODE,
      cittadinanza: ITALY_CODE,
      tipoAlloggiati: 'FAMILIARE'
    }]);
  };

  const removeAccompanying = (index: number) => {
    setAccompanying(accompanying.filter((_, i) => i !== index));
  };

  const patchAccompanying = (index: number, patch: Partial<GuestProfile>) => {
    setAccompanying(prev => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };

  const handleAccompanyingChange = (index: number, field: keyof GuestProfile, value: string) => {
    const updated = [...accompanying];
    updated[index] = { ...updated[index], [field]: value };
    setAccompanying(updated);
  };

  // OCR Scan success mapping
  const handleOcrSuccess = (data: { nome: string; cognome: string; sesso: string; dataNascita: string; numeroDocumento: string }) => {
    setShowScanner(false);
    if (scannerTarget === 'primary') {
      setPrimary(p => ({
        ...p,
        nome: data.nome,
        cognome: data.cognome,
        sesso: data.sesso,
        dataNascita: data.dataNascita,
        numeroDocumento: data.numeroDocumento
      }));
    } else {
      const idx = scannerTarget;
      const updated = [...accompanying];
      updated[idx] = {
        ...updated[idx],
        nome: data.nome,
        cognome: data.cognome,
        sesso: data.sesso,
        dataNascita: data.dataNascita
      };
      setAccompanying(updated);
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: tt('ocrToastTitle'),
      showConfirmButton: false,
      timer: 2500,
      background: 'rgba(255, 255, 255, 0.95)',
      backdrop: 'transparent'
    });
  };

  // Submit complete check-in
  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primary.nome || !primary.cognome || !primary.dataNascita || !primary.cittadinanza || !primary.numeroDocumento || !primary.luogoRilascio || !birthPlaceComplete(primary)) {
      Swal.fire(tt('validationTitle'), tt('validationPrimaryText'), 'warning');
      return;
    }

    // Validate accompanying guests fields
    for (let i = 0; i < accompanying.length; i++) {
      const acc = accompanying[i];
      if (!acc.nome || !acc.cognome || !acc.dataNascita || !acc.cittadinanza || !birthPlaceComplete(acc)) {
        Swal.fire(tt('validationTitle'), tt('validationAccompanyingText', { n: i + 1 }), 'warning');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = [primary, ...accompanying].map(({ bornAbroad, ...g }) => g);
      const res = await fetch(`/api/v1/public/checkin/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || tt('errorSubmitDefault'));
      }

      setStep(3); // Success Screen
    } catch (err: any) {
      Swal.fire(tt('errorTitleGeneric'), err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <Loader2 className="w-12 h-12 text-accent-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold tracking-widest uppercase text-slate-400">{tt('loadingTitle')}</h2>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-extrabold text-white mb-2">{tt('errorTitle')}</h2>
        <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-6">{tt('defaultErrorMsg')}</p>
        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{tt('errorFooter')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cosmic bg-grid text-slate-800 flex flex-col font-sans relative overflow-x-hidden pb-12">
      {/* Visual glowing backdrops */}
      <div className="glow-orb w-[400px] h-[400px] bg-primary-500/8 top-[-100px] left-[-150px] pointer-events-none" />
      <div className="glow-orb w-[400px] h-[400px] bg-accent-500/5 bottom-[-100px] right-[-150px] pointer-events-none" />

      {/* Elegant minimalist header */}
      <header className="w-full bg-white/40 border-b border-slate-200/50 backdrop-blur select-none">
        <div className="max-w-2xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-accent-500" />
            <span className="text-sm font-black tracking-tight text-slate-900">GlancePMS</span>
          </div>
          <span className="text-[9px] font-bold text-accent-600 bg-accent-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {tt('badge')}
          </span>
        </div>
        <div className="max-w-2xl mx-auto px-3 sm:px-6 pb-3 flex flex-wrap items-center justify-center gap-1.5">
          {LANGS.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              aria-label={l.label}
              aria-pressed={lang === l.code}
              className={`px-2 py-1 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer flex-shrink-0 ${
                lang === l.code ? 'bg-accent-500/15 ring-2 ring-accent-500 text-accent-700' : 'text-slate-500 hover:bg-slate-200/60'
              }`}
            >
              {FLAG_ICONS[l.code]}
              <span>{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-2xl mx-auto px-4 sm:px-6 w-full mt-6 relative z-10 flex flex-col justify-center">
        
        {/* Reservation summary card */}
        {resDetails && step < 3 && (
          <div className="gradient-border-wrapper mb-6 animate-fade-in">
            <div className="glass-panel p-5 flex justify-between items-center gap-4 bg-white/70">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{tt('summaryLabel')}</span>
                <h3 className="font-extrabold text-slate-950 text-base">{resDetails.guestName}</h3>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold uppercase">
                  <Calendar className="w-3.5 h-3.5 text-accent-500" />
                  <span>{tt('summaryDates', { room: resDetails.roomName, checkIn: resDetails.checkIn, checkOut: resDetails.checkOut })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {step < 3 && (
          <div className="flex justify-between items-center mb-6 px-3 select-none">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 1 ? 'bg-accent-500 text-white shadow-sm' : 'bg-slate-200 text-slate-500'
              }`}>1</span>
              <span className="text-xs font-bold text-slate-900 hidden sm:inline">{tt('stepPrimary')}</span>
            </div>
            <div className="h-0.5 flex-grow mx-4 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-accent-500 transition-all duration-300" style={{ width: step === 2 ? '100%' : '50%' }} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 2 ? 'bg-accent-500 text-white shadow-sm' : 'bg-slate-200 text-slate-500'
              }`}>2</span>
              <span className="text-xs font-bold text-slate-900 hidden sm:inline">{tt('stepAccompanying')}</span>
            </div>
          </div>
        )}

        {/* Multi-step form content */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="gradient-border-wrapper animate-fade-in">
            <div className="glass-panel p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-5 h-5 text-accent-500" /> {tt('sectionTitle1')}
                </h4>
                <button
                  type="button"
                  onClick={() => { setScannerTarget('primary'); setShowScanner(true); }}
                  className="px-3 py-1.5 rounded-xl bg-accent-500/10 text-accent-600 hover:bg-accent-500 hover:text-white border border-accent-500/20 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {tt('scanButton')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{tt('labelNome')}</label>
                  <input
                    type="text"
                    required
                    value={primary.nome}
                    onChange={(e) => setPrimary({ ...primary, nome: e.target.value })}
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                    placeholder={tt('placeholderNome')}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{tt('labelCognome')}</label>
                  <input
                    type="text"
                    required
                    value={primary.cognome}
                    onChange={(e) => setPrimary({ ...primary, cognome: e.target.value })}
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                    placeholder={tt('placeholderCognome')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{tt('labelSesso')}</label>
                  <select
                    value={primary.sesso}
                    onChange={(e) => setPrimary({ ...primary, sesso: e.target.value })}
                    className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none bg-white"
                  >
                    <option value="M">{tt('optionM')}</option>
                    <option value="F">{tt('optionF')}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{tt('labelDataNascita')}</label>
                  <input
                    type="date"
                    required
                    value={primary.dataNascita}
                    onChange={(e) => setPrimary({ ...primary, dataNascita: e.target.value })}
                    className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <BirthFields
                guest={primary}
                onPatch={(patch) => setPrimary(p => ({ ...p, ...patch }))}
                tt={tt}
                labelClass="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1"
                inputClass="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
              />

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{tt('labelCittadinanza')}</label>
                <PlaceSelect
                  options={STATI}
                  value={primary.cittadinanza}
                  onChange={(p) => setPrimary(g => ({ ...g, cittadinanza: p ? p.code : '' }))}
                  placeholder={tt('placeholderSearchPlace')}
                  noResultsText={tt('noResultsText')}
                  pickFromListText={tt('pickFromListText')}
                  className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-slate-200/50 pt-4 space-y-4">
                <h5 className="text-[10px] font-bold text-accent-600 uppercase tracking-wider ml-1">{tt('sectionDocument')}</h5>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{tt('labelTipoDocumento')}</label>
                    <select
                      value={primary.tipoDocumento}
                      onChange={(e) => setPrimary({ ...primary, tipoDocumento: e.target.value })}
                      className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none bg-white"
                    >
                      <option value="IDENT">{tt('optionCartaIdentita')}</option>
                      <option value="PASOR">{tt('optionPassaporto')}</option>
                      <option value="PATEN">{tt('optionPatente')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{tt('labelNumeroDocumento')}</label>
                    <input
                      type="text"
                      required
                      value={primary.numeroDocumento}
                      onChange={(e) => setPrimary({ ...primary, numeroDocumento: e.target.value })}
                      className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                      placeholder={tt('placeholderNumeroDocumento')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{tt('labelLuogoRilascio')}</label>
                  <PlaceSelect
                    options={LUOGHI}
                    value={primary.luogoRilascio ?? ''}
                    onChange={(p) => setPrimary(g => ({ ...g, luogoRilascio: p ? p.code : '' }))}
                    placeholder={tt('placeholderSearchPlace')}
                    noResultsText={tt('noResultsText')}
                    pickFromListText={tt('pickFromListText')}
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Next step button */}
              <button
                type="submit"
                className="btn-glow-primary w-full py-4 rounded-xl text-white font-extrabold uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                {tt('continueButton')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCheckinSubmit} className="space-y-6 animate-fade-in">
            <div className="gradient-border-wrapper">
              <div className="glass-panel p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200/50 pb-3 select-none">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent-500" /> {tt('sectionTitle2')}
                  </h4>
                  <button
                    type="button"
                    onClick={addAccompanying}
                    className="px-3.5 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" /> {tt('addButton')}
                  </button>
                </div>

                {accompanying.length === 0 ? (
                  <div className="text-center p-8 bg-slate-50/50 rounded-2xl border border-slate-200/50">
                    <p className="text-xs text-slate-500 font-medium">{tt('emptyAccompanying')}</p>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[380px] overflow-y-auto pr-1">
                    {accompanying.map((acc, index) => (
                      <div key={index} className="p-4 rounded-2xl border border-slate-200/60 bg-white/40 space-y-4 relative">
                        <button
                          type="button"
                          onClick={() => removeAccompanying(index)}
                          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                          title={tt('removeButtonTitle')}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>

                        <div className="flex items-center justify-between pr-8">
                          <span className="text-[10px] font-extrabold text-accent-600 uppercase tracking-widest">
                            {tt('accompanyingLabel', { n: index + 1 })}
                          </span>

                          <button
                            type="button"
                            onClick={() => { setScannerTarget(index); setShowScanner(true); }}
                            className="px-2 py-1 rounded-lg bg-accent-500/10 text-accent-600 hover:bg-accent-500 hover:text-white text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" /> {tt('scanShort')}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt('labelNome')}</label>
                            <input
                              type="text"
                              required
                              value={acc.nome}
                              onChange={(e) => handleAccompanyingChange(index, 'nome', e.target.value)}
                              className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                              placeholder={tt('placeholderNome')}
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt('labelCognome')}</label>
                            <input
                              type="text"
                              required
                              value={acc.cognome}
                              onChange={(e) => handleAccompanyingChange(index, 'cognome', e.target.value)}
                              className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                              placeholder={tt('placeholderCognome')}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt('labelSesso')}</label>
                            <select
                              value={acc.sesso}
                              onChange={(e) => handleAccompanyingChange(index, 'sesso', e.target.value)}
                              className="glass-input block w-full px-2 py-2 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                            >
                              <option value="M">{tt('optionM')}</option>
                              <option value="F">{tt('optionF')}</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt('labelDataNascita')}</label>
                            <input
                              type="date"
                              required
                              value={acc.dataNascita}
                              onChange={(e) => handleAccompanyingChange(index, 'dataNascita', e.target.value)}
                              className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <BirthFields
                          guest={acc}
                          onPatch={(patch) => patchAccompanying(index, patch)}
                          tt={tt}
                          labelClass="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                          inputClass="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt('labelTipoAssociazione')}</label>
                            <select
                              value={acc.tipoAlloggiati}
                              onChange={(e) => handleAccompanyingChange(index, 'tipoAlloggiati', e.target.value)}
                              className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                            >
                              <option value="FAMILIARE">{tt('optionFamiliare')}</option>
                              <option value="MEMBRO_GRUPPO">{tt('optionMembroGruppo')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tt('labelCittadinanza')}</label>
                            <PlaceSelect
                              options={STATI}
                              value={acc.cittadinanza}
                              onChange={(p) => patchAccompanying(index, { cittadinanza: p ? p.code : '' })}
                              placeholder={tt('placeholderSearchPlace')}
                              noResultsText={tt('noResultsText')}
                              pickFromListText={tt('pickFromListText')}
                              className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step navigation buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold uppercase tracking-widest text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> {tt('backButton')}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="btn-glow-primary flex-grow py-3.5 px-4 rounded-xl text-white font-extrabold uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {tt('submittingButton')}
                  </>
                ) : (
                  <>
                    {tt('submitButton')} <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="gradient-border-wrapper max-w-md mx-auto animate-fade-in mt-8 select-none">
            <div className="glass-panel p-8 text-center space-y-6">
              
              {/* Check circle animation */}
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-sm shadow-emerald-500/10 animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{tt('successTitle')}</h3>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">
                  {tt('successSubtitle')}
                </p>
              </div>

              {resDetails && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">{tt('roomLabel')}</span>
                    <span className="font-extrabold text-slate-900">{resDetails.roomName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">{tt('checkinLabel')}</span>
                    <span className="font-extrabold text-slate-900">{resDetails.checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">{tt('checkoutLabel')}</span>
                    <span className="font-extrabold text-slate-900">{resDetails.checkOut}</span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                {tt('successFooter')}
              </p>
            </div>
          </div>
        )}

      </main>

      {/* OCR Scanner overlay modal */}
      {showScanner && (
        <DocumentScanner
          onScanSuccess={handleOcrSuccess}
          onClose={() => setShowScanner(false)}
          ocrLang={ocrLangFor(lang)}
          labels={{
            cameraError: tt('scannerCameraError'),
            statusCapture: tt('scannerStatusCapture'),
            statusInit: tt('scannerStatusInit'),
            statusAnalyze: tt('scannerStatusAnalyze'),
            statusExtract: tt('scannerStatusExtract'),
            statusError: tt('scannerStatusError'),
            title: tt('scannerTitle'),
            retryButton: tt('scannerRetryButton'),
            frameHint: tt('scannerFrameHint'),
            processingTitle: tt('scannerProcessingTitle'),
            captureButton: tt('scannerCaptureButton'),
          }}
        />
      )}
    </div>
  );
};
