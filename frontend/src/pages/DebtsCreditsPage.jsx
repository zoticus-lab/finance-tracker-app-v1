import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { debtAPI, creditAPI, accountAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { useData } from '../hooks/useData'
import { formatCurrency } from '../utils/formatters'

const DebtsCreditsPage = () => {
  const { loadInitialData } = useData()
  const [activeTab, setActiveTab] = useState('debts') // 'debts' or 'credits'
  const [debts, setDebts] = useState([])
  const [credits, setCredits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [errors, setErrors] = useState({})
  const [paymentForm, setPaymentForm] = useState({})

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    account_id: '',
    priority: 'medium',
    color_code: activeTab === 'debts' ? '#e74c3c' : '#27ae60',
  })

  const getAccountId = (account) => account?.id ?? account?.account_id
  const getAccountName = (account) => account?.name ?? account?.account_name

  const getErrorMessage = (error, fallback) => {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.error) return error.error
    return fallback
  }

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setErrors({})

    const [debtsRes, creditsRes, accountsRes] = await Promise.allSettled([
      debtAPI.list(),
      creditAPI.list(),
      accountAPI.list(),
    ])

    if (debtsRes.status === 'fulfilled') {
      setDebts(debtsRes.value?.data || [])
    }

    if (creditsRes.status === 'fulfilled') {
      setCredits(creditsRes.value?.data || [])
    }

    if (accountsRes.status === 'fulfilled') {
      setAccounts(accountsRes.value?.data || [])
    }

    if (
      debtsRes.status === 'rejected' &&
      creditsRes.status === 'rejected' &&
      accountsRes.status === 'rejected'
    ) {
      setErrors({ form: 'Failed to load data. Please refresh.' })
    }

    setLoading(false)
  }

  const currentData = activeTab === 'debts' ? debts : credits
  const setCurrentData = activeTab === 'debts' ? setDebts : setCredits
  const API = activeTab === 'debts' ? debtAPI : creditAPI
  const isDebt = activeTab === 'debts'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    const fieldName = isDebt ? 'creditor_name' : 'debtor_name'
    if (!formData.name) {
      setErrors({ [fieldName]: `${isDebt ? 'Creditor' : 'Debtor'} name is required` })
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setErrors({ amount: 'Amount must be greater than 0' })
      return
    }
    if (!isDebt && !formData.account_id) {
      setErrors({ account_id: 'Account wajib dipilih untuk Piutang agar saldo langsung terpotong' })
      return
    }

    try {
      const payload = {
        [fieldName]: formData.name,
        total_amount: formData.amount,
        description: formData.description,
        start_date: formData.start_date,
        due_date: formData.due_date,
        account_id: formData.account_id ? Number(formData.account_id) : null,
        priority: formData.priority,
        color_code: formData.color_code,
      }

      if (selectedItem) {
        const response = await API.update(selectedItem[isDebt ? 'debt_id' : 'credit_id'], payload)
        const updated = currentData.map((item) =>
          item[isDebt ? 'debt_id' : 'credit_id'] === selectedItem[isDebt ? 'debt_id' : 'credit_id']
            ? response.data
            : item
        )
        setCurrentData(updated)
      } else {
        const response = await API.create(payload)
        setCurrentData([response.data, ...currentData])
      }
      await loadInitialData()
      setShowForm(false)
      resetForm()
    } catch (error) {
      setErrors({ form: getErrorMessage(error, 'Error saving data') })
    }
  }

  const handleEdit = (item) => {
    setSelectedItem(item)
    const nameField = isDebt ? 'creditor_name' : 'debtor_name'
    const amountField = isDebt ? 'total_amount' : 'total_amount'
    setFormData({
      name: item[nameField],
      amount: item[amountField],
      description: item.description,
      start_date: item.start_date,
      due_date: item.due_date || '',
      account_id: item.account_id || '',
      priority: item.priority,
      color_code: item.color_code,
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm(`Delete this ${isDebt ? 'debt' : 'credit'}?`)) {
      try {
        await API.delete(id)
        setCurrentData(currentData.filter((item) => item[isDebt ? 'debt_id' : 'credit_id'] !== id))
        await loadInitialData()
      } catch (error) {
        setErrors({ form: getErrorMessage(error, 'Error deleting data') })
      }
    }
  }

  const handleAddPayment = async (itemId, e) => {
    e.preventDefault()
    const payment = paymentForm[itemId]
    if (!payment || !payment.payment_amount || !payment.account_id) {
      setErrors({ form: 'Please fill in all payment fields' })
      return
    }

    try {
      const response = await API.addPayment(itemId, {
        payment_amount: parseFloat(payment.payment_amount),
        account_id: payment.account_id,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        notes: payment.notes,
      })

      const updated = currentData.map((item) =>
        item[isDebt ? 'debt_id' : 'credit_id'] === itemId
          ? response[isDebt ? 'debt' : 'credit']
          : item
      )
      setCurrentData(updated)
      setPaymentForm({ ...paymentForm, [itemId]: {} })
      await loadInitialData()
    } catch (error) {
      setErrors({ form: getErrorMessage(error, 'Error adding payment') })
    }
  }

  const handleDeletePayment = async (itemId, paymentId) => {
    if (window.confirm('Delete this payment?')) {
      try {
        const response = await API.deletePayment(itemId, paymentId)
        const updated = currentData.map((item) =>
          item[isDebt ? 'debt_id' : 'credit_id'] === itemId
            ? response[isDebt ? 'debt' : 'credit']
            : item
        )
        setCurrentData(updated)
        await loadInitialData()
      } catch (error) {
        setErrors({ form: getErrorMessage(error, 'Error deleting payment') })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      due_date: '',
      account_id: '',
      priority: 'medium',
      color_code: isDebt ? '#e74c3c' : '#27ae60',
    })
    setSelectedItem(null)
  }

  const getStatusColor = (status) => {
    const colorMap = {
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      defaulted: 'bg-red-100 text-red-700',
      written_off: 'bg-red-100 text-red-700',
    }
    return colorMap[status] || colorMap.active
  }

  const getPriorityColor = (priority) => {
    const colorMap = {
      low: 'text-gray-500',
      medium: 'text-orange-500',
      high: 'text-red-500',
    }
    return colorMap[priority] || colorMap.medium
  }

  const tabBgColor = isDebt ? 'from-red-50 to-orange-50' : 'from-green-50 to-emerald-50'
  const tabPrimaryColor = isDebt ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
  const tabBorderColor = isDebt ? 'border-red-500' : 'border-green-500'
  const tabTextColor = isDebt ? 'text-red-600' : 'text-green-600'

  if (loading) {
    return <LoadingSpinner message="Memuat data hutang & piutang..." />
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hutang & Piutang</h1>
          <p className="text-slate-500 font-medium mt-1">Kelola daftar hutang Anda ke pihak lain, piutang dari orang lain, dan catat cicilan pembayarannya.</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all duration-300 active:scale-95 self-start sm:self-auto ${
            isDebt 
              ? 'bg-gradient-to-r from-rose-600 to-rose-500 shadow-rose-500/10 hover:shadow-lg hover:shadow-rose-500/20 hover:from-rose-700 hover:to-rose-600'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 hover:from-emerald-700 hover:to-emerald-600'
          }`}
        >
          <Plus size={18} />
          <span>Tambah {isDebt ? 'Hutang' : 'Piutang'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-2xl p-1.5 max-w-md border border-slate-200/50 shadow-inner">
        <button
          onClick={() => {
            setActiveTab('debts')
            setFormData(prev => ({ ...prev, color_code: '#e74c3c' }))
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
            activeTab === 'debts'
              ? 'bg-white text-rose-600 shadow-sm border border-slate-200/20'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>💳 Hutang Saya</span>
          {debts.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
              {debts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('credits')
            setFormData(prev => ({ ...prev, color_code: '#27ae60' }))
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
            activeTab === 'credits'
              ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/20'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>💰 Piutang Saya</span>
          {credits.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
              {credits.length}
            </span>
          )}
        </button>
      </div>

      {/* Error Message */}
      {errors.form && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-slide-up">
          {errors.form}
        </div>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {currentData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center max-w-md mx-auto shadow-premium">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Plus size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Belum ada data {isDebt ? 'Hutang' : 'Piutang'}
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Catat {isDebt ? 'pinjaman dana dari bank/teman' : 'pinjaman dana yang Anda berikan ke teman/pelanggan'} untuk dipantau cicilannya.
            </p>
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all duration-300 active:scale-95 ${
                isDebt 
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 shadow-rose-500/10'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/10'
              }`}
            >
              <Plus size={18} />
              <span>Tambah {isDebt ? 'Hutang' : 'Piutang'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentData.map((item) => {
              const id = item[isDebt ? 'debt_id' : 'credit_id']
              const nameField = isDebt ? 'creditor_name' : 'debtor_name'
              const paidField = isDebt ? 'paid_amount' : 'received_amount'

              return (
                <div
                  key={id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-premium flex flex-col hover:shadow-premium-hover transition-all duration-300 overflow-hidden relative"
                >
                  <div
                    className="absolute top-0 bottom-0 left-0 w-1.5"
                    style={{ backgroundColor: item.color_code }}
                  />

                  <div
                    className="p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedItem(expandedItem === id ? null : id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900">{item[nameField]}</h3>
                          <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusColor(item[isDebt ? 'debt_status' : 'credit_status'])}`}>
                            {item[isDebt ? 'debt_status' : 'credit_status']}
                          </span>
                          <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-amber-100 bg-amber-50 text-amber-600 uppercase tracking-wider ${getPriorityColor(item.priority)}`}>
                            Prioritas: {item.priority}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                            <span>Progres Pelunasan</span>
                            <span className="font-bold text-slate-800">{item.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isDebt ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              }`}
                              style={{ width: `${item.progress_percentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-xs font-semibold pt-1">
                          <div className="bg-slate-50 p-2 border border-slate-100 rounded-xl">
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Total Nominal</span>
                            <p className="font-bold text-slate-900 mt-0.5 text-sm">{formatCurrency(item.total_amount, 'IDR')}</p>
                          </div>
                          <div className="bg-slate-50 p-2 border border-slate-100 rounded-xl">
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">{isDebt ? 'Sudah Dibayar' : 'Sudah Diterima'}</span>
                            <p className="font-bold text-emerald-600 mt-0.5 text-sm">
                              {formatCurrency(item[paidField], 'IDR')}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-2 border border-slate-100 rounded-xl">
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Sisa Saldo</span>
                            <p className="font-bold text-rose-600 mt-0.5 text-sm">{formatCurrency(item.remaining_amount, 'IDR')}</p>
                          </div>
                        </div>

                        {item.due_date && (
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Jatuh Tempo: {item.due_date}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-center ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(item)
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-indigo-500/5"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(id)
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-rose-500/5"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedItem(expandedItem === id ? null : id)
                          }}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                        >
                          {expandedItem === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details & Payments */}
                  {expandedItem === id && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">
                      {item.description && (
                        <div className="bg-white p-4 border border-slate-100 rounded-xl">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">Catatan Tambahan</h4>
                          <p className="text-slate-600 text-sm">{item.description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Record Payment Form */}
                        <div className="bg-white p-5 border border-slate-100 rounded-xl space-y-4">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">
                              {isDebt ? 'Catat Cicilan Pembayaran' : 'Catat Penerimaan Dana'}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Kurangi sisa saldo hutang/piutang secara otomatis.</p>
                          </div>
                          
                          <form onSubmit={(e) => handleAddPayment(id, e)} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nominal (IDR)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Contoh: 100000"
                                  value={paymentForm[id]?.payment_amount || ''}
                                  onChange={(e) =>
                                    setPaymentForm({
                                      ...paymentForm,
                                      [id]: { ...paymentForm[id], payment_amount: e.target.value },
                                    })
                                  }
                                  className="input py-1.5 px-3 text-sm"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Rekening</label>
                                <select
                                  value={paymentForm[id]?.account_id || ''}
                                  onChange={(e) =>
                                    setPaymentForm({
                                      ...paymentForm,
                                      [id]: { ...paymentForm[id], account_id: e.target.value },
                                    })
                                  }
                                  className="input py-1.5 px-3 text-sm appearance-none bg-no-repeat"
                                  style={{
                                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundSize: '0.8rem'
                                  }}
                                  required
                                >
                                  <option value="">Rekening</option>
                                  {accounts.map((account) => (
                                    <option key={getAccountId(account)} value={getAccountId(account)}>
                                      {getAccountName(account)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal Pembayaran</label>
                              <input
                                type="date"
                                value={paymentForm[id]?.payment_date || ''}
                                onChange={(e) =>
                                  setPaymentForm({
                                    ...paymentForm,
                                    [id]: { ...paymentForm[id], payment_date: e.target.value },
                                  })
                                }
                                className="input py-1.5 px-3 text-sm"
                              />
                            </div>
                            
                            <button
                              type="submit"
                              className={`w-full text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                                isDebt
                                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/10'
                                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10'
                              }`}
                            >
                              {isDebt ? 'Setor Pembayaran' : 'Terima Pembayaran'}
                            </button>
                          </form>
                        </div>

                        {/* Payment History */}
                        <div className="bg-white p-5 border border-slate-100 rounded-xl space-y-4 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">Riwayat Transaksi</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Daftar cicilan dan pembayaran yang telah terekam.</p>
                          </div>

                          {item.payments && item.payments.length > 0 ? (
                            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                              {item.payments.map((payment) => (
                                <div
                                  key={payment.payment_id}
                                  className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100/70 hover:border-slate-200 transition-all"
                                >
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{formatCurrency(payment.payment_amount, 'IDR')}</p>
                                    <p className="text-slate-400 text-[10px] font-semibold mt-0.5">
                                      Tanggal: {payment.payment_date}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleDeletePayment(id, payment.payment_id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 shadow-sm shadow-transparent hover:shadow-rose-500/5"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-center py-6">
                              <p className="text-xs text-slate-400 font-semibold">Belum ada riwayat cicilan.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Main Form Popup Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {selectedItem ? `Edit ${isDebt ? 'Hutang' : 'Piutang'}` : `Tambah ${isDebt ? 'Hutang' : 'Piutang'}`}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isDebt ? 'Nama Kreditur' : 'Nama Debitur'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder={isDebt ? 'Contoh: Bank Mandiri, Teman A' : 'Contoh: Pelanggan B, Teman C'}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nominal Total (IDR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input"
                  placeholder="Contoh: 1000000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Rekening {isDebt ? '(Optional)' : '(Wajib)'}</label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="input appearance-none bg-no-repeat"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1rem'
                  }}
                >
                  <option value="">Pilih rekening</option>
                  {accounts.map((account) => (
                    <option key={getAccountId(account)} value={getAccountId(account)}>
                      {getAccountName(account)}
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="text-rose-500 text-xs font-bold mt-1">{errors.account_id}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Skala Prioritas</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Sedang (Medium)</option>
                    <option value="high">Tinggi (High)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Label Warna</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color_code}
                      onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                      className="w-12 h-10 p-0.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">{formData.color_code}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Deskripsi / Keterangan</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input min-h-20 resize-none"
                  placeholder="Beri catatan tambahan..."
                  rows="2"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`btn-primary flex-1 ${
                    isDebt ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600' : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600'
                  }`}
                >
                  {selectedItem ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DebtsCreditsPage
