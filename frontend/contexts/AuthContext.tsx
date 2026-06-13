'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, tokenStorage } from '@/lib/api'
import type { User } from '@/lib/types'
import toast from 'react-hot-toast'

// ── Shape of what useAuth() returns ──────────────────────────────────────────
interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string, phoneNumber?: string, address?: string) => Promise<void>
  logout: () => Promise<void>
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
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On app load: check if a token already exists from a previous session.
  // If yes, verify it is still valid by calling GET /api/auth/me.
  // If the token is expired, the 401 interceptor in api.ts clears storage automatically.
  useEffect(() => {
    const storedUser = tokenStorage.getUser()
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
    try {
      const res = await authAPI.login(email, password)
      const { access_token, user: loggedInUser } = res.data

      tokenStorage.setAccessToken(access_token)
      tokenStorage.setUser(loggedInUser)
      setUser(loggedInUser)
      toast.success(`Welcome back, ${loggedInUser.full_name}!`)
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed'
      toast.error(message)
      throw error
    }
  }, [])

  // ── register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    phoneNumber?: string,
    address?: string
  ) => {
    try {
      const res = await authAPI.register(fullName, email, password, phoneNumber, address)
      const { access_token, user: newUser } = res.data

      tokenStorage.setAccessToken(access_token)
      tokenStorage.setUser(newUser)
      setUser(newUser)
      toast.success('Account created successfully! Welcome to ShopSwift!')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed'
      toast.error(message)
      throw error
    }
  }, [])

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // Optional: Call backend logout endpoint if you have one
      // await authAPI.logout()
      
      // Clear storage
      tokenStorage.clear()
      setUser(null)
      
      // Show success message
      toast.success('Logged out successfully')
      
      // Redirect to homepage
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local storage even if API call fails
      tokenStorage.clear()
      setUser(null)
      router.push('/')
    }
  }, [router])

  // ── updateProfile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (data: {
    full_name?: string
    phone_number?: string
    address?: string
    current_password?: string
    new_password?: string
  }) => {
    try {
      const res = await authAPI.updateProfile(data)
      const updated = res.data?.user ?? res.data
      tokenStorage.setUser(updated)
      setUser(updated)
      toast.success('Profile updated successfully')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update profile'
      toast.error(message)
      throw error
    }
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  }), [user, loading, login, register, logout, updateProfile])

  return (
    <AuthContext.Provider value={value}>
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