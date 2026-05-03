import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Filter, Edit2, Trash2, X } from 'lucide-react';
import { useData } from '../hooks/useData';
import { formatCurrency, formatDate, getTransactionTypeColor } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import { transactionAPI, accountAPI, categoryAPI } from '../services/api';

export default function TransactionPage() {
  const {
    transactions,
    setTransactions,
    categories,
    setCategories,
    accounts,
    setAccounts,
  } = useData();
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: '',
    account_id: '',
    category_id: '',
    date: '',
    note: '',
    description: '',
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [trxRes, accRes, catRes] = await Promise.all([
          transactionAPI.list(),
          accountAPI.list(),
          categoryAPI.list(),
        ]);

        setTransactions(trxRes.data || []);
        setAccounts(accRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) {
        setError(err?.message || 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [setTransactions, setAccounts, setCategories]);

  const getCategoryId = (cat) => cat?.id ?? cat?.category_id;
  const getCategoryName = (cat) => cat?.name ?? cat?.category_name;
  const getCategoryType = (cat) => cat?.type ?? cat?.category_type;
  const getAccountId = (acc) => acc?.id ?? acc?.account_id;
  const getAccountName = (acc) => acc?.name ?? acc?.account_name;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && String(t.category_id ?? '') !== String(filterCategory)) return false;
      if (filterAccount !== 'all' && String(t.account_id ?? '') !== String(filterAccount)) return false;
      return true;
    });
  }, [transactions, filterType, filterCategory, filterAccount]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;

    try {
      await transactionAPI.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err?.message || 'Failed to delete transaction');
    }
  };

  const openEdit = (transaction) => {
    setEditing(transaction);
    setEditForm({
      amount: String(transaction.amount ?? ''),
      account_id: String(transaction.account_id ?? ''),
      category_id: String(transaction.category_id ?? ''),
      date: transaction.date || new Date().toISOString().split('T')[0],
      note: transaction.note || '',
      description: transaction.description || '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;

    setSavingEdit(true);
    try {
      const payload = {
        amount: Number(editForm.amount),
        account_id: Number(editForm.account_id),
        category_id: editing.type === 'transfer' ? null : (editForm.category_id ? Number(editForm.category_id) : null),
        date: editForm.date,
        description: editForm.description || null,
        note: editForm.note || null,
      };

      const res = await transactionAPI.update(editing.id, payload);
      setTransactions((prev) => prev.map((t) => (t.id === editing.id ? res.data : t)));
      setEditing(null);
    } catch (err) {
      setError(err?.message || 'Failed to update transaction');
    } finally {
      setSavingEdit(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'income':
        return <ArrowDownLeft size={20} className="text-green-500" />;
      case 'expense':
        return <ArrowUpRight size={20} className="text-red-500" />;
      case 'transfer':
        return <ArrowRightLeft size={20} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getTransactionTitle = (transaction) => {
    if (transaction.category?.name) return transaction.category.name;
    if (transaction.description) return transaction.description;

    const note = (transaction.note || '').toLowerCase();
    if (note.includes('credit payment')) return 'Pembayaran Piutang';
    if (note.includes('credit')) return 'Piutang';
    if (note.includes('debt payment')) return 'Pembayaran Hutang';
    if (note.includes('debt')) return 'Hutang';

    if (transaction.type === 'transfer') return 'Transfer';
    return transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
  };

  const getReadableNote = (transaction) => {
    const raw = transaction.note || '';
    const note = raw.toLowerCase();

    if (!raw) return '';
    if (note.startsWith('auto-created from credit #')) {
      const id = raw.split('#')[1] || '';
      return `Referensi Piutang #${id}`;
    }
    if (note.startsWith('auto-created from debt #')) {
      const id = raw.split('#')[1] || '';
      return `Referensi Hutang #${id}`;
    }
    if (note.startsWith('auto-created from credit payment #')) {
      const id = raw.split('#')[1] || '';
      return `Referensi Pembayaran Piutang #${id}`;
    }
    if (note.startsWith('auto-created from debt payment #')) {
      const id = raw.split('#')[1] || '';
      return `Referensi Pembayaran Hutang #${id}`;
    }

    return raw;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-24 md:pb-0">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 md:rounded-b-2xl">
        <h1 className="text-2xl font-bold">Transactions</h1>
      </div>

      {error && (
        <div className="mx-4 md:mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input text-sm"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={getCategoryId(cat)} value={String(getCategoryId(cat))}>
                {getCategoryName(cat)}
              </option>
            ))}
          </select>

          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="input text-sm"
          >
            <option value="all">All Accounts</option>
            {accounts.map((acc) => (
              <option key={getAccountId(acc)} value={String(getAccountId(acc))}>
                {getAccountName(acc)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="p-4 md:p-6 space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="card-lg flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                {getTransactionIcon(transaction.type)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {getTransactionTitle(transaction)}
                </h3>
                <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                {transaction.category?.name && transaction.description && (
                  <p className="text-xs text-gray-500 truncate mt-1">{transaction.description}</p>
                )}
                {transaction.note && (
                  <p className="text-xs text-gray-400 truncate mt-1">{getReadableNote(transaction)}</p>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <p
                  className={`font-bold text-lg ${getTransactionTypeColor(transaction.type)}`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount, 'IDR')}
                </p>
                <p className="text-xs text-gray-500">{transaction.account?.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={transaction.type === 'transfer'}
                  onClick={() => openEdit(transaction)}
                  className={`p-2 rounded-lg ${
                    transaction.type === 'transfer'
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(transaction.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="card-lg text-center py-12">
            <p className="text-gray-500">No transactions found</p>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Edit Transaction</h2>
              <button type="button" onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select
                  value={editForm.account_id}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, account_id: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={getAccountId(acc)} value={String(getAccountId(acc))}>
                      {getAccountName(acc)}
                    </option>
                  ))}
                </select>
              </div>

              {editing.type !== 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">No category</option>
                    {categories
                      .filter((cat) => getCategoryType(cat) === editing.type)
                      .map((cat) => (
                        <option key={getCategoryId(cat)} value={String(getCategoryId(cat))}>
                          {getCategoryName(cat)}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="input min-h-20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingEdit} className="btn-primary flex-1">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
