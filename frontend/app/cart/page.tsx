'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { tokenStorage } from '@/lib/api';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, total, loading: cartLoading } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in using tokenStorage
    const token = tokenStorage.getAccessToken();
    setIsAuthenticated(!!token);
    
    // Calculate shipping (free over R1000)
    if (total >= 1000) {
      setShippingCost(0);
    } else {
      setShippingCost(99);
    }
  }, [total]);

  const handleQuantityChange = (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
    } else {
      updateQuantity(cartItemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Please login to continue with checkout');
      router.push('/login');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    router.push('/checkout');
  };

  const subtotal = total;
  const tax = subtotal * 0.15;
  const grandTotal = subtotal + shippingCost + tax;

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-8 w-48 mb-8"></div>
            <div className="bg-gray-200 h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Looks like you haven't added any items to your cart yet.</p>
            <Link
              href="/products"
              className="inline-flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart ({items.length} items)</h1>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 border-b bg-gray-50 text-sm font-medium text-gray-700">
                <div className="md:col-span-6">Product</div>
                <div className="md:col-span-2 text-center">Price</div>
                <div className="md:col-span-2 text-center">Quantity</div>
                <div className="md:col-span-2 text-right">Total</div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {items.map((item) => (
                  <div key={item.id} className="px-4 py-6 md:px-6">
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-4">
                      {/* Product Info */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                            {/* Placeholder image - using product name as fallback */}
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xs">
                              No img
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {item.name}
                            </h3>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="mt-2 text-sm text-red-600 hover:text-red-800 transition"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="w-24 text-center">
                        <span className="text-gray-600 md:hidden text-xs block">Price:</span>
                        <span className="font-medium">
                          R{item.price ? item.price.toLocaleString() : '0'}
                        </span>
                      </div>
                      
                      {/* Quantity */}
                      <div className="w-28 text-center">
                        <span className="text-gray-600 md:hidden text-xs block">Qty:</span>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {/* Total */}
                      <div className="w-28 text-right">
                        <span className="text-gray-600 md:hidden text-xs block">Total:</span>
                        <span className="font-semibold">
                          R{item.price ? (item.price * item.quantity).toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="px-6 py-4 border-t">
                <Link
                  href="/products"
                  className="text-sm text-black hover:text-gray-600 transition inline-flex items-center"
                >
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="mt-8 lg:mt-0 lg:col-span-4">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">R{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  {shippingCost === 0 ? (
                    <span className="text-green-600 font-medium">Free</span>
                  ) : (
                    <span className="font-medium">R{shippingCost.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (15% VAT)</span>
                  <span className="font-medium">R{tax.toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>R{grandTotal.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Includes VAT and shipping</p>
                </div>
                
                {total < 1000 && total > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-800">
                      Add R{(1000 - total).toLocaleString()} more for free shipping
                    </p>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black rounded-full transition-all"
                        style={{ width: `${Math.min((total / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut || items.length === 0}
                  className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}