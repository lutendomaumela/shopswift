// lib/api.ts
import axios from 'axios'
import type { User, Product, Category, CartItem, CartResponse, OrderItem, Order, PaginatedProducts, Cart } from './types'
// ── Token helpers (SSR-safe) ──────────────────────────────────────────────────
// WHY: Next.js 15 renders on the server where localStorage doesn't exist.
// These check typeof window first so they never crash during SSR.
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('access_token')
  },
  setAccessToken: (token: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem('access_token', token)
  },
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem('user')
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  },
  setUser: (user: User): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem('user', JSON.stringify(user))
  },
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },
}



// ── Axios instance ────────────────────────────────────────────────────────────
// In development:  set NEXT_PUBLIC_API_URL=http://localhost:5000/api in .env.local
// In production:   set NEXT_PUBLIC_API_URL=http://16.28.27.6/api in .env.local
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor ───────────────────────────────────────────────────────
// Adds JWT token to every outgoing request — SSR-safe via tokenStorage helper
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ──────────────────────────────────────────────────────
// If server returns 401 — token expired — clear storage and go to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clear()
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login')
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (fullName: string, email: string, password: string, phoneNumber?: string, address?: string) =>
    api.post('/auth/register', { full_name: fullName, email, password, phone_number: phoneNumber, address }),

  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: User }>('/auth/login', { email, password }),

  getCurrentUser: () =>
    api.get<{ user: User } | User>('/auth/me'),

  updateProfile: (data: { full_name?: string; phone_number?: string; address?: string; current_password?: string; new_password?: string }) =>
    api.put('/auth/me', data),
}

// ── Products API ──────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: (params?: { category_id?: number; search?: string; min_price?: number; max_price?: number; in_stock?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedProducts | Product[]>('/products', { params }),

  getById: (id: number) =>
    api.get<Product>(`/products/${id}`),

  getCategories: () =>
    api.get<Category[] | { categories: Category[] }>('/categories'),

  getDeals: () =>
    api.get<Product[]>('/products/deals'),
}

// ── Cart API ──────────────────────────────────────────────────────────────────
export const cartAPI = {
  getCart: ()                                    => api.get<Cart>('/cart'),
  addItem: (productId: number, quantity = 1)     => api.post('/cart', { product_id: productId, quantity }),
  updateItem: (cartItemId: number, quantity: number) => api.put(`/cart/${cartItemId}`, { quantity }),
  removeItem: (cartItemId: number)               => api.delete(`/cart/${cartItemId}`),
  clearCart: ()                                  => api.delete('/cart'),
}

// ── Orders API ────────────────────────────────────────────────────────────────
export const ordersAPI = {
  create: (shippingAddress?: string, notes?: string) =>
    api.post<{ message: string; order: Order }>('/orders', { shipping_address: shippingAddress, notes }),

  getAll: (page?: number) =>
    api.get('/orders', { params: { page } }),

  getById: (id: number) =>
    api.get<Order>(`/orders/${id}`),

  cancel: (id: number) =>
    api.post(`/orders/${id}/cancel`),
}

export default api