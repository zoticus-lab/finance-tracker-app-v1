import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { debtAPI, creditAPI, accountAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { useData } from '../hooks/useData'

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
    <div className={`min-h-screen bg-gradient-to-br ${tabBgColor} pb-24 md:pb-0`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 md:rounded-b-2xl">
        <h1 className="text-2xl font-bold">Hutang & Piutang</h1>
        <p className="text-blue-100 mt-1 text-sm">Catat, pantau progress, dan tandai pembayaran.</p>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Tabs for Desktop */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex-1 px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'debts'
                ? `bg-red-500 text-white`
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-red-500'
            }`}
          >
            💳 Hutang (Debts)
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`flex-1 px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'credits'
                ? `bg-green-500 text-white`
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-500'
            }`}
          >
            💰 Piutang (Credits)
          </button>
        </div>

        {/* Add Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isDebt ? 'Daftar Hutang' : 'Daftar Piutang'}
          </h2>
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className={`flex items-center gap-2 ${tabPrimaryColor} text-white px-4 py-2 rounded-lg transition`}
          >
            <Plus size={20} />
            Add {isDebt ? 'Debt' : 'Credit'}
          </button>
        </div>

        {/* Error Message */}
        {errors.form && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {errors.form}
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {selectedItem ? `Edit ${isDebt ? 'Debt' : 'Credit'}` : `Add New ${isDebt ? 'Debt' : 'Credit'}`}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {isDebt ? 'Creditor Name' : 'Debtor Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={isDebt ? 'e.g., Bank, Friend' : 'e.g., Customer, Friend'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Account ({isDebt ? 'Optional' : 'Required untuk Piutang'})</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={getAccountId(account)} value={getAccountId(account)}>
                        {getAccountName(account)}
                      </option>
                    ))}
                  </select>
                  {errors.account_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.account_id}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <input
                      type="color"
                      value={formData.color_code}
                      onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Notes..."
                    rows="2"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`flex-1 ${tabPrimaryColor} text-white font-medium py-2 rounded-lg transition`}
                  >
                    {selectedItem ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          {currentData.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg">
              <p className="text-gray-500">
                {isDebt ? 'No debts recorded yet' : 'No credits recorded yet'}
              </p>
            </div>
          ) : (
            currentData.map((item) => {
              const id = item[isDebt ? 'debt_id' : 'credit_id']
              const nameField = isDebt ? 'creditor_name' : 'debtor_name'
              const paidField = isDebt ? 'paid_amount' : 'received_amount'

              return (
                <div
                  key={id}
                  className="bg-white rounded-lg shadow-md overflow-hidden border-l-4"
                  style={{ borderLeftColor: item.color_code }}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedItem(expandedItem === id ? null : id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-800">{item[nameField]}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(item[isDebt ? 'debt_status' : 'credit_status'])}`}>
                            {item[isDebt ? 'debt_status' : 'credit_status']}
                          </span>
                          <span className={`text-sm ${getPriorityColor(item.priority)}`}>
                            {item.priority.toUpperCase()}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Progress</span>
                            <span className="text-sm font-semibold">{item.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isDebt ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${item.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Total:</span>
                            <p className="font-semibold">{item.total_amount}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">{isDebt ? 'Paid' : 'Received'}:</span>
                            <p className={`font-semibold ${isDebt ? 'text-green-600' : 'text-green-600'}`}>
                              {item[paidField]}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Remaining:</span>
                            <p className="font-semibold text-red-600">{item.remaining_amount}</p>
                          </div>
                        </div>

                        {item.due_date && (
                          <p className="text-xs text-gray-500 mt-2">
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(item)
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(id)
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedItem(expandedItem === id ? null : id)
                          }}
                          className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition"
                        >
                          {expandedItem === id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedItem === id && (
                    <div className="border-t bg-gray-50 p-4 space-y-4">
                      {item.description && (
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Description</h4>
                          <p className="text-gray-600 text-sm">{item.description}</p>
                        </div>
                      )}

                      {/* Payment Form */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2">
                          {isDebt ? 'Add Payment' : 'Record Payment'}
                        </h4>
                        <form onSubmit={(e) => handleAddPayment(id, e)} className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={paymentForm[id]?.payment_amount || ''}
                              onChange={(e) =>
                                setPaymentForm({
                                  ...paymentForm,
                                  [id]: { ...paymentForm[id], payment_amount: e.target.value },
                                })
                              }
                              className="px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                            <select
                              value={paymentForm[id]?.account_id || ''}
                              onChange={(e) =>
                                setPaymentForm({
                                  ...paymentForm,
                                  [id]: { ...paymentForm[id], account_id: e.target.value },
                                })
                              }
                              className="px-3 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Select account</option>
                              {accounts.map((account) => (
                                <option key={getAccountId(account)} value={getAccountId(account)}>
                                  {getAccountName(account)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="date"
                            value={paymentForm[id]?.payment_date || ''}
                            onChange={(e) =>
                              setPaymentForm({
                                ...paymentForm,
                                [id]: { ...paymentForm[id], payment_date: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            type="submit"
                            className={`w-full ${tabPrimaryColor} text-white py-1 rounded text-sm font-medium transition`}
                          >
                            {isDebt ? 'Add Payment' : 'Record Payment'}
                          </button>
                        </form>
                      </div>

                      {/* Payment History */}
                      {item.payments && item.payments.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">
                            {isDebt ? 'Payment History' : 'Received Payments'}
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {item.payments.map((payment) => (
                              <div
                                key={payment.payment_id}
                                className="flex justify-between items-center p-2 bg-white rounded border border-gray-200"
                              >
                                <div className="text-sm">
                                  <p className="font-medium">{payment.payment_amount}</p>
                                  <p className="text-gray-600 text-xs">
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeletePayment(id, payment.payment_id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default DebtsCreditsPage
