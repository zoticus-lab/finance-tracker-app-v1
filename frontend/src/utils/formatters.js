export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function shortDate(date) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function calculatePercentage(current, total) {
  if (total === 0) return 0
  return Math.round((current / total) * 100)
}

export function truncateText(text, maxLength = 50) {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

export function getTransactionTypeLabel(type) {
  const labels = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
  }
  return labels[type] || type
}

export function getTransactionTypeColor(type) {
  const colors = {
    income: 'text-green-600 bg-green-100',
    expense: 'text-red-600 bg-red-100',
    transfer: 'text-blue-600 bg-blue-100',
  }
  return colors[type] || 'text-gray-600 bg-gray-100'
}

export function getAccountTypeIcon(type) {
  const icons = {
    bank: '🏦',
    cash: '💵',
    savings: '🏪',
    credit_card: '💳',
    investment: '📈',
    other: '💰',
  }
  return icons[type] || '💰'
}

export function getDaysRemaining(targetDate) {
  const today = newDate()
  const target = new Date(targetDate)
  const diff = target - today
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isOverspent(spent, limit) {
  return spent > limit
}

export function getStatusColor(status) {
  const colors = {
    'on_track': 'text-green-600',
    'warning': 'text-yellow-600',
    'overspent': 'text-red-600',
    'active': 'text-blue-600',
    'completed': 'text-green-600',
    'abandoned': 'text-gray-600',
    'paused': 'text-yellow-600',
  }
  return colors[status] || 'text-gray-600'
}

export function getStatusBadgeColor(status) {
  const colors = {
    'on_track': 'bg-green-100 text-green-800',
    'warning': 'bg-yellow-100 text-yellow-800',
    'overspent': 'bg-red-100 text-red-800',
    'active': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'abandoned': 'bg-gray-100 text-gray-800',
    'paused': 'bg-yellow-100 text-yellow-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
