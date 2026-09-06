import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, getToken, getUser, setTokens, setUser as persistUser, clearAuth, autoLogin } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken())
  const [user, setUserState] = useState(() => getUser())
  const [loading, setLoading] = useState(true)

  // Synchronize state with persistence
  const updateUser = useCallback((u) => {
    setUserState(u)
    persistUser(u)
  }, [])

  const login = useCallback(async (credentials) => {
    const res = await api.auth.login(credentials)
    if (res?.tokens) {
      setTokens(res.tokens)
      setToken(res.tokens.accessToken)
    }
    if (res?.user) {
      setUserState(res.user)
      persistUser(res.user)
    }
    return res
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setToken(null)
    setUserState(null)
  }, [])

  // Initialize and validate session on mount
  useEffect(() => {
    let mounted = true

    async function initSession() {
      let activeToken = getToken()
      if (!activeToken) {
        // Ensure default authenticated session is ready so no backend action fails
        activeToken = await autoLogin()
      }

      if (activeToken) {
        setToken(activeToken)
        try {
          const profile = await api.auth.getProfile()
          if (mounted && profile) {
            updateUser(profile)
          }
        } catch (err) {
          console.warn('Session verification notice:', err.message)
        }
      }
      if (mounted) setLoading(false)
    }

    initSession()

    return () => {
      mounted = false
    }
  }, [updateUser])

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    role: user?.role || 'ACCOUNTANT',
    isContactUser: user?.role === 'CONTACT_USER',
    contactId: user?.contactId || null,
    loading,
    login,
    logout,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
