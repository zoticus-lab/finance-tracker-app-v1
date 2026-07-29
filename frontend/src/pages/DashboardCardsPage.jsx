import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { dashboardCardAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CARD_TYPES = [
  'balance_trend',
  'cash_flow',
  'expenses_structure',
  'budget_overview',
  'goal_progress',
  'last_records',
  'account_summary',
  'net_worth',
];

export default function DashboardCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    card_type: 'balance_trend',
    card_title: '',
    card_size: 'medium',
  });

  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await dashboardCardAPI.list();
      setCards(response.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        card_type: formData.card_type,
        card_title: formData.card_title || null,
        card_size: formData.card_size,
        card_position: cards.length,
        is_enabled: true,
      };
      await dashboardCardAPI.create(payload);
      setFormData({ card_type: 'balance_trend', card_title: '', card_size: 'medium' });
      await fetchCards();
    } catch (err) {
      setError(err?.message || 'Failed to create card');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEnabled = async (card) => {
    try {
      await dashboardCardAPI.update(card.card_config_id, { is_enabled: !card.is_enabled });
      await fetchCards();
    } catch (err) {
      setError(err?.message || 'Failed to update card status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dashboard card?')) return;

    try {
      await dashboardCardAPI.delete(id);
      await fetchCards();
    } catch (err) {
      setError(err?.message || 'Failed to delete card');
    }
  };

  const moveCard = async (index, direction) => {
    const newCards = [...cards];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCards.length) return;

    [newCards[index], newCards[targetIndex]] = [newCards[targetIndex], newCards[index]];

    const items = newCards.map((card, idx) => ({
      id: card.card_config_id,
      position: idx,
    }));

    try {
      await dashboardCardAPI.reorder({ items });
      setCards(newCards.map((c, idx) => ({ ...c, card_position: idx })));
    } catch (err) {
      setError(err?.message || 'Failed to reorder cards');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header section */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kustomisasi Dashboard (Cards)</h1>
        <p className="text-slate-500 font-medium mt-1">Atur widget, grafik, dan panel ringkasan informasi yang ingin Anda tampilkan di Dashboard.</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-slide-up">
            {error}
          </div>
        )}

        {/* Add Card Form */}
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tambah Widget Baru</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Pilih tipe informasi, ukuran panel, dan beri judul kustom.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tipe Widget</label>
              <select
                value={formData.card_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, card_type: e.target.value }))}
                className="input appearance-none bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1rem'
                }}
              >
                {CARD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Judul Widget (Optional)</label>
              <input
                type="text"
                value={formData.card_title}
                onChange={(e) => setFormData((prev) => ({ ...prev, card_title: e.target.value }))}
                className="input"
                placeholder="Contoh: Arus Kas Bulanan"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ukuran Widget</label>
              <select
                value={formData.card_size}
                onChange={(e) => setFormData((prev) => ({ ...prev, card_size: e.target.value }))}
                className="input appearance-none bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1rem'
                }}
              >
                <option value="small">Kecil (Small)</option>
                <option value="medium">Sedang (Medium)</option>
                <option value="large">Lebar (Large)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-bold shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 hover:from-primary-700 hover:to-primary-600 transition-all duration-300 active:scale-95 disabled:opacity-50"
          >
            <Plus size={18} />
            <span>{submitting ? 'Menambahkan...' : 'Tambah Widget'}</span>
          </button>
        </form>

        {/* Widgets configuration list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Widget Aktif ({cards.length})</h2>
            <p className="text-xs text-slate-400 font-semibold">Gunakan tombol arah untuk menyusun posisi widget di Dashboard.</p>
          </div>

          {cards.length > 0 ? (
            <div className="space-y-3">
              {cards
                .slice()
                .sort((a, b) => a.card_position - b.card_position)
                .map((card, index) => (
                  <div
                    key={card.card_config_id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-premium p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-premium-hover transition-all duration-300"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-base">
                        {card.card_title || card.card_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-slate-400 font-semibold">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200/50">
                          Tipe: {card.card_type}
                        </span>
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                          Ukuran: {card.card_size}
                        </span>
                        <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200/30">
                          Urutan: {card.card_position + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5">
                      <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => moveCard(index, 'up')}
                          disabled={index === 0}
                          className="p-2 text-slate-500 hover:text-primary-600 hover:bg-white disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent rounded-lg transition-all"
                          title="Pindahkan ke atas"
                        >
                          <ChevronUp size={18} />
                        </button>
                        <div className="w-px h-4 bg-slate-200" />
                        <button
                          type="button"
                          onClick={() => moveCard(index, 'down')}
                          disabled={index === cards.length - 1}
                          className="p-2 text-slate-500 hover:text-primary-600 hover:bg-white disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent rounded-lg transition-all"
                          title="Pindahkan ke bawah"
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleEnabled(card)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                          card.is_enabled
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50'
                            : 'bg-slate-50 text-slate-500 border-slate-200/50 hover:bg-slate-100/50'
                        }`}
                      >
                        {card.is_enabled ? 'Aktif' : 'Non-aktif'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(card.card_config_id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-rose-500/5"
                        title="Hapus Widget"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center max-w-md mx-auto">
              <p className="text-slate-500 text-sm">Belum ada widget dashboard yang dikonfigurasi. Tambahkan widget di atas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
