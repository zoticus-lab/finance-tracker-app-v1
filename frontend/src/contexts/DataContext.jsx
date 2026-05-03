import { createContext, useState, useCallback, useEffect, useContext } from 'react'
import { transactionAPI, accountAPI, categoryAPI, budgetAPI, goalAPI } from '../services/api'
import { AuthContext } from './AuthContext'

export const DataContext = createContext()

export function DataProvider({ children }) {
  const { token, isAuthenticated } = useContext(AuthContext)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [goals, setGoals] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setAccounts([])
      setTransactions([])
      setCategories([])
      setBudgets([])
      setGoals([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [accountsRes, transactionsRes, categoriesRes, budgetsRes, goalsRes] = await Promise.all([
        accountAPI.list(),
        transactionAPI.list(),
        categoryAPI.list(),
        budgetAPI.list(),
        goalAPI.list(),
      ])

      setAccounts(accountsRes.data || [])
      setTransactions(transactionsRes.data || [])
      setCategories(categoriesRes.data || [])
      setBudgets(budgetsRes.data || [])
      setGoals(goalsRes.data || [])
    } catch (err) {
      setError(err?.message || 'Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const addAccount = useCallback((account) => {
    setAccounts(prev => [...prev, account])
  }, [])

  const updateAccount = useCallback((accountId, data) => {
    setAccounts(prev =>
      prev.map(acc => acc.account_id === accountId ? { ...acc, ...data } : acc)
    )
  }, [])

  const addTransaction = useCallback(async (transaction) => {
    let response

    if (transaction.type === 'income') {
      response = await transactionAPI.income({
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
        note: transaction.note,
      })
    } else if (transaction.type === 'expense') {
      response = await transactionAPI.expense({
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
        note: transaction.note,
      })
    } else {
      response = await transactionAPI.transfer({
        from_account_id: transaction.account_id,
        to_account_id: transaction.to_account_id,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
        note: transaction.note,
      })
    }

    const saved = response.data
    setTransactions(prev => [saved, ...prev])

    const amount = Number(transaction.amount || 0)
    const accountId = Number(transaction.account_id)
    const toAccountId = Number(transaction.to_account_id)

    setAccounts(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev

      return prev.map((acc) => {
        const id = Number(acc.id ?? acc.account_id)
        let delta = 0

        if (transaction.type === 'income' && id === accountId) {
          delta = amount
        } else if (transaction.type === 'expense' && id === accountId) {
          delta = -amount
        } else if (transaction.type === 'transfer') {
          if (id === accountId) delta = -amount
          if (id === toAccountId) delta = amount
        }

        if (delta === 0) return acc

        return {
          ...acc,
          balance: Number(acc.balance || 0) + delta,
        }
      })
    })

    return saved
  }, [])

  const addGoal = useCallback((goal) => {
    setGoals(prev => [...prev, goal])
  }, [])

  const updateGoal = useCallback((goalId, data) => {
    setGoals(prev =>
      prev.map(goal => goal.goal_id === goalId ? { ...goal, ...data } : goal)
    )
  }, [])

  const value = {
    accounts,
    setAccounts,
    addAccount,
    updateAccount,
    transactions,
    setTransactions,
    addTransaction,
    categories,
    setCategories,
    budgets,
    setBudgets,
    goals,
    setGoals,
    addGoal,
    updateGoal,
    dashboardData,
    setDashboardData,
    loading,
    setLoading,
    error,
    setError,
    loadInitialData,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
