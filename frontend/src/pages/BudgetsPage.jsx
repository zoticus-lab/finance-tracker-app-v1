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
    <div className="pb-24 md:pb-0">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 md:rounded-b-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Budgets</h1>
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

        {budgets.length > 0 ? (
          budgets.map((budget) => {
            const percentage = (budget.spent_amount / budget.limit_amount) * 100;
            const colors = getStatusColor(budget.spent_amount, budget.limit_amount);
            const status = getStatusLabel(budget.spent_amount, budget.limit_amount);

            return (
              <div key={budget.id} className="card-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {budget.category?.name}
                    </h3>
                    <p className={`text-sm ${colors.text} font-medium`}>{status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(budget)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{formatCurrency(budget.spent_amount, 'IDR')}</span>
                    <span>{formatCurrency(budget.limit_amount, 'IDR')}</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bg} transition-all`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right">{percentage.toFixed(1)}% used</p>
                </div>

                {/* Period Info */}
                <p className="text-xs text-gray-500">
                  {budget.period_start} to {budget.period_end}
                </p>
              </div>
            );
          })
        ) : (
          <div className="card-lg text-center py-12">
            <p className="text-gray-500 mb-4">No budgets yet</p>
            <button onClick={handleAddClick} className="btn-primary">
              <Plus size={18} className="inline mr-2" />
              Create Budget
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Budget' : 'Create Budget'}</h2>
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
                <label className="block text-sm font-medium text-gray-700">Budget Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g. Monthly Food"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Period Type</label>
                  <select
                    name="period_type"
                    value={formData.period_type}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Budget Limit</label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="period_start"
                    value={formData.period_start}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
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
