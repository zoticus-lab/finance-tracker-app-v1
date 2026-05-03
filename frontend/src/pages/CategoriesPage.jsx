import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Tag, X } from 'lucide-react';
import { categoryAPI } from '../services/api';
import { getCategoryIcon } from '../utils/iconMap';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    parent_category_id: '',
    color_code: '#95a5a6',
  });

  const getCategoryId = (cat) => cat?.id ?? cat?.category_id;

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await categoryAPI.list();
      setCategories(response.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const categoriesByType = useMemo(() => {
    const expense = categories.filter((cat) => cat.type === 'expense');
    const income = categories.filter((cat) => cat.type === 'income');
    return { expense, income };
  }, [categories]);

  const buildCategoryGroups = (typeCategories) => {
    const parents = typeCategories.filter((cat) => !cat.parent_category_id);
    const parentIds = new Set(parents.map((cat) => Number(getCategoryId(cat))));

    const childrenMap = typeCategories.reduce((acc, cat) => {
      if (!cat.parent_category_id) return acc;
      const parentId = Number(cat.parent_category_id);
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(cat);
      return acc;
    }, {});

    const orphanChildren = typeCategories.filter(
      (cat) => cat.parent_category_id && !parentIds.has(Number(cat.parent_category_id))
    );

    const parentGroups = parents
      .map((parent) => ({
        parent,
        children: (childrenMap[Number(getCategoryId(parent))] || []).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.parent.name.localeCompare(b.parent.name));

    if (orphanChildren.length > 0) {
      parentGroups.push({
        parent: {
          id: 'orphan',
          name: 'Tanpa Parent',
          icon: 'tag',
          color_code: '#9ca3af',
          is_system_default: true,
        },
        children: orphanChildren.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    return parentGroups;
  };

  const expenseGroups = useMemo(() => buildCategoryGroups(categoriesByType.expense), [categoriesByType]);
  const incomeGroups = useMemo(() => buildCategoryGroups(categoriesByType.income), [categoriesByType]);

  const availableParentOptions = useMemo(() => {
    return categories
      .filter((cat) => cat.type === formData.type)
      .filter((cat) => !cat.parent_category_id)
      .filter((cat) => Number(getCategoryId(cat)) !== Number(editingId || 0))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, formData.type, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'expense', parent_category_id: '', color_code: '#95a5a6' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        parent_category_id: formData.parent_category_id ? Number(formData.parent_category_id) : null,
        color_code: formData.color_code,
      };

      if (!payload.name) {
        throw new Error('Category name is required');
      }

      if (editingId) {
        await categoryAPI.update(editingId, payload);
      } else {
        await categoryAPI.create(payload);
      }

      await fetchCategories();

      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(getCategoryId(category));
    setFormData({
      name: category.name,
      type: category.type,
      parent_category_id: category.parent_category_id ? String(category.parent_category_id) : '',
      color_code: category.color_code || '#95a5a6',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;

    try {
      await categoryAPI.delete(id);
      await fetchCategories();
    } catch (err) {
      setError(err?.message || 'Failed to delete category');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-24 md:pb-0">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 md:rounded-b-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Categories</h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
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

        {categories.length > 0 ? (
          <div className="space-y-8">
            {[
              { label: '📤 Expense Categories', groups: expenseGroups, badgeClass: 'bg-red-100 text-red-700' },
              { label: '📥 Income Categories', groups: incomeGroups, badgeClass: 'bg-green-100 text-green-700' },
            ].map((section) => (
              <div key={section.label}>
                <h2 className="text-base font-semibold text-gray-800 mb-3">{section.label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.groups.map(({ parent, children }) => {
                    const IconComponent = getCategoryIcon(parent.icon);
                    const parentId = getCategoryId(parent);
                    const isVirtualParent = parentId === 'orphan';

                    return (
                      <div
                        key={`${section.label}-${parentId}`}
                        className="card-lg relative overflow-hidden group hover:shadow-md transition-shadow"
                      >
                        <div
                          className="absolute inset-0 opacity-5"
                          style={{ backgroundColor: parent.color_code || '#95a5a6' }}
                        />

                        <div className="relative">
                          <div className="flex items-start justify-between mb-3">
                            <div
                              className="p-3 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: parent.color_code || '#95a5a6',
                                color: 'white',
                              }}
                            >
                              <IconComponent size={24} />
                            </div>

                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${section.badgeClass}`}>
                              Parent
                            </div>
                          </div>

                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              {parent.name}
                              {parent.is_system_default && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase tracking-wide">
                                  Template
                                </span>
                              )}
                            </h3>
                            {!isVirtualParent && (
                              <p className="text-xs text-gray-500 mt-1">{children.length} subkategori</p>
                            )}
                          </div>

                          {children.length > 0 && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                              {children.map((child) => (
                                <div key={getCategoryId(child)} className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: child.color_code || '#9ca3af' }}
                                    />
                                    <span className="text-sm text-gray-700 truncate">{child.name}</span>
                                  </div>

                                  {!child.is_system_default && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleEdit(child)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(getCategoryId(child))}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {!isVirtualParent && !parent.is_system_default && (
                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => handleEdit(parent)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                              >
                                <Edit2 size={16} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(getCategoryId(parent))}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                              >
                                <Trash2 size={16} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-lg text-center py-10 text-gray-500">No categories yet</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Category' : 'Create Category'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value,
                        parent_category_id: '',
                      }))
                    }
                    className="input"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Parent Category (Optional)</label>
                  <select
                    value={formData.parent_category_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parent_category_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">No parent (Top level)</option>
                    {availableParentOptions.map((cat) => (
                      <option key={getCategoryId(cat)} value={String(getCategoryId(cat))}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Color</label>
                  <input
                    type="color"
                    value={formData.color_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color_code: e.target.value }))}
                    className="input h-11 p-1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">
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
