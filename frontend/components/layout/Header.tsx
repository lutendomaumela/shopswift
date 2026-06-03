'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ShoppingCartIcon, UserIcon, MagnifyingGlassIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const { totalItems } = useCart();
  
  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };
  
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
            <Link href="/products" className="text-gray-700 hover:text-black transition">
              Products
            </Link>
            <Link href="/orders" className="text-gray-700 hover:text-black transition">
              Orders
            </Link>
            <Link href="/deals" className="text-gray-700 hover:text-black transition">
              Deals
            </Link>
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
            <Link href="/cart" className="relative">
              <ShoppingCartIcon className="h-6 w-6 text-gray-700 hover:text-black transition" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {totalItems}
                </span>
              )}
            </Link>
            
            {user ? (
              <div className="relative group">
                <button className="flex items-center space-x-1">
                  <UserIcon className="h-6 w-6 text-gray-700 hover:text-black transition" />
                  <span className="text-sm text-gray-700 hidden md:inline">{user.name?.split(' ')[0]}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="hidden md:block">
                <UserIcon className="h-6 w-6 text-gray-700 hover:text-black transition" />
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              <Link 
                href="/products" 
                className="text-gray-700 hover:text-black px-2 py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Products
              </Link>
              <Link 
                href="/orders" 
                className="text-gray-700 hover:text-black px-2 py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Orders
              </Link>
              <Link 
                href="/deals" 
                className="text-gray-700 hover:text-black px-2 py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Deals
              </Link>
              
              {user ? (
                <>
                  <span className="text-gray-600 px-2 py-1">Hello, {user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-left text-gray-700 hover:text-black px-2 py-1"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="text-gray-700 hover:text-black px-2 py-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/register" 
                    className="text-gray-700 hover:text-black px-2 py-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
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
  );
}