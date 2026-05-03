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
    <div className="pb-24 md:pb-0">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 md:rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Saving Goals</h1>
            <p className="text-blue-100 text-sm mt-1">Kelola target tabungan, setor, dan tarik dana dari sini.</p>
          </div>
          <button
            onClick={() => {
              setGoalError('');
              setEditingGoalId(null);
              setGoalForm({ name: '', target_amount: '', current_amount: '0', image_url: '', description: '', target_date: '' });
              setShowGoalForm(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            <Plus size={18} />
            Add Goal
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {goalError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {goalError}
          </div>
        )}

        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const percentage = goal.target_amount > 0
                ? (Number(goal.current_amount || 0) / Number(goal.target_amount || 0)) * 100
                : 0;

              return (
                <div key={goal.id} className="card-lg space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {goal.image_url ? (
                        <img
                          src={goal.image_url}
                          alt={goal.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                          <Target size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{goal.name}</h3>
                        <p className="text-xs text-gray-500">Status: {goal.status}</p>
                        {goal.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{goal.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{percentage.toFixed(0)}%</span>
                  </div>

                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(percentage, 100)}%` }} />
                  </div>

                  <div className="flex justify-between text-sm text-gray-700">
                    <span>{formatCurrency(goal.current_amount, 'IDR')}</span>
                    <span>/ {formatCurrency(goal.target_amount, 'IDR')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openGoalProgressForm(goal, 'deposit')}
                      className="px-3 py-2 text-sm rounded-lg border border-green-200 text-green-700 hover:bg-green-50"
                    >
                      + Tambah Dana
                    </button>
                    <button
                      type="button"
                      onClick={() => openGoalProgressForm(goal, 'withdraw')}
                      className="px-3 py-2 text-sm rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      - Tarik Dana
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleEditGoal(goal)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Edit2 size={14} />
                      Edit Goal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Hapus Goal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-lg text-center py-10 text-gray-500">Belum ada saving goals</div>
        )}
      </div>

      {showGoalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingGoalId ? 'Edit Saving Goal' : 'Create Saving Goal'}</h2>
              <button
                onClick={() => setShowGoalForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Goal Name</label>
                <input
                  type="text"
                  name="name"
                  value={goalForm.name}
                  onChange={handleGoalInputChange}
                  className="input"
                  placeholder="e.g. Emergency Fund"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Target Amount</label>
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
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Current Amount</label>
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Gambar Barang (URL, Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="input"
                  disabled={goalImageUploading}
                />
                {goalImageUploading && (
                  <p className="text-xs text-blue-600">Uploading image...</p>
                )}
                {goalForm.image_url && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={goalForm.image_url}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setGoalForm((prev) => ({ ...prev, image_url: '' }))}
                      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Deskripsi (misal: mau beli di mana)</label>
                <textarea
                  name="description"
                  value={goalForm.description}
                  onChange={handleGoalInputChange}
                  className="input min-h-20 resize-none"
                  placeholder="Contoh: Toko A, marketplace B, atau catatan spesifikasi"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Target Date (Optional)</label>
                <input
                  type="date"
                  name="target_date"
                  value={goalForm.target_date}
                  onChange={handleGoalInputChange}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={goalSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {goalSubmitting ? 'Saving...' : editingGoalId ? 'Update Goal' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoalProgressForm && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {goalProgressMode === 'deposit' ? 'Tambah Dana Goal' : 'Tarik Dana Goal'}
              </h2>
              <button
                onClick={() => setShowGoalProgressForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              <p className="font-semibold text-gray-900">{selectedGoal.name}</p>
              <p>Saat ini: {formatCurrency(selectedGoal.current_amount, 'IDR')}</p>
              <p>Target: {formatCurrency(selectedGoal.target_amount, 'IDR')}</p>
            </div>

            {goalProgressError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {goalProgressError}
              </div>
            )}

            <form onSubmit={handleGoalProgressSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Akun</label>
                <select
                  value={goalProgressAccountId}
                  onChange={(e) => setGoalProgressAccountId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Pilih akun</option>
                  {accounts.map((account) => (
                    <option key={getAccountId(account)} value={String(getAccountId(account))}>
                      {getAccountName(account)} ({formatCurrency(account.balance || 0, 'IDR')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Nominal</label>
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalProgressForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
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
