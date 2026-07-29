import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useData } from '../hooks/useData';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HomePage() {
  const { accounts, transactions, budgets, goals, loading } = useData();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  const FINANCING_EXPENSE_KEYWORDS = ['piutang', 'hutang', 'debt', 'loan'];
  const isFinancingCategory = (categoryName) => {
    const normalized = String(categoryName || '').toLowerCase();
    return FINANCING_EXPENSE_KEYWORDS.some((kw) => normalized.includes(kw));
  };

  useEffect(() => {
    if (accounts.length > 0) {
      const balance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
      setTotalBalance(balance);
    }

    if (transactions.length > 0) {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthTransactions = transactions.filter(
        (t) => new Date(t.created_at) >= monthStart
      );

      const income = monthTransactions
        .filter((t) => t.type === 'income' && !isFinancingCategory(t.category?.name))
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const expense = monthTransactions
        .filter((t) => t.type === 'expense' && !isFinancingCategory(t.category?.name))
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      setTotalIncome(income);
      setTotalExpense(expense);
    }
  }, [accounts, transactions]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Overview Keuangan</h1>
          <p className="text-slate-500 font-medium mt-1">Pantau dan kelola aset Anda dengan cara yang lebih cerdas.</p>
        </div>
      </div>

      {/* Balance Overview Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Digital Premium Debit Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-2xl border border-indigo-500/20 shadow-xl shadow-indigo-600/10 p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[200px] hover:shadow-2xl hover:shadow-indigo-600/20 transition-all duration-300">
          {/* Card background styling lines */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-violet-500/20 rounded-full blur-xl"></div>
          
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-indigo-200/90 text-xs font-bold uppercase tracking-wider">Total Saldo Aktif</p>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1">
                {formatCurrency(totalBalance, 'IDR')}
              </h2>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold uppercase tracking-widest">
              ACTIVE
            </div>
          </div>

          <div className="flex justify-between items-end z-10 pt-8">
            <div>
              <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-widest">Pemegang Akun</p>
              <p className="text-sm font-semibold tracking-wide mt-0.5">Uang Personal Account</p>
            </div>
            <div className="flex gap-1.5 opacity-90">
              <span className="w-6 h-6 rounded-full bg-red-500/80 transform translate-x-2"></span>
              <span className="w-6 h-6 rounded-full bg-yellow-500/80"></span>
            </div>
          </div>
        </div>

        {/* Income Card */}
        <div className="card p-6 flex flex-col justify-between min-h-[200px]">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <TrendingDown size={24} />
            </div>
            <span className="badge-success">Bulan Ini</span>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold">Pemasukan</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-1">
              +{formatCurrency(totalIncome, 'IDR')}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-2">Pemasukan terdaftar dari transaksi aktif</p>
          </div>
        </div>

        {/* Expense Card */}
        <div className="card p-6 flex flex-col justify-between min-h-[200px]">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <TrendingUp size={24} />
            </div>
            <span className="badge-danger">Bulan Ini</span>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold">Pengeluaran</p>
            <h3 className="text-2xl font-extrabold text-rose-600 tracking-tight mt-1">
              -{formatCurrency(totalExpense, 'IDR')}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-2">Pengeluaran terdaftar dari transaksi aktif</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Accounts Overview */}
        <DashboardCard
          title="Daftar Rekening"
          icon={Wallet}
          className="border border-slate-100"
          content={
            <div className="space-y-4 pt-2">
              {accounts.length > 0 ? (
                accounts.slice(0, 3).map((account) => (
                  <div
                    key={account.id}
                    className="flex justify-between items-center p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-300 group/item"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-sm border border-primary-100/50">
                        {account.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover/item:text-primary-600 transition-colors duration-200">{account.name}</p>
                        <p className="text-xs text-slate-400 font-semibold capitalize mt-0.5">{account.account_type}</p>
                      </div>
                    </div>
                    <p className="font-extrabold text-slate-950">
                      {formatCurrency(account.balance, 'IDR')}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400">Belum ada rekening terdaftar</div>
              )}
              {accounts.length > 3 && (
                <div className="text-xs text-slate-400 font-bold text-center bg-slate-50/50 py-2.5 rounded-xl border border-dashed border-slate-200">
                  +{accounts.length - 3} Rekening Lainnya
                </div>
              )}
            </div>
          }
        />

        {/* Recent Transactions */}
        <DashboardCard
          title="Transaksi Terakhir"
          content={
            <div className="space-y-4 pt-2">
              {transactions.length > 0 ? (
                transactions.slice(0, 3).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                        transaction.type === 'income'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {transaction.category?.name ? transaction.category.name.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{transaction.category?.name || 'Transfer'}</p>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                    <p
                      className={`font-extrabold ${
                        transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount, 'IDR')}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400">Belum ada transaksi terdaftar</div>
              )}
              {transactions.length > 3 && (
                <div className="text-xs text-slate-400 font-bold text-center bg-slate-50/50 py-2.5 rounded-xl border border-dashed border-slate-200">
                  +{transactions.length - 3} Transaksi Lainnya
                </div>
              )}
            </div>
          }
        />

        {/* Budget Summary */}
        <DashboardCard
          title="Status Anggaran"
          content={
            <div className="space-y-4 pt-2">
              {budgets.length > 0 ? (
                budgets.slice(0, 3).map((budget) => {
                  const percentage = (budget.spent_amount / budget.limit_amount) * 100;
                  const isExceeded = percentage >= 100;
                  const isWarning = percentage >= 80 && percentage < 100;

                  return (
                    <div key={budget.id} className="space-y-2.5 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <div className="flex justify-between items-center text-sm">
                        <p className="font-bold text-slate-800">{budget.category?.name}</p>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            isExceeded
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : isWarning
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}
                        >
                          {percentage.toFixed(0)}% Terpakai
                        </span>
                      </div>
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
                      <div className="flex justify-between text-xs text-slate-500 font-semibold">
                        <span>Terpakai: {formatCurrency(budget.spent_amount, 'IDR')}</span>
                        <span>Batas: {formatCurrency(budget.limit_amount, 'IDR')}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400">Belum ada anggaran terdaftar</div>
              )}
            </div>
          }
        />

        {/* Goals Overview */}
        <DashboardCard
          title="Target Tabungan (Goals)"
          content={
            <div className="space-y-4 pt-2">
              {goals.length > 0 ? (
                goals.slice(0, 3).map((goal) => {
                  const percentage = (goal.current_amount / goal.target_amount) * 100;

                  return (
                    <div key={goal.id} className="space-y-2.5 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {goal.image_url ? (
                            <img
                              src={goal.image_url}
                              alt={goal.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                              <Target size={16} />
                            </div>
                          )}
                          <p className="text-sm font-bold text-slate-800 truncate">{goal.name}</p>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {percentage.toFixed(0)}% Tercapai
                        </span>
                      </div>
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
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400">Belum ada target tabungan</div>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
