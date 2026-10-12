import React, { useState } from 'react';
import { apiFetch, setAuthToken } from './api';
import { Hotel, Mail, Lock, ArrowRight, ShieldCheck, Globe, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react';

interface Tenant {
  id: number;
  businessName: string;
  subscriptionStatus: string;
}

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [preAuthToken, setPreAuthToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ userEmail: email, password, businessName, businessEmail }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Errore nella registrazione');
        }
        const data = await res.json();
        setAuthToken(data.token);
        onSuccess();
      } else {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Credenziali non valide');
        }
        const data = await res.json();
        if (data.multiTenant) {
          setAvailableTenants(data.availableTenants);
          setPreAuthToken(data.token);
          setAuthToken(data.token);
        } else {
          setAuthToken(data.token);
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = async (tenantId: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/select-tenant', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${preAuthToken}` },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) throw new Error('Errore nella selezione della struttura');
      const data = await res.json();
      setAuthToken(data.token);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: forgotEmail }) });
      setForgotSent(true);
    } catch (_) { setForgotSent(true); } // Always show success to avoid email enumeration
    finally { setForgotLoading(false); }
  };

  if (availableTenants.length > 0) {
    return (
      <div className="min-h-screen bg-cosmic bg-grid flex flex-col items-center justify-center px-4 select-none overflow-hidden">
        <div className="glow-orb w-[500px] h-[500px] bg-primary-500/15 top-[-80px] left-[-80px] animate-pulse-glow" />
        <div className="glow-orb w-[600px] h-[600px] bg-accent-500/10 bottom-[-120px] right-[-120px] animate-pulse-glow" />

        <div className="relative z-10 flex flex-col items-center w-full max-w-3xl">
          <Brand className="mb-10" />

          <p className="text-slate-500 text-sm font-medium mb-8">
            Seleziona la struttura a cui desideri accedere
          </p>

          {error && <ErrorBox message={error} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {availableTenants.map(tenant => (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant.id)}
                disabled={loading}
                className="group gradient-border-wrapper hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                <div className="glass-panel w-full flex flex-col items-center justify-center p-7 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-primary-500 group-hover:to-accent-500 group-hover:text-white transition-all duration-200 text-accent-500">
                    <Hotel className="w-6 h-6" />
                  </div>
                  <span className="text-slate-900 font-bold text-sm text-center leading-snug group-hover:text-accent-600 transition-colors">
                    {tenant.businessName}
                  </span>
                  <div className="flex items-center gap-1 text-accent-600 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Accedi <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cosmic bg-grid flex flex-col items-center justify-center px-4 py-12 select-none overflow-hidden">
      <div className="glow-orb w-[600px] h-[600px] bg-primary-500/12 top-[-120px] left-[-120px] animate-pulse-glow" />
      <div className="glow-orb w-[700px] h-[700px] bg-accent-500/10 bottom-[-150px] right-[-150px] animate-pulse-glow" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <Brand className="mb-8" />

        {/* Card */}
        <div className="gradient-border-wrapper w-full animate-float">
          <div className="glass-panel px-8 py-8">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {isRegister ? 'Crea il tuo account' : 'Accedi'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {isRegister
                  ? '3 mesi di prova gratuita, nessuna carta richiesta.'
                  : 'Bentornato. Inserisci le tue credenziali per continuare.'}
              </p>
            </div>

            {error && <ErrorBox message={error} className="mb-4" />}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="glass-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                  placeholder="nome@esempio.it"
                />
              </Field>

              <Field label="Password" icon={<Lock className="w-4 h-4" />}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="glass-input block w-full pl-10 pr-10 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-accent-500 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </Field>

              {isRegister && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">La tua struttura</p>

                  <Field label="Nome struttura" icon={<Hotel className="w-4 h-4" />}>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      className="glass-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                      placeholder="B&B Bella Vista"
                    />
                  </Field>

                  <Field label="Email contatto" icon={<Mail className="w-4 h-4" />}>
                    <input
                      type="email"
                      required
                      value={businessEmail}
                      onChange={e => setBusinessEmail(e.target.value)}
                      className="glass-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                      placeholder="info@bbbellavista.it"
                    />
                  </Field>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-glow-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm tracking-wide shadow-lg transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <span className="opacity-80">Elaborazione...</span>
                  ) : (
                    <>
                      {isRegister ? 'Attiva prova gratuita' : 'Accedi'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-col items-center gap-2">
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-slate-400 hover:text-accent-600 font-semibold transition-colors cursor-pointer"
                >
                  Hai dimenticato la password?
                </button>
              )}
              <button
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-xs text-slate-400 hover:text-accent-600 font-semibold transition-colors cursor-pointer"
              >
                {isRegister ? 'Hai già un account? Accedi' : 'Prima volta? Crea un account'}
              </button>
            </div>

            {/* Forgot password overlay */}
            {showForgot && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
                <div className="gradient-border-wrapper w-full max-w-sm animate-fade-in">
                  <div className="glass-panel px-8 py-8">
                    {forgotSent ? (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        <h3 className="text-base font-extrabold text-slate-900">Email inviata!</h3>
                        <p className="text-sm text-slate-500">Se l'email è registrata, riceverai un link per reimpostare la password entro pochi minuti.</p>
                        <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}
                          className="text-xs text-accent-600 font-bold hover:underline cursor-pointer">
                          Torna al login
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-5">
                          <KeyRound className="w-5 h-5 text-accent-500" />
                          <h3 className="text-base font-extrabold text-slate-900">Reimposta password</h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">Inserisci la tua email. Ti invieremo un link per reimpostare la password.</p>
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                            <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                              className="glass-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                              placeholder="nome@esempio.it" autoFocus />
                          </Field>
                          <button type="submit" disabled={forgotLoading}
                            className="btn-glow-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm disabled:opacity-60">
                            {forgotLoading ? 'Invio...' : <><ArrowRight className="w-4 h-4" /> Invia Link</>}
                          </button>
                          <button type="button" onClick={() => setShowForgot(false)}
                            className="w-full text-xs text-slate-400 hover:text-slate-600 font-semibold py-1 cursor-pointer">
                            Annulla
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer features */}
        <div className="mt-8 grid grid-cols-3 gap-3 w-full">
          {[
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Multi-tenant sicuro' },
            { icon: <Globe className="w-3.5 h-3.5" />, text: 'Sync iCal live' },
            { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: 'Alloggiati Web' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/50 border border-slate-200/60 text-center">
              <span className="text-accent-500">{icon}</span>
              <span className="text-[10px] font-semibold text-slate-500 leading-tight">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Brand: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-col items-center gap-3 ${className}`}>
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-accent-500 p-[1.5px] shadow-lg shadow-accent-500/15 hover:rotate-6 transition-transform duration-300">
      <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
        <Hotel className="w-8 h-8 text-accent-500" />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">GlancePMS</h1>
      <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-slate-400 mt-1 block">
        Property Management System
      </span>
    </div>
  </div>
);

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-0.5">
      {label}
    </label>
    <div className="relative rounded-xl focus-within:text-accent-500 text-slate-400 transition-colors">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        {icon}
      </div>
      {children}
    </div>
  </div>
);

const ErrorBox: React.FC<{ message: string; className?: string }> = ({ message, className = '' }) => (
  <div className={`bg-red-500/10 border border-red-500/25 text-red-500 p-3 rounded-xl text-xs text-center font-medium ${className}`}>
    {message}
  </div>
);
