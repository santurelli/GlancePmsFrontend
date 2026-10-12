import React, { useEffect, useState } from 'react';
import { Hotel, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiFetch, setAuthToken, getAuthToken, getUserInfo } from './api';

interface Props { token: string; }
interface InviteInfo { tenantName: string; role: string; invitedEmail: string; }

const ROLE_LABEL: Record<string, string> = { OWNER: 'Proprietario', MANAGER: 'Manager' };

export const AcceptInvitePage: React.FC<Props> = ({ token }) => {
  const [info, setInfo]         = useState<InviteInfo | null>(null);
  const [infoError, setInfoError] = useState('');
  const [loading, setLoading]   = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  const isLoggedIn = !!getAuthToken() && !!getUserInfo();

  useEffect(() => {
    apiFetch(`/api/auth/invite-info?token=${token}`)
      .then(async res => {
        if (!res.ok) { setInfoError('Invito non valido o scaduto'); return; }
        setInfo(await res.json());
      })
      .catch(() => setInfoError('Errore nel caricamento dell\'invito'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true); setError('');
    try {
      const res = await apiFetch('/api/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Errore durante l\'accettazione');
      }
      const data = await res.json();
      setAuthToken(data.token);
      setDone(true);
    } catch (err: any) { setError(err.message); }
    finally { setAccepting(false); }
  };

  return (
    <div className="min-h-screen bg-cosmic bg-grid flex flex-col items-center justify-center px-4 py-12 select-none overflow-hidden">
      <div className="glow-orb w-[500px] h-[500px] bg-primary-500/12 top-[-80px] left-[-80px] animate-pulse-glow" />
      <div className="glow-orb w-[600px] h-[600px] bg-accent-500/10 bottom-[-120px] right-[-120px] animate-pulse-glow" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-accent-500 p-[1.5px] shadow-lg">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
              <Hotel className="w-8 h-8 text-accent-500" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">GlancePMS</h1>
        </div>

        <div className="gradient-border-wrapper w-full">
          <div className="glass-panel px-8 py-8">
            {loading && <p className="text-sm text-slate-400 text-center py-4">Caricamento invito...</p>}

            {infoError && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm font-semibold text-red-500">{infoError}</p>
                <a href="/" className="text-xs text-accent-600 font-bold hover:underline">Torna al login</a>
              </div>
            )}

            {info && !done && (
              <>
                <div className="flex flex-col items-center gap-3 mb-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-accent-500" />
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900">Sei stato invitato!</h2>
                  <p className="text-sm text-slate-500">
                    Unisciti a <strong className="text-slate-800">{info.tenantName}</strong> come{' '}
                    <strong className="text-slate-800">{ROLE_LABEL[info.role] ?? info.role}</strong>.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/25 text-red-500 p-3 rounded-xl text-xs font-medium">
                    {error}
                  </div>
                )}

                {isLoggedIn ? (
                  <button onClick={handleAccept} disabled={accepting}
                    className="btn-glow-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm disabled:opacity-60 cursor-pointer">
                    {accepting ? 'Accettazione...' : <><ArrowRight className="w-4 h-4" /> Accetta e Accedi alla Struttura</>}
                  </button>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-xs text-slate-500">Devi essere loggato per accettare l'invito.</p>
                    <a href={`/?invite=${token}`}
                      className="btn-glow-primary flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm">
                      <ArrowRight className="w-4 h-4" /> Accedi o Registrati
                    </a>
                  </div>
                )}
              </>
            )}

            {done && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <h2 className="text-lg font-extrabold text-slate-900">Invito accettato!</h2>
                <p className="text-sm text-slate-500">Sei ora parte del team di <strong>{info?.tenantName}</strong>.</p>
                <a href="/" className="btn-glow-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm">
                  Vai alla Dashboard <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
