'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    
    // Calculate shipping (free over R1000)
    if (totalPrice >= 1000) {
      setShippingCost(0);
    } else {
      setShippingCost(99);
    }
  }, [totalPrice]);

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to continue with checkout');
      router.push('/login');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
  // Navigate to checkout page instead of creating order directly
  router.push('/checkout');
    setIsCheckingOut(true);
    
    try {
      // Create order in your Flask backend
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
          })),
          total_amount: totalPrice + shippingCost,
          shipping_cost: shippingCost,
        }),
      });

      if (response.ok) {
        const order = await response.json();
        toast.success('Order created successfully!');
        router.push(`/orders/${order.id}`);
      } else {
        toast.error('Failed to create order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Unable to process checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const subtotal = totalPrice;
  const tax = subtotal * 0.15; // 15% VAT
  const total = subtotal + shippingCost + tax;

  if (items.length === 0) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow">
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 border-b bg-gray-50 text-sm font-medium text-gray-700">
                <div className="md:col-span-6">Product</div>
                <div className="md:col-span-2 text-center">Price</div>
                <div className="md:col-span-2 text-center">Quantity</div>
                <div className="md:col-span-2 text-right">Total</div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {items.map((item) => (
                  <div key={item.id} className="px-4 py-6 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      {/* Product Info */}
                      <div className="flex flex-1 md:grid md:grid-cols-12 md:gap-4">
                        <div className="md:col-span-6">
                          <div className="flex space-x-4">
                            <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base font-medium text-gray-900">
                                {item.name}
                              </h3>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="mt-1 text-sm text-red-600 hover:text-red-800 transition"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="mt-4 md:mt-0 md:col-span-2">
                          <div className="flex justify-between md:justify-center">
                            <span className="text-sm text-gray-600 md:hidden">Price:</span>
                            <span className="text-sm font-medium text-gray-900">
                              R{item.price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Quantity */}
                        <div className="mt-4 md:mt-0 md:col-span-2">
                          <div className="flex items-center justify-between md:justify-center space-x-3">
                            <span className="text-sm text-gray-600 md:hidden">Quantity:</span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition"
                              >
                                -
                              </button>
                              <span className="w-12 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Total */}
                        <div className="mt-4 md:mt-0 md:col-span-2">
                          <div className="flex justify-between md:justify-end">
                            <span className="text-sm text-gray-600 md:hidden">Total:</span>
                            <span className="text-base font-semibold text-gray-900">
                              R{(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="px-4 py-4 border-t md:px-6">
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
              
              <div className="px-6 py-4 space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">R{subtotal.toLocaleString()}</span>
                </div>
                
                {/* Shipping */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <div>
                    {shippingCost === 0 ? (
                      <span className="text-green-600 font-medium">Free</span>
                    ) : (
                      <span className="font-medium text-gray-900">R{shippingCost.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                
                {/* Tax (VAT) */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (15% VAT)</span>
                  <span className="font-medium text-gray-900">R{tax.toLocaleString()}</span>
                </div>
                
                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="text-xl">R{total.toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Includes VAT and shipping
                  </p>
                </div>
                
                {/* Free Shipping Message */}
                {totalPrice < 1000 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-800">
                      Add R{(1000 - totalPrice).toLocaleString()} more to get free shipping
                    </p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-black h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(totalPrice / 1000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut || items.length === 0}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
                </button>
                
                {/* Payment Methods Note */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Secure payment powered by ShopSwift
                  </p>
                  <div className="flex justify-center space-x-2 mt-2">
                    <span className="text-xs text-gray-400">Visa</span>
                    <span className="text-xs text-gray-400">Mastercard</span>
                    <span className="text-xs text-gray-400">PayPal</span>
                    <span className="text-xs text-gray-400">EFT</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Trust Badges */}
            <div className="mt-4 bg-white rounded-lg shadow p-4">
              <div className="flex justify-around text-center">
                <div>
                  <svg className="mx-auto h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs text-gray-600 mt-1">Secure Checkout</p>
                </div>
                <div>
                  <svg className="mx-auto h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-xs text-gray-600 mt-1">Fast Delivery</p>
                </div>
                <div>
                  <svg className="mx-auto h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-xs text-gray-600 mt-1">Secure Returns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}