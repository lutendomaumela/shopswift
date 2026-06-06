'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { cartAPI, tokenStorage } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { CartItem, CartResponse } from '@/lib/types'

interface CartContextType {
  items: CartItem[]
  itemCount: number
  total: number
  loading: boolean
  addToCart: (productId: number, quantity?: number) => Promise<void>
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>
  removeFromCart: (cartItemId: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems]         = useState<CartItem[]>([])
  const [itemCount, setItemCount] = useState(0)
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)

  const { isAuthenticated } = useAuth()

  const refreshCart = useCallback(async () => {
    const token = tokenStorage.getAccessToken()
    if (!token) {
      setItems([])
      setItemCount(0)
      setTotal(0)
      setLoading(false)
      return
    }

    try {
      const response = await cartAPI.getCart()
      const data: CartResponse = response.data
      // Ensure each item has valid price (fallback to 0 if undefined)
      const safeItems = (data.items || []).map(item => ({
        ...item,
        price: item.price || 0,
        subtotal: item.subtotal || (item.price || 0) * item.quantity
      }))
      setItems(safeItems)
      setItemCount(data.item_count || 0)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to load cart:', error)
      setItems([])
      setItemCount(0)
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch cart whenever auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart()
    } else {
      setItems([])
      setItemCount(0)
      setTotal(0)
      setLoading(false)
    }
  }, [isAuthenticated, refreshCart])

  const addToCart = async (productId: number, quantity = 1) => {
    if (!isAuthenticated) {
      toast.error('Please log in to add items to your cart')
      if (typeof window !== 'undefined') window.location.href = '/login'
      return
    }
    try {
      await cartAPI.addItem(productId, quantity)
      await refreshCart()
      toast.success('Added to cart')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to add to cart'
      toast.error(message)
    }
  }

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(cartItemId)
      return
    }
    try {
      await cartAPI.updateItem(cartItemId, quantity)
      await refreshCart()
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update quantity'
      toast.error(message)
    }
  }

  const removeFromCart = async (cartItemId: number) => {
    try {
      await cartAPI.removeItem(cartItemId)
      await refreshCart()
      toast.success('Removed from cart')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to remove item'
      toast.error(message)
    }
  }

  const clearCart = async () => {
    try {
      await cartAPI.clearCart()
      setItems([])
      setItemCount(0)
      setTotal(0)
      toast.success('Cart cleared')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to clear cart'
      toast.error(message)
    }
  }

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      total,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}