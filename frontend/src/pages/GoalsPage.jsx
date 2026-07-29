import React, { useState } from 'react';
import { Plus, X, Target, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useData } from '../hooks/useData';
import { goalAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function GoalsPage() {
  const {
    goals,
    setGoals,
    accounts,
    setAccounts,
    setTransactions,
    loading,
  } = useData();

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showGoalProgressForm, setShowGoalProgressForm] = useState(false);
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [goalImageUploading, setGoalImageUploading] = useState(false);
  const [goalProgressSubmitting, setGoalProgressSubmitting] = useState(false);
  const [goalError, setGoalError] = useState('');
  const [goalProgressError, setGoalProgressError] = useState('');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalProgressMode, setGoalProgressMode] = useState('deposit');
  const [goalProgressAmount, setGoalProgressAmount] = useState('');
  const [goalProgressAccountId, setGoalProgressAccountId] = useState('');
  const [goalForm, setGoalForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '0',
    image_url: '',
    description: '',
    target_date: '',
  });

  const getAccountId = (account) => account?.id ?? account?.account_id;
  const getAccountName = (account) => account?.name ?? account?.account_name;

  const handleGoalInputChange = (e) => {
    const { name, value } = e.target;
    setGoalForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setGoalError('File harus berupa gambar');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setGoalError('Ukuran gambar maksimal 2MB');
      return;
    }

    try {
      setGoalImageUploading(true);
      const response = await goalAPI.uploadImage(file);
      const uploadedUrl = response?.data?.image_url || response?.image_url || '';

      if (!uploadedUrl) {
        throw new Error('Gagal mendapatkan URL gambar dari server');
      }

      setGoalForm((prev) => ({ ...prev, image_url: String(uploadedUrl) }));
      setGoalError('');
    } catch (_) {
      setGoalError('Gagal memproses gambar');
    } finally {
      setGoalImageUploading(false);
    }
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    setGoalError('');
    setGoalSubmitting(true);

    try {
      const payload = {
        name: goalForm.name.trim(),
        target_amount: Number(goalForm.target_amount),
        current_amount: Number(goalForm.current_amount || 0),
        image_url: goalForm.image_url?.trim() || null,
        description: goalForm.description?.trim() || null,
        target_date: goalForm.target_date || null,
      };

      if (!payload.name) {
        throw new Error('Goal name is required');
      }
      if (!payload.target_amount || payload.target_amount <= 0) {
        throw new Error('Target amount must be greater than 0');
      }

      if (editingGoalId) {
        const response = await goalAPI.update(editingGoalId, payload);
        setGoals((prev) => prev.map((goal) => (goal.id === editingGoalId ? response.data : goal)));
      } else {
        const response = await goalAPI.create(payload);
        setGoals((prev) => [response.data, ...prev]);
      }

      setShowGoalForm(false);
      setEditingGoalId(null);
      setGoalForm({ name: '', target_amount: '', current_amount: '0', image_url: '', description: '', target_date: '' });
    } catch (err) {
      setGoalError(err?.message || 'Failed to save goal');
    } finally {
      setGoalSubmitting(false);
    }
  };

  const handleEditGoal = (goal) => {
    setGoalError('');
    setEditingGoalId(goal.id);
    setGoalForm({
      name: goal.name || '',
      target_amount: String(goal.target_amount || ''),
      current_amount: String(goal.current_amount || 0),
      image_url: goal.image_url || '',
      description: goal.description || '',
      target_date: goal.target_date ? String(goal.target_date).slice(0, 10) : '',
    });
    setShowGoalForm(true);
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Hapus goal ini?')) return;

    try {
      await goalAPI.delete(goalId);
      setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
    } catch (err) {
      setGoalError(err?.message || 'Gagal menghapus goal');
    }
  };

  const openGoalProgressForm = (goal, mode) => {
    const defaultAccountId = goal.account_id || accounts[0]?.id || accounts[0]?.account_id || '';
    setSelectedGoal(goal);
    setGoalProgressMode(mode);
    setGoalProgressAmount('');
    setGoalProgressAccountId(defaultAccountId ? String(defaultAccountId) : '');
    setGoalProgressError('');
    setShowGoalProgressForm(true);
  };

  const handleGoalProgressSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGoal) return;

    setGoalProgressError('');
    setGoalProgressSubmitting(true);

    try {
      const amount = Number(goalProgressAmount);
      if (!amount || amount <= 0) {
        throw new Error('Nominal harus lebih dari 0');
      }
      if (!goalProgressAccountId) {
        throw new Error('Pilih akun terlebih dulu');
      }

      const current = Number(selectedGoal.current_amount || 0);
      const target = Number(selectedGoal.target_amount || 0);

      if (goalProgressMode === 'withdraw' && amount > current) {
        throw new Error('Nominal tarik tidak boleh melebihi dana goal saat ini');
      }

      let nextAmount = current;
      if (goalProgressMode === 'deposit') {
        nextAmount = current + amount;
      } else {
        nextAmount = Math.max(current - amount, 0);
      }

      const response = await goalAPI.updateProgress(selectedGoal.id, {
        current_amount: nextAmount,
        account_id: Number(goalProgressAccountId),
        movement_amount: amount,
        movement_type: goalProgressMode,
        movement_date: new Date().toISOString().split('T')[0],
      });
      const updatedGoal = response.data;

      setGoals((prev) => prev.map((goal) => (goal.id === selectedGoal.id ? updatedGoal : goal)));

      if (response.account) {
        setAccounts((prev) => prev.map((acc) => {
          const id = Number(getAccountId(acc));
          if (id !== Number(response.account.id)) return acc;
          return {
            ...acc,
            balance: Number(response.account.balance || 0),
          };
        }));
      }

      if (response.transaction) {
        setTransactions((prev) => [response.transaction, ...prev]);
      }

      setShowGoalProgressForm(false);
      setSelectedGoal(null);
      setGoalProgressAmount('');
      setGoalProgressAccountId('');

      if (nextAmount >= target && target > 0) {
        setGoalError('Goal ini sudah mencapai target. Mantap!');
      }
    } catch (err) {
      setGoalProgressError(err?.message || 'Gagal update progres goal');
    } finally {
      setGoalProgressSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Target Tabungan (Goals)</h1>
          <p className="text-slate-500 font-medium mt-1">Kelola target menabung Anda, setor dana, dan pantau progres pencapaian.</p>
        </div>
        <button
          onClick={() => {
            setGoalError('');
            setEditingGoalId(null);
            setGoalForm({ name: '', target_amount: '', current_amount: '0', image_url: '', description: '', target_date: '' });
            setShowGoalForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-bold shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 hover:from-primary-700 hover:to-primary-600 transition-all duration-300 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Tambah Target</span>
        </button>
      </div>

      {goalError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-slide-up">
          {goalError}
        </div>
      )}

      {/* Grid view of Goals */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const percentage = goal.target_amount > 0
              ? (Number(goal.current_amount || 0) / Number(goal.target_amount || 0)) * 100
              : 0;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 flex flex-col justify-between hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {goal.image_url ? (
                        <img
                          src={goal.image_url}
                          alt={goal.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                          <Target size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-primary-600 transition-colors duration-200">
                          {goal.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block text-[9px] font-extrabold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100/50 uppercase tracking-wider">
                            {goal.status}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-slate-400 font-semibold mt-1.5 line-clamp-1">{goal.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-xl border border-indigo-100/50 shadow-sm shadow-indigo-500/5">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 pt-2">
                    <div className="h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                      <span>Terkumpul: {formatCurrency(goal.current_amount, 'IDR')}</span>
                      <span>Target: {formatCurrency(goal.target_amount, 'IDR')}</span>
                    </div>
                  </div>

                  {/* Period target date */}
                  {goal.target_date && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Target Tercapai: {goal.target_date}
                    </p>
                  )}

                  {/* Financial operations buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openGoalProgressForm(goal, 'deposit')}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
                    >
                      + Tambah Dana
                    </button>
                    <button
                      type="button"
                      onClick={() => openGoalProgressForm(goal, 'withdraw')}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all duration-200"
                    >
                      - Tarik Dana
                    </button>
                  </div>

                  {/* Management buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleEditGoal(goal)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-200"
                    >
                      <Edit2 size={13} />
                      Edit Target
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50/50 transition-all duration-200"
                    >
                      <Trash2 size={13} />
                      Hapus Target
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Target size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Belum ada Target Tabungan</h3>
          <p className="text-slate-500 text-sm mb-6">Mulai rencanakan pembelian impian Anda, dana darurat, atau investasi masa depan.</p>
          <button
            onClick={() => {
              setGoalError('');
              setEditingGoalId(null);
              setGoalForm({ name: '', target_amount: '', current_amount: '0', image_url: '', description: '', target_date: '' });
              setShowGoalForm(true);
            }}
            className="btn-primary mx-auto"
          >
            <Plus size={18} />
            <span>Tambah Target</span>
          </button>
        </div>
      )}

      {/* Main Goal Form Popup */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {editingGoalId ? 'Edit Target Tabungan' : 'Tambah Target Tabungan'}
              </h2>
              <button
                onClick={() => setShowGoalForm(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nama Target</label>
                <input
                  type="text"
                  name="name"
                  value={goalForm.name}
                  onChange={handleGoalInputChange}
                  className="input"
                  placeholder="Contoh: Beli Laptop Baru, Dana Darurat"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Target Nominal (IDR)</label>
                  <input
                    type="number"
                    name="target_amount"
                    min="1"
                    step="0.01"
                    value={goalForm.target_amount}
                    onChange={handleGoalInputChange}
                    className="input"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nominal Awal</label>
                  <input
                    type="number"
                    name="current_amount"
                    min="0"
                    step="0.01"
                    value={goalForm.current_amount}
                    onChange={handleGoalInputChange}
                    className="input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Gambar Target (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="input border-dashed bg-slate-50 cursor-pointer text-xs"
                  disabled={goalImageUploading}
                />
                {goalImageUploading && (
                  <p className="text-xs text-primary-600 font-bold animate-pulse mt-1">Mengunggah gambar...</p>
                )}
                {goalForm.image_url && (
                  <div className="mt-2.5 flex items-center gap-3 bg-slate-50 p-2 border border-slate-100 rounded-xl">
                    <img
                      src={goalForm.image_url}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setGoalForm((prev) => ({ ...prev, image_url: '' }))}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors font-bold"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Deskripsi</label>
                <textarea
                  name="description"
                  value={goalForm.description}
                  onChange={handleGoalInputChange}
                  className="input min-h-20 resize-none"
                  placeholder="Contoh: Spesifikasi barang, merk, atau link toko pembelian"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Target Tanggal (Optional)</label>
                <input
                  type="date"
                  name="target_date"
                  value={goalForm.target_date}
                  onChange={handleGoalInputChange}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={goalSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {goalSubmitting ? 'Menyimpan...' : editingGoalId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Adjustment (Deposit/Withdraw) Form Popup */}
      {showGoalProgressForm && selectedGoal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {goalProgressMode === 'deposit' ? 'Tambah Dana Target' : 'Tarik Dana Target'}
              </h2>
              <button
                onClick={() => setShowGoalProgressForm(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5 text-slate-600">
              <p className="font-bold text-slate-900 text-sm mb-1">{selectedGoal.name}</p>
              <p>Saldo Dana Saat Ini: <span className="font-bold text-slate-900">{formatCurrency(selectedGoal.current_amount, 'IDR')}</span></p>
              <p>Target Tabungan: <span className="font-bold text-indigo-600">{formatCurrency(selectedGoal.target_amount, 'IDR')}</span></p>
            </div>

            {goalProgressError && (
              <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold">
                {goalProgressError}
              </div>
            )}

            <form onSubmit={handleGoalProgressSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Sumber / Rekening Tujuan</label>
                <select
                  value={goalProgressAccountId}
                  onChange={(e) => setGoalProgressAccountId(e.target.value)}
                  className="input appearance-none bg-no-repeat"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1rem'
                  }}
                  required
                >
                  <option value="">Pilih rekening</option>
                  {accounts.map((account) => (
                    <option key={getAccountId(account)} value={String(getAccountId(account))}>
                      {getAccountName(account)} ({formatCurrency(account.balance || 0, 'IDR')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nominal (IDR)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={goalProgressAmount}
                  onChange={(e) => setGoalProgressAmount(e.target.value)}
                  className="input"
                  placeholder="Contoh: 500000"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowGoalProgressForm(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={goalProgressSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {goalProgressSubmitting ? 'Menyimpan...' : goalProgressMode === 'deposit' ? 'Tambah Dana' : 'Tarik Dana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
