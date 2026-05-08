import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    // Extract error message from response or use default
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred'
    const err = new Error(errorMessage)
    err.data = error.response?.data
    err.status = error.response?.status
    return Promise.reject(err)
  }
)

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
}

// Accounts endpoints
export const accountAPI = {
  list: () => api.get('/accounts'),
  get: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  summary: (id) => api.get(`/accounts/${id}/summary`),
}

// Transactions endpoints
export const transactionAPI = {
  list: (params) => api.get('/transactions', { params }),
  income: (data) => api.post('/transactions/income', data),
  expense: (data) => api.post('/transactions/expense', data),
  transfer: (data) => api.post('/transactions/transfer', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
}

// Categories endpoints
export const categoryAPI = {
  list: () => api.get('/categories'),
  byType: (type) => api.get(`/categories/type/${type}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

// Budgets endpoints
export const budgetAPI = {
  list: (params) => api.get('/budgets', { params }),
  currentMonth: () => api.get('/budgets/current-month'),
  get: (id) => api.get(`/budgets/${id}`),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
}

// Goals endpoints
export const goalAPI = {
  list: (params) => api.get('/goals', { params }),
  active: () => api.get('/goals/active'),
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/goals/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  get: (id) => api.get(`/goals/${id}`),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  updateProgress: (id, payloadOrAmount) => {
    const payload = typeof payloadOrAmount === 'object'
      ? payloadOrAmount
      : { current_amount: payloadOrAmount }
    return api.put(`/goals/${id}/progress`, payload)
  },
  delete: (id) => api.delete(`/goals/${id}`),
}

// Dashboard endpoints
export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary'),
  cashFlow: (params) => api.get('/dashboard/cash-flow', { params }),
  expenseBreakdown: (params) => api.get('/dashboard/expense-breakdown', { params }),
  balanceTrend: (params) => api.get('/dashboard/balance-trend', { params }),
  topCategories: (params) => api.get('/dashboard/top-categories', { params }),
}

// Dashboard Cards endpoints
export const dashboardCardAPI = {
  list: () => api.get('/dashboard-cards'),
  enabled: () => api.get('/dashboard-cards/enabled'),
  create: (data) => api.post('/dashboard-cards', data),
  update: (id, data) => api.put(`/dashboard-cards/${id}`, data),
  delete: (id) => api.delete(`/dashboard-cards/${id}`),
  reorder: (data) => api.post('/dashboard-cards/reorder', data),
}

// Debts endpoints
export const debtAPI = {
  list: () => api.get('/debts'),
  active: () => api.get('/debts/active'),
  get: (id) => api.get(`/debts/${id}`),
  create: (data) => api.post('/debts', data),
  update: (id, data) => api.put(`/debts/${id}`, data),
  delete: (id) => api.delete(`/debts/${id}`),
  addPayment: (id, data) => api.post(`/debts/${id}/payments`, data),
  deletePayment: (debtId, paymentId) => api.delete(`/debts/${debtId}/payments/${paymentId}`),
}

// Credits endpoints
export const creditAPI = {
  list: () => api.get('/credits'),
  active: () => api.get('/credits/active'),
  get: (id) => api.get(`/credits/${id}`),
  create: (data) => api.post('/credits', data),
  update: (id, data) => api.put(`/credits/${id}`, data),
  delete: (id) => api.delete(`/credits/${id}`),
  addPayment: (id, data) => api.post(`/credits/${id}/payments`, data),
  deletePayment: (creditId, paymentId) => api.delete(`/credits/${creditId}/payments/${paymentId}`),
}

// Backup endpoints
export const backupAPI = {
  export: () => api.get('/backup/export'),
  import: (backup, dryRun = false) => api.post('/backup/import', { backup, dry_run: dryRun }),
  rollback: () => api.post('/backup/rollback'),
}

// Chat endpoints (AI Assistant)
export const chatAPI = {
  sendMessage: (message) => api.post('/chat', { message }),
}

export default api
