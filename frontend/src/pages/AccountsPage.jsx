import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useData } from '../hooks/useData';
import { formatCurrency } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import { accountAPI } from '../services/api';

export default function AccountsPage() {
  const { accounts, setAccounts, loading, setLoading } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'bank',
    balance: 0,
    currency: 'IDR',
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const response = await accountAPI.list();
        setAccounts(response.data || []);
      } catch (err) {
        setError(err?.message || 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [setAccounts, setLoading]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      account_type: 'bank',
      balance: 0,
      currency: 'IDR',
    });
  };

  const handleAddClick = () => {
    resetForm();
    setError('');
    setShowForm(true);
  };

  const handleEditClick = (account) => {
    setEditingId(account.id);
    setError('');
    setFormData({
      name: account.name,
      account_type: account.account_type,
      balance: account.balance,
      currency: account.currency,
    });
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'balance' ? value : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        account_type: formData.account_type,
        balance: Number(formData.balance) || 0,
        currency: (formData.currency || 'IDR').toUpperCase(),
      };

      if (!payload.name) {
        throw new Error('Account name is required');
      }

      if (editingId) {
        const response = await accountAPI.update(editingId, payload);
        const updated = response.data;
        setAccounts((prev) => prev.map((acc) => (acc.id === editingId ? updated : acc)));
      } else {
        const response = await accountAPI.create(payload);
        const created = response.data;
        setAccounts((prev) => [created, ...prev]);
      }

      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountAPI.delete(id);
        setAccounts((prev) => prev.filter((acc) => acc.id !== id));
      } catch (err) {
        setError(err?.message || 'Failed to delete account');
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Daftar Rekening</h1>
          <p className="text-slate-500 font-medium mt-1">Kelola dan pantau semua rekening tabungan serta uang tunai Anda.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-bold shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 hover:from-primary-700 hover:to-primary-600 transition-all duration-300 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Tambah Rekening</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-slide-up">
          {error}
        </div>
      )}

      {/* Grid view of Accounts */}
      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 flex flex-col justify-between min-h-[190px] relative overflow-hidden group hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300"
            >
              {/* Blur accent */}
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary-500/5 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
              
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors duration-200">{account.name}</h3>
                    <span className="inline-block text-[10px] font-extrabold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100/50 uppercase tracking-wider mt-1.5">
                      {account.account_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {/* Action buttons (always visible but clean) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(account)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
                      title="Edit rekening"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-xl transition-all duration-200"
                      title="Hapus rekening"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-2xl font-extrabold text-slate-950 tracking-tight">
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-extrabold tracking-widest mt-1 uppercase">
                    Mata Uang: {account.currency}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Wallet size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Belum ada Rekening</h3>
          <p className="text-slate-500 text-sm mb-6">Tambahkan rekening baru seperti bank, dompet fisik, atau kartu kredit untuk mulai mencatat transaksi.</p>
          <button onClick={handleAddClick} className="btn-primary mx-auto">
            <Plus size={18} />
            <span>Tambah Rekening</span>
          </button>
        </div>
      )}

      {/* Slide-in/Popup Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {editingId ? 'Edit Rekening' : 'Tambah Rekening'}
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nama Rekening</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Contoh: BCA Utama, Gopay, Dompet Fisik"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Jenis Rekening</label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleInputChange}
                    className="input appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Tunai (Cash)</option>
                    <option value="savings">Tabungan</option>
                    <option value="credit_card">Kartu Kredit</option>
                    <option value="investment">Investasi</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mata Uang</label>
                  <input
                    type="text"
                    name="currency"
                    maxLength={3}
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="input uppercase"
                    placeholder="IDR"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Saldo Awal</label>
                <input
                  type="number"
                  name="balance"
                  min="0"
                  step="0.01"
                  value={formData.balance}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="0"
                />
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
