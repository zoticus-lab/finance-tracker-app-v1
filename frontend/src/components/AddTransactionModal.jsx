import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import Numpad from './Numpad';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { accountAPI, categoryAPI } from '../services/api';

export default function AddTransactionModal({ isOpen, onClose, onSuccess }) {
  const { accounts, setAccounts, categories, setCategories, addTransaction } = useData();
  const { user } = useAuth();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('0');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedToAccount, setSelectedToAccount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAccountId = (account) => account?.id ?? account?.account_id;
  const getAccountName = (account) => account?.name ?? account?.account_name;
  const getCategoryId = (category) => category?.id ?? category?.category_id;
  const getCategoryName = (category) => category?.name ?? category?.category_name;
  const getCategoryType = (category) => category?.type ?? category?.category_type;

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(String(getAccountId(accounts[0])));
    }
  }, [accounts, selectedAccount]);

  useEffect(() => {
    if (!isOpen) return;

    const loadSupportingData = async () => {
      try {
        const [accountRes, categoryRes] = await Promise.all([
          accountAPI.list(),
          categoryAPI.list(),
        ]);

        setAccounts(accountRes.data || []);
        setCategories(categoryRes.data || []);
      } catch (err) {
        setError(err?.message || 'Failed to load accounts/categories');
      }
    };

    loadSupportingData();
  }, [isOpen, setAccounts, setCategories]);

  const transactionTypes = [
    { id: 'income', label: 'Income', icon: ArrowDownLeft },
    { id: 'expense', label: 'Expense', icon: ArrowUpRight },
    { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  ];

  const getFilteredCategories = () => {
    if (type === 'transfer') return [];
    return categories.filter((cat) => getCategoryType(cat) === type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      if (!selectedAccount) {
        throw new Error('Please select an account');
      }
      if (type !== 'transfer' && !selectedCategory) {
        throw new Error('Please select a category');
      }
      if (type === 'transfer' && !selectedToAccount) {
        throw new Error('Please select a destination account');
      }

      await addTransaction({
        type,
        amount: parseFloat(amount),
        account_id: Number(selectedAccount),
        category_id: type !== 'transfer' ? Number(selectedCategory) : null,
        to_account_id: type === 'transfer' ? Number(selectedToAccount) : null,
        date,
        note: note || null,
      });

      onSuccess?.();
      onClose();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setType('expense');
    setAmount('0');
    setNote('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
      <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Add Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <div className="grid grid-cols-3 gap-3">
              {transactionTypes.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setType(t.id);
                      setSelectedCategory('');
                      setSelectedToAccount('');
                    }}
                    className={`p-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                      type === t.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="hidden sm:inline text-sm">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Display & Numpad */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <div className="text-4xl font-bold text-blue-600 text-center py-4 bg-gray-50 rounded-lg">
              {parseFloat(amount).toFixed(2)}
            </div>
            <Numpad value={amount} onChange={setAmount} />
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">From Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="input"
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={getAccountId(account)} value={String(getAccountId(account))}>
                  {getAccountName(account)} (Rp {parseFloat(account.balance || 0).toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          {/* Category Selection (for income/expense) */}
          {type !== 'transfer' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input"
              >
                <option value="">Select category</option>
                {getFilteredCategories().map((category) => (
                  <option key={getCategoryId(category)} value={String(getCategoryId(category))}>
                    {getCategoryName(category)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* To Account Selection (for transfers) */}
          {type === 'transfer' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">To Account</label>
              <select
                value={selectedToAccount}
                onChange={(e) => setSelectedToAccount(e.target.value)}
                className="input"
              >
                <option value="">Select account</option>
                {accounts
                  .filter((acc) => String(getAccountId(acc)) !== String(selectedAccount))
                  .map((account) => (
                    <option key={getAccountId(account)} value={String(getAccountId(account))}>
                      {getAccountName(account)}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Note (Optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              className="input min-h-20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
