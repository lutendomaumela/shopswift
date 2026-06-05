'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authAPI, tokenStorage } from '@/lib/api'
import type { User } from '@/lib/types'

// ── Shape of what useAuth() returns ──────────────────────────────────────────
interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string, phoneNumber?: string, address?: string) => Promise<void>
  logout: () => void
  updateProfile: (data: {
    full_name?: string
    phone_number?: string
    address?: string
    current_password?: string
    new_password?: string
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On app load: check if a token already exists from a previous session.
  // If yes, verify it is still valid by calling GET /api/auth/me.
  // If the token is expired, the 401 interceptor in api.ts clears storage automatically.
  useEffect(() => {
    const storedUser  = tokenStorage.getUser()
    const storedToken = tokenStorage.getAccessToken()

    if (storedToken && storedUser) {
      // Show user immediately from localStorage — fast UI
      setUser(storedUser)

      // Then verify the token is still valid in the background
      authAPI.getCurrentUser()
        .then((res) => {
          // Flask may return { user: {...} } or a flat user object
          const fresh = (res.data as { user: User }).user ?? (res.data as User)
          setUser(fresh)
          tokenStorage.setUser(fresh)
        })
        .catch(() => {
          // Token rejected — clear everything
          tokenStorage.clear()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await authAPI.login(email, password)
    const { access_token, user: loggedInUser } = res.data

    tokenStorage.setAccessToken(access_token)
    tokenStorage.setUser(loggedInUser)
    setUser(loggedInUser)
  }, [])

  // ── register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    phoneNumber?: string,
    address?: string
  ) => {
    const res = await authAPI.register(fullName, email, password, phoneNumber, address)
    const { access_token, user: newUser } = res.data

    tokenStorage.setAccessToken(access_token)
    tokenStorage.setUser(newUser)
    setUser(newUser)
  }, [])

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [])

  // ── updateProfile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (data: {
    full_name?: string
    phone_number?: string
    address?: string
    current_password?: string
    new_password?: string
  }) => {
    const res = await authAPI.updateProfile(data)
    const updated = res.data?.user ?? res.data
    tokenStorage.setUser(updated)
    setUser(updated)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── useAuth hook ──────────────────────────────────────────────────────────────
// Usage anywhere in the app:
//   const { user, login, logout, isAuthenticated } = useAuth()
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() must be called inside <AuthProvider>')
  }
  return ctx
}