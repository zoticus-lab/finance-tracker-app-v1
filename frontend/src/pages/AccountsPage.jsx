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
    <div className="pb-24 md:pb-0">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 md:rounded-b-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Accounts</h1>
          <button
            onClick={handleAddClick}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {accounts.length > 0 ? (
          accounts.map((account) => (
            <div
              key={account.id}
              className="card-lg flex items-center justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{account.account_type}</p>
                <p className="text-xs text-gray-400 mt-1">{account.currency}</p>
              </div>
              <div className="text-right mr-4">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(account)}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="card-lg text-center py-12">
            <p className="text-gray-500 mb-4">No accounts yet</p>
            <button onClick={handleAddClick} className="btn-primary">
              <Plus size={18} className="inline mr-2" />
              Create Account
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Account' : 'Create Account'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Account Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g. BCA Utama"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="savings">Savings</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="investment">Investment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Currency</label>
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Initial Balance</label>
                <input
                  type="number"
                  name="balance"
                  min="0"
                  step="0.01"
                  value={formData.balance}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
