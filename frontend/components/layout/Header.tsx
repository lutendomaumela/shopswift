'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { ShoppingCartIcon, UserIcon, MagnifyingGlassIcon, Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { user, logout, isAuthenticated } = useAuth()
  const { itemCount } = useCart()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleOrdersClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault()
      router.push('/login')
    }
  }

  const handleLogout = async () => {
    setIsUserDropdownOpen(false)
    setIsMenuOpen(false)
    await logout()
  }

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6 text-gray-700" />
            ) : (
              <Bars3Icon className="h-6 w-6 text-gray-700" />
            )}
          </button>

          {/* Logo */}
          <Link href="/" className="text-2xl font-bold tracking-tight">
            ShopSwift
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="/products" className="text-gray-700 hover:text-black transition">Products</Link>
            {isAuthenticated ? (
              <Link href="/orders" className="text-gray-700 hover:text-black transition">Orders</Link>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="text-gray-700 hover:text-black transition cursor-pointer"
              >
                Orders
              </button>
            )}
            <Link href="/deals" className="text-gray-700 hover:text-black transition">Deals</Link>
          </div>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button type="submit" className="absolute right-3 top-2.5">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          </form>

          {/* Icons */}
          <div className="flex items-center space-x-4">

            {/* Cart */}
            <Link href="/cart" className="relative">
              <ShoppingCartIcon className="h-6 w-6 text-gray-700 hover:text-black transition" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* User Dropdown - Click to open, not hover */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-100 transition"
                >
                  <UserIcon className="h-6 w-6 text-gray-700" />
                  <span className="text-sm text-gray-700 hidden md:inline">
                    {user.full_name?.split(' ')[0]}
                  </span>
                  <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 border border-gray-100 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/orders"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Orders
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 border-t border-gray-100 mt-1"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/login" className="text-sm text-gray-700 hover:text-black transition">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-black text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              <Link href="/products" className="text-gray-700 hover:text-black px-2 py-1" onClick={() => setIsMenuOpen(false)}>
                Products
              </Link>
              {isAuthenticated ? (
                <Link href="/orders" className="text-gray-700 hover:text-black px-2 py-1" onClick={() => setIsMenuOpen(false)}>
                  Orders
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    router.push('/login')
                  }}
                  className="text-left text-gray-700 hover:text-black px-2 py-1"
                >
                  Orders
                </button>
              )}
              <Link href="/deals" className="text-gray-700 hover:text-black px-2 py-1" onClick={() => setIsMenuOpen(false)}>
                Deals
              </Link>

              {isAuthenticated && user ? (
                <>
                  <div className="border-t pt-3 mt-2">
                    <div className="px-2 py-1">
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link href="/orders" className="text-gray-700 hover:text-black px-2 py-1" onClick={() => setIsMenuOpen(false)}>
                    My Orders
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-left text-red-600 hover:text-red-700 px-2 py-1"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-700 hover:text-black px-2 py-1" onClick={() => setIsMenuOpen(false)}>
                    Login
                  </Link>
                  <Link href="/register" className="text-gray-700 hover:text-black px-2 py-1" onClick={() => setIsMenuOpen(false)}>
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Search Bar - Mobile */}
            <form onSubmit={handleSearch} className="mt-4">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button type="submit" className="absolute right-3 top-2.5">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </form>
          </div>
        )}
      </nav>
    </header>
  )
}