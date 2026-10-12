import React, { useState, useEffect } from 'react';
import { apiFetch } from './api';
import { X, Landmark, Coins, Tag, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface TenantProfile {
  regione: string | null;
  provincia: string | null;
  comune: string | null;
  categoriaStruttura: string | null;
}

interface TaxConfig {
  importoGiornaliero: number | null;
  etaMinima: number;
  numeroMassimoNotti: number;
}

interface ExemptionCategory {
  id: number;
  tenantId: string | null;
  nome: string;
  isDefault: boolean;
}

const CATEGORIA_OPTIONS = [
  { value: '', label: 'Seleziona...' },
  { value: 'B&B', label: 'B&B' },
  { value: 'AGRITURISMO', label: 'Agriturismo' },
  { value: 'CASA_VACANZE', label: 'Casa Vacanze' },
  { value: 'AFFITTACAMERE', label: 'Affittacamere' },
  { value: 'ALTRO', label: 'Altro' },
];

// regione -> provincia -> comuni[], caricato da public/data/comuni-italia.json
type ComuniTree = Record<string, Record<string, string[]>>;

interface Props {
  onClose: () => void;
}

export const TouristTaxSettingsModal: React.FC<Props> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TenantProfile>({ regione: '', provincia: '', comune: '', categoriaStruttura: '' });
  const [config, setConfig] = useState<TaxConfig>({ importoGiornaliero: null, etaMinima: 14, numeroMassimoNotti: 7 });
  const [categories, setCategories] = useState<ExemptionCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [comuniData, setComuniData] = useState<ComuniTree | null>(null);

  useEffect(() => {
    fetch('/data/comuni-italia.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setComuniData(data); })
      .catch(() => {});
  }, []);

  const regioni = comuniData ? Object.keys(comuniData).sort() : [];
  const province = comuniData && profile.regione && comuniData[profile.regione]
    ? Object.keys(comuniData[profile.regione]).sort()
    : [];
  const comuni = comuniData && profile.regione && profile.provincia && comuniData[profile.regione]?.[profile.provincia]
    ? comuniData[profile.regione][profile.provincia]
    : [];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, configRes, categoriesRes] = await Promise.all([
        apiFetch('/api/tenant/profile'),
        apiFetch('/api/tourist-tax/config'),
        apiFetch('/api/tourist-tax/exemption-categories'),
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile({
          regione: p.regione || '',
          provincia: p.provincia || '',
          comune: p.comune || '',
          categoriaStruttura: p.categoriaStruttura || '',
        });
      }
      if (configRes.ok) {
        const c = await configRes.json();
        setConfig({
          importoGiornaliero: c.importoGiornaliero,
          etaMinima: c.etaMinima ?? 14,
          numeroMassimoNotti: c.numeroMassimoNotti ?? 7,
        });
      }
      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await apiFetch('/api/tenant/profile', { method: 'PUT', body: JSON.stringify(profile) });
      if (!res.ok) throw new Error('Impossibile salvare i dati della struttura');
      Swal.fire({ icon: 'success', title: 'Salvato', text: 'Anagrafica struttura aggiornata', timer: 1500, showConfirmButton: false, background: 'rgba(255,255,255,0.95)' });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Errore', text: err.message, background: 'rgba(255,255,255,0.95)' });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.importoGiornaliero === null || config.importoGiornaliero < 0) {
      Swal.fire({ icon: 'warning', title: 'Importo non valido', background: 'rgba(255,255,255,0.95)' });
      return;
    }
    setSavingConfig(true);
    try {
      const res = await apiFetch('/api/tourist-tax/config', { method: 'PUT', body: JSON.stringify(config) });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Impossibile salvare la configurazione');
      }
      Swal.fire({ icon: 'success', title: 'Salvato', text: 'Configurazione tassa aggiornata', timer: 1500, showConfirmButton: false, background: 'rgba(255,255,255,0.95)' });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Errore', text: err.message, background: 'rgba(255,255,255,0.95)' });
    } finally {
      setSavingConfig(false);
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await apiFetch('/api/tourist-tax/exemption-categories', {
        method: 'POST',
        body: JSON.stringify({ nome: newCategoryName.trim() }),
      });
      if (!res.ok) throw new Error('Impossibile creare la categoria');
      setNewCategoryName('');
      loadAll();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Errore', text: err.message, background: 'rgba(255,255,255,0.95)' });
    }
  };

  const deleteCategory = async (category: ExemptionCategory) => {
    const confirmed = await Swal.fire({
      icon: 'warning',
      title: 'Eliminare la categoria?',
      text: `"${category.nome}" verrà rimossa definitivamente.`,
      showCancelButton: true,
      confirmButtonText: 'Elimina',
      cancelButtonText: 'Annulla',
      customClass: { confirmButton: 'btn-glow-primary px-4 py-2 rounded-xl text-white text-xs font-bold mx-1', cancelButton: 'px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold mx-1' },
      buttonsStyling: false,
      background: 'rgba(255,255,255,0.95)',
    });
    if (!confirmed.isConfirmed) return;

    try {
      const res = await apiFetch(`/api/tourist-tax/exemption-categories/${category.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossibile eliminare la categoria');
      setCategories(categories.filter(c => c.id !== category.id));
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Errore', text: err.message, background: 'rgba(255,255,255,0.95)' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="gradient-border-wrapper w-full max-w-lg animate-fade-in">
        <div className="glass-panel p-6 bg-white/95 max-h-[85vh] overflow-y-auto">

          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-accent-500" /> Tassa di Soggiorno
            </h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 text-center py-8">Caricamento...</p>
          ) : (
            <div className="space-y-6">

              {/* Anagrafica struttura */}
              <form onSubmit={saveProfile} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                <h4 className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" /> Anagrafica Struttura
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={profile.regione ?? ''}
                    onChange={(e) => setProfile({ ...profile, regione: e.target.value, provincia: '', comune: '' })}
                    className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                  >
                    <option value="">{comuniData ? 'Regione...' : 'Caricamento...'}</option>
                    {regioni.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    type="text"
                    list="tt-provincia-list"
                    placeholder="Provincia"
                    disabled={!profile.regione}
                    value={profile.provincia ?? ''}
                    onChange={(e) => setProfile({ ...profile, provincia: e.target.value, comune: '' })}
                    className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none disabled:opacity-50"
                  />
                  <datalist id="tt-provincia-list">
                    {province.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <input
                  type="text"
                  list="tt-comune-list"
                  placeholder="Comune"
                  disabled={!profile.provincia}
                  value={profile.comune ?? ''}
                  onChange={(e) => setProfile({ ...profile, comune: e.target.value })}
                  className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none disabled:opacity-50"
                />
                <datalist id="tt-comune-list">
                  {comuni.map(c => <option key={c} value={c} />)}
                </datalist>
                <select
                  value={profile.categoriaStruttura ?? ''}
                  onChange={(e) => setProfile({ ...profile, categoriaStruttura: e.target.value })}
                  className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                >
                  {CATEGORIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? 'Salvataggio...' : 'Salva Anagrafica'}
                </button>
              </form>

              {/* Configurazione tassa */}
              <form onSubmit={saveConfig} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                <h4 className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> Configurazione
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Importo/notte (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={config.importoGiornaliero ?? ''}
                      onChange={(e) => setConfig({ ...config, importoGiornaliero: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Età minima</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={config.etaMinima}
                      onChange={(e) => setConfig({ ...config, etaMinima: parseInt(e.target.value, 10) || 0 })}
                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max notti</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={config.numeroMassimoNotti}
                      onChange={(e) => setConfig({ ...config, numeroMassimoNotti: parseInt(e.target.value, 10) || 1 })}
                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingConfig ? 'Salvataggio...' : 'Salva Configurazione'}
                </button>
              </form>

              {/* Categorie di esenzione */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                <h4 className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag className="w-4 h-4" /> Categorie di Esenzione
                </h4>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/60 text-xs">
                      <span className="font-semibold text-slate-800">{cat.nome}</span>
                      {cat.isDefault ? (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100">Standard</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => deleteCategory(cat)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={addCategory} className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nuova categoria..."
                    className="glass-input flex-1 px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl text-white font-bold bg-accent-500 hover:bg-accent-600 transition-all flex items-center justify-center cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
