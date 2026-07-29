import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useData } from '../hooks/useData';
import { formatCurrency } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import { budgetAPI, categoryAPI } from '../services/api';

export default function BudgetsPage() {
  const { budgets, setBudgets, categories, setCategories, loading, setLoading } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    limit_amount: '',
    period_type: 'monthly',
    period_start: '',
    period_end: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [budgetRes, categoryRes] = await Promise.all([
          budgetAPI.list(),
          categoryAPI.byType('expense'),
        ]);
        setBudgets(budgetRes.data || []);
        setCategories(categoryRes.data || []);
      } catch (err) {
        setError(err?.message || 'Failed to load budget data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setBudgets, setCategories, setLoading]);

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      limit_amount: '',
      period_type: 'monthly',
      period_start: '',
      period_end: '',
    });
    setEditingId(null);
  };

  const handleAddClick = () => {
    resetForm();
    setError('');
    setShowForm(true);
  };

  const handleEditClick = (budget) => {
    setEditingId(budget.id);
    setError('');
    setFormData({
      name: budget.name || '',
      category_id: budget.category_id || '',
      limit_amount: budget.limit_amount || '',
      period_type: budget.period_type || 'monthly',
      period_start: budget.period_start || '',
      period_end: budget.period_end || '',
    });
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name || null,
        category_id: formData.category_id || null,
        limit_amount: Number(formData.limit_amount),
        period_type: formData.period_type,
        period_start: formData.period_start,
        period_end: formData.period_end,
      };

      if (!payload.limit_amount || payload.limit_amount <= 0) {
        throw new Error('Budget limit must be greater than 0');
      }
      if (!payload.period_start || !payload.period_end) {
        throw new Error('Please fill period start and end dates');
      }

      if (editingId) {
        await budgetAPI.update(editingId, payload);
        const updatedList = budgets.map((b) => (b.id === editingId ? { ...b, ...payload } : b));
        setBudgets(updatedList);
      } else {
        const response = await budgetAPI.create(payload);
        setBudgets((prev) => [response.data, ...prev]);
      }

      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Failed to save budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await budgetAPI.delete(id);
        setBudgets((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        setError(err?.message || 'Failed to delete budget');
      }
    }
  };

  const getStatusColor = (spent, limit) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return { bg: 'bg-red-500', text: 'text-red-600' };
    if (percentage >= 80) return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
    return { bg: 'bg-green-500', text: 'text-green-600' };
  };

  const getStatusLabel = (spent, limit) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return 'Overspent';
    if (percentage >= 80) return 'Warning';
    return 'On Track';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Daftar Anggaran</h1>
          <p className="text-slate-500 font-medium mt-1">Kelola dan pantau batas pengeluaran untuk setiap kategori pengeluaran Anda.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-bold shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 hover:from-primary-700 hover:to-primary-600 transition-all duration-300 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Tambah Anggaran</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-slide-up">
          {error}
        </div>
      )}

      {/* Grid view of Budgets */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const percentage = (budget.spent_amount / budget.limit_amount) * 100;
            const isExceeded = percentage >= 100;
            const isWarning = percentage >= 80 && percentage < 100;
            const statusLabel = isExceeded ? 'Melebihi Batas' : isWarning ? 'Peringatan' : 'Aman';

            return (
              <div
                key={budget.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 flex flex-col justify-between hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors duration-200">
                        {budget.category?.name}
                      </h3>
                      <span
                        className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded border mt-1.5 uppercase tracking-wider ${
                          isExceeded
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : isWarning
                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(budget)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
                        title="Edit anggaran"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-xl transition-all duration-200"
                        title="Hapus anggaran"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2.5 pt-2">
                    <div className="h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExceeded
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                            : isWarning
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-bold">
                      <span>{percentage.toFixed(0)}% Terpakai</span>
                      <span>{percentage >= 100 ? 'Over' : `${(100 - percentage).toFixed(0)}% Sisa`}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 font-semibold border-t border-slate-100 pt-3 mt-1">
                    <span>Terpakai: {formatCurrency(budget.spent_amount, 'IDR')}</span>
                    <span>Batas: {formatCurrency(budget.limit_amount, 'IDR')}</span>
                  </div>
                </div>

                {/* Period Info */}
                <div className="mt-4 pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Periode: {budget.period_start} s/d {budget.period_end}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <TrendingUp size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Belum ada Anggaran</h3>
          <p className="text-slate-500 text-sm mb-6">Tambahkan batas pengeluaran bulanan untuk kategori pengeluaran Anda agar keuangan Anda lebih terkendali.</p>
          <button onClick={handleAddClick} className="btn-primary mx-auto">
            <Plus size={18} />
            <span>Tambah Anggaran</span>
          </button>
        </div>
      )}

      {/* Popup Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {editingId ? 'Edit Anggaran' : 'Tambah Anggaran'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nama Anggaran</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Contoh: Bulanan Makanan, Hiburan, Belanja"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Kategori</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="input appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="">Tanpa Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Periode</label>
                  <select
                    name="period_type"
                    value={formData.period_type}
                    onChange={handleInputChange}
                    className="input appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Batas Anggaran (IDR)</label>
                <input
                  type="number"
                  name="limit_amount"
                  min="1"
                  step="0.01"
                  value={formData.limit_amount}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Mulai</label>
                  <input
                    type="date"
                    name="period_start"
                    value={formData.period_start}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Selesai</label>
                  <input
                    type="date"
                    name="period_end"
                    value={formData.period_end}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
