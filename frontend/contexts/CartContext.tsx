'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pendingToast, setPendingToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);
  
  // Show toast outside of render cycle
  useEffect(() => {
    if (pendingToast) {
      if (pendingToast.type === 'success') {
        toast.success(pendingToast.message);
      } else {
        toast.error(pendingToast.message);
      }
      setPendingToast(null);
    }
  }, [pendingToast]);
  
  const addToCart = useCallback((product: any) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === product.id);
      
      if (existingItem) {
        // Schedule toast for after render
        setPendingToast({ 
          message: `Added another ${product.name} to cart`, 
          type: 'success' 
        });
        
        return currentItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Schedule toast for after render
        setPendingToast({ 
          message: `${product.name} added to cart`, 
          type: 'success' 
        });
        
        return [...currentItems, { 
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
          stock: product.stock
        }];
      }
    });
  }, []);
  
  const removeFromCart = useCallback((productId: number) => {
    const item = items.find(i => i.id === productId);
    setItems(currentItems => currentItems.filter(item => item.id !== productId));
    if (item) {
      // Use setTimeout to ensure toast shows after render
      setTimeout(() => {
        toast.success(`${item.name} removed from cart`);
      }, 0);
    }
  }, [items]);
  
  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);
  
  const clearCart = useCallback(() => {
    setItems([]);
    setTimeout(() => {
      toast.success('Cart cleared');
    }, 0);
  }, []);
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}