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
    <div className="pb-24 md:pb-0">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 md:rounded-b-2xl">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-sm text-blue-100 mb-1">Total Balance</div>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(totalBalance, 'IDR')}
            </div>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-sm text-green-100 mb-1 flex items-center gap-2">
              <TrendingDown size={16} /> Income (This Month)
            </div>
            <div className="text-2xl font-bold text-green-300">
              +{formatCurrency(totalIncome, 'IDR')}
            </div>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-sm text-red-100 mb-1 flex items-center gap-2">
              <TrendingUp size={16} /> Expense (This Month)
            </div>
            <div className="text-2xl font-bold text-red-300">
              -{formatCurrency(totalExpense, 'IDR')}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6">
        {/* Accounts Overview */}
        <DashboardCard
          title="Your Accounts"
          icon={Wallet}
          content={
            <div className="space-y-3">
              {accounts.length > 0 ? (
                accounts.slice(0, 3).map((account) => (
                  <div
                    key={account.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{account.name}</p>
                      <p className="text-xs text-gray-500">{account.account_type}</p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(account.balance, 'IDR')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No accounts yet</p>
              )}
              {accounts.length > 3 && (
                <p className="text-xs text-gray-400 text-center pt-2">
                  +{accounts.length - 3} more accounts
                </p>
              )}
            </div>
          }
        />

        {/* Recent Transactions */}
        <DashboardCard
          title="Recent Transactions"
          content={
            <div className="space-y-3">
              {transactions.length > 0 ? (
                transactions.slice(0, 3).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.category?.name || 'Transfer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    <p
                      className={`font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount, 'IDR')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No transactions yet</p>
              )}
              {transactions.length > 3 && (
                <p className="text-xs text-gray-400 text-center pt-2">
                  +{transactions.length - 3} more transactions
                </p>
              )}
            </div>
          }
        />

        {/* Budget Summary */}
        <DashboardCard
          title="Budget Status"
          content={
            <div className="space-y-3">
              {budgets.length > 0 ? (
                budgets.slice(0, 3).map((budget) => {
                  const percentage = (budget.spent_amount / budget.limit_amount) * 100;
                  const status =
                    percentage >= 100
                      ? 'danger'
                      : percentage >= 80
                      ? 'warning'
                      : 'success';

                  return (
                    <div key={budget.id} className="space-y-1 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <p className="font-medium text-gray-900">{budget.category?.name}</p>
                        <p
                          className={`text-xs font-semibold ${
                            status === 'danger'
                              ? 'text-red-600'
                              : status === 'warning'
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {percentage.toFixed(0)}%
                        </p>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            status === 'danger'
                              ? 'bg-red-500'
                              : status === 'warning'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{formatCurrency(budget.spent_amount, 'IDR')}</span>
                        <span>/ {formatCurrency(budget.limit_amount, 'IDR')}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No budgets yet</p>
              )}
            </div>
          }
        />

        {/* Goals Overview */}
        <DashboardCard
          title="Savings Goals"
          content={
            <div className="space-y-3">
              {goals.length > 0 ? (
                goals.slice(0, 3).map((goal) => {
                  const percentage = (goal.current_amount / goal.target_amount) * 100;

                  return (
                    <div key={goal.id} className="space-y-1 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          {goal.image_url ? (
                            <img
                              src={goal.image_url}
                              alt={goal.name}
                              className="w-7 h-7 rounded-md object-cover border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                              <Target size={14} />
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-900 truncate">{goal.name}</p>
                        </div>
                        <p className="text-xs font-semibold text-blue-600">
                          {percentage.toFixed(0)}%
                        </p>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{formatCurrency(goal.current_amount, 'IDR')}</span>
                        <span>/ {formatCurrency(goal.target_amount, 'IDR')}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No goals yet</p>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
