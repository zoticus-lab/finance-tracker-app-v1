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
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kategori Transaksi</h1>
          <p className="text-slate-500 font-medium mt-1">Atur kategori pemasukan dan pengeluaran Anda beserta subkategorinya.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-bold shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 hover:from-primary-700 hover:to-primary-600 transition-all duration-300 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Tambah Kategori</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-slide-up">
          {error}
        </div>
      )}

      {categories.length > 0 ? (
        <div className="space-y-12">
          {[
            {
              label: 'Kategori Pengeluaran (Expense)',
              groups: expenseGroups,
              badgeClass: 'bg-rose-50 text-rose-600 border border-rose-100',
              iconText: '📤'
            },
            {
              label: 'Kategori Pemasukan (Income)',
              groups: incomeGroups,
              badgeClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
              iconText: '📥'
            },
          ].map((section) => (
            <div key={section.label} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{section.iconText}</span>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">{section.label}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.groups.map(({ parent, children }) => {
                  const IconComponent = getCategoryIcon(parent.icon);
                  const parentId = getCategoryId(parent);
                  const isVirtualParent = parentId === 'orphan';

                  return (
                    <div
                      key={`${section.label}-${parentId}`}
                      className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 flex flex-col justify-between hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group"
                    >
                      <div
                        className="absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10 pointer-events-none"
                        style={{ backgroundColor: parent.color_code || '#95a5a6' }}
                      />

                      <div className="relative w-full space-y-4">
                        <div className="flex items-start justify-between">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shadow-slate-500/10"
                            style={{
                              backgroundColor: parent.color_code || '#95a5a6',
                            }}
                          >
                            <IconComponent size={22} />
                          </div>

                          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${section.badgeClass}`}>
                            Utama
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {parent.name}
                            {parent.is_system_default && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold uppercase tracking-wide">
                                Bawaan
                              </span>
                            )}
                          </h3>
                          {!isVirtualParent && (
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{children.length} subkategori</p>
                          )}
                        </div>

                        {children.length > 0 && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 space-y-2">
                            {children.map((child) => (
                              <div key={getCategoryId(child)} className="flex items-center justify-between gap-3 py-0.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: child.color_code || '#9ca3af' }}
                                  />
                                  <span className="text-sm text-slate-600 font-semibold truncate">{child.name}</span>
                                </div>

                                {!child.is_system_default && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleEdit(child)}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-indigo-500/5"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(getCategoryId(child))}
                                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-white border border-transparent hover:border-rose-100 rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-rose-500/5"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {!isVirtualParent && !parent.is_system_default && (
                          <div className="flex gap-2 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => handleEdit(parent)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-200"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(getCategoryId(parent))}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50/50 transition-all duration-200"
                            >
                              <Trash2 size={13} />
                              <span>Hapus</span>
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
        <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Tag size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Belum ada Kategori</h3>
          <p className="text-slate-500 text-sm mb-6">Atur kategori pemasukan atau pengeluaran untuk mempermudah pencatatan anggaran.</p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-primary mx-auto"
          >
            <Plus size={18} />
            <span>Tambah Kategori</span>
          </button>
        </div>
      )}

      {/* Categories Form Popup Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {editingId ? 'Edit Kategori' : 'Tambah Kategori'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nama Kategori</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Contoh: Belanja Bulanan, Gaji Pokok"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tipe Kategori</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value,
                        parent_category_id: '',
                      }))
                    }
                    className="input appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="expense">Pengeluaran (Expense)</option>
                    <option value="income">Pemasukan (Income)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Parent Category</label>
                  <select
                    value={formData.parent_category_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parent_category_id: e.target.value }))}
                    className="input appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="">Tidak ada (Kategori Utama)</option>
                    {availableParentOptions.map((cat) => (
                      <option key={getCategoryId(cat)} value={String(getCategoryId(cat))}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Warna</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color_code: e.target.value }))}
                    className="w-12 h-10 p-0.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">{formData.color_code}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
