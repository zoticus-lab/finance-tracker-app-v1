import { createContext, useState, useCallback, useEffect } from 'react'
import { authAPI } from '../services/api'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('auth_token'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const hydrateAuth = async () => {
      setLoading(true)

      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
          setLoading(false)
          return
        } catch (err) {
          console.error('Failed to parse user:', err)
          localStorage.removeItem('user')
        }
      }

      try {
        const meRes = await authAPI.me()
        const meUser = meRes?.user || null
        setUser(meUser)
        if (meUser) {
          localStorage.setItem('user', JSON.stringify(meUser))
        }
      } catch (_) {
        setUser(null)
        setToken(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }

    hydrateAuth()
  }, [token])

  const login = useCallback(async (email, password) => {
    try {
      const response = await authAPI.login({ email, password })
      const userData = response.user
      const authToken = response.token

      setUser(userData)
      setToken(authToken)
      localStorage.setItem('auth_token', authToken)
      localStorage.setItem('user', JSON.stringify(userData))
      setError(null)

      return response
    } catch (err) {
      const message = err?.message || 'Login failed'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch (_) {
      // Ignore API logout errors and clear local state anyway.
    }

    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }, [])

  const updateUser = useCallback((userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }, [])

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
