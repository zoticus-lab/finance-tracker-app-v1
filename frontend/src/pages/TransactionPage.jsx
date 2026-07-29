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
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Riwayat Transaksi</h1>
          <p className="text-slate-500 font-medium mt-1">Pantau dan kelola seluruh arus keuangan Anda dari berbagai rekening.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-slide-up">
          {error}
        </div>
      )}

      {/* Filters Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Filter size={18} className="text-slate-500" />
          <span className="text-sm font-bold text-slate-800 tracking-tight">Filter Pencarian</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tipe Transaksi</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input text-sm appearance-none bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1rem'
              }}
            >
              <option value="all">Semua Tipe</option>
              <option value="income">Pemasukan (Income)</option>
              <option value="expense">Pengeluaran (Expense)</option>
              <option value="transfer">Transfer Dana</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Kategori</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input text-sm appearance-none bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1rem'
              }}
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={getCategoryId(cat)} value={String(getCategoryId(cat))}>
                  {getCategoryName(cat)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Rekening</label>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="input text-sm appearance-none bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1rem'
              }}
            >
              <option value="all">Semua Rekening</option>
              {accounts.map((acc) => (
                <option key={getAccountId(acc)} value={String(getAccountId(acc))}>
                  {getAccountName(acc)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {filteredTransactions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredTransactions.map((transaction) => {
              const income = transaction.type === 'income';
              const expense = transaction.type === 'expense';
              const transfer = transaction.type === 'transfer';

              let iconBg = 'bg-slate-50 border-slate-100 text-slate-600';
              if (income) iconBg = 'bg-emerald-50 border border-emerald-100/50 text-emerald-600';
              if (expense) iconBg = 'bg-rose-50 border border-rose-100/50 text-rose-600';
              if (transfer) iconBg = 'bg-indigo-50 border border-indigo-100/50 text-indigo-600';

              return (
                <div
                  key={transaction.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-premium p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-premium-hover transition-all duration-300"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                      {getTransactionIcon(transaction.type)}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-bold text-slate-900 text-base truncate">
                        {getTransactionTitle(transaction)}
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold">{formatDate(transaction.date)}</p>
                      {transaction.category?.name && transaction.description && (
                        <p className="text-xs text-slate-500 truncate mt-1">{transaction.description}</p>
                      )}
                      {transaction.note && (
                        <p className="text-xs text-slate-400/90 italic truncate mt-1">{getReadableNote(transaction)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 self-stretch sm:self-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className={`font-extrabold text-lg ${getTransactionTypeColor(transaction.type)}`}>
                        {income ? '+' : '-'}
                        {formatCurrency(transaction.amount, 'IDR')}
                      </p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{transaction.account?.name}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={transfer}
                        onClick={() => openEdit(transaction)}
                        className={`p-2 border border-transparent rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-indigo-500/5 ${
                          transfer
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-100'
                        }`}
                        title={transfer ? 'Transfer tidak dapat diedit' : 'Edit Transaksi'}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-rose-500/5"
                        title="Hapus Transaksi"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center max-w-md mx-auto">
            <p className="text-slate-500 text-sm">Tidak ada transaksi yang cocok dengan filter pencarian.</p>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal Overlay */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Edit Transaksi</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nominal (IDR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input font-semibold"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Rekening</label>
                  <select
                    value={editForm.account_id}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, account_id: e.target.value }))}
                    className="input appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem'
                    }}
                    required
                  >
                    <option value="">Pilih rekening</option>
                    {accounts.map((acc) => (
                      <option key={getAccountId(acc)} value={String(getAccountId(acc))}>
                        {getAccountName(acc)}
                      </option>
                    ))}
                  </select>
                </div>

                {editing.type !== 'transfer' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Kategori</label>
                    <select
                      value={editForm.category_id}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, category_id: e.target.value }))}
                      className="input appearance-none bg-no-repeat"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '1rem'
                      }}
                    >
                      <option value="">Tanpa kategori</option>
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
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Deskripsi</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="Beri deskripsi singkat..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Catatan</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="input min-h-20 resize-none"
                  placeholder="Beri catatan tambahan..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={savingEdit} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {savingEdit ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
