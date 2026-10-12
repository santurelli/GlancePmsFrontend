import React, { useState } from 'react';
import { Hotel, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiFetch } from './api';

interface Props { token: string; }

export const ResetPasswordPage: React.FC<Props> = ({ token }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Le password non coincidono'); return; }
    if (password.length < 8)  { setError('La password deve essere di almeno 8 caratteri'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Token non valido o scaduto');
      }
      setDone(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-cosmic bg-grid flex flex-col items-center justify-center px-4 py-12 select-none overflow-hidden">
      <div className="glow-orb w-[500px] h-[500px] bg-primary-500/12 top-[-80px] left-[-80px] animate-pulse-glow" />
      <div className="glow-orb w-[600px] h-[600px] bg-accent-500/10 bottom-[-120px] right-[-120px] animate-pulse-glow" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-accent-500 p-[1.5px] shadow-lg">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
              <Hotel className="w-8 h-8 text-accent-500" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">GlancePMS</h1>
            <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-slate-400 mt-1 block">Reimposta Password</span>
          </div>
        </div>

        <div className="gradient-border-wrapper w-full">
          <div className="glass-panel px-8 py-8">
            {done ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <h2 className="text-lg font-extrabold text-slate-900">Password aggiornata!</h2>
                <p className="text-sm text-slate-500 text-center">Puoi ora accedere con la tua nuova password.</p>
                <a href="/" className="btn-glow-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm mt-2">
                  Vai al login <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-extrabold text-slate-900">Nuova password</h2>
                  <p className="text-xs text-slate-400 mt-1">Scegli una password di almeno 8 caratteri.</p>
                </div>

                {error && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/25 text-red-500 p-3 rounded-xl text-xs font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nuova Password</label>
                    <div className="relative focus-within:text-accent-500 text-slate-400 transition-colors">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                      <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                        className="glass-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                        placeholder="••••••••" autoFocus />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Conferma Password</label>
                    <div className="relative focus-within:text-accent-500 text-slate-400 transition-colors">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                      <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                        className="glass-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                        placeholder="••••••••" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-glow-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm mt-2 disabled:opacity-60">
                    {loading ? 'Aggiornamento...' : <><ArrowRight className="w-4 h-4" /> Aggiorna Password</>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
