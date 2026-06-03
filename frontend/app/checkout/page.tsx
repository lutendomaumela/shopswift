'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  province: string;
}

interface PaymentDetails {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    province: 'Gauteng',
  });
  
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft' | 'cod'>('card');

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsAuthenticated(true);
      const userData = JSON.parse(user);
      setShippingDetails(prev => ({
        ...prev,
        fullName: userData.name || '',
        email: userData.email || '',
      }));
    }
    
    // Redirect if cart is empty
    if (items.length === 0) {
      toast.error('Your cart is empty');
      router.push('/cart');
    }
  }, [items.length, router]);

  const subtotal = totalPrice;
  const shippingCost = subtotal >= 1000 ? 0 : 99;
  const tax = subtotal * 0.15;
  const total = subtotal + shippingCost + tax;

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!shippingDetails.fullName || !shippingDetails.email || !shippingDetails.addressLine1 || !shippingDetails.city) {
      toast.error('Please fill in all required fields');
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'card') {
      if (!paymentDetails.cardNumber || !paymentDetails.cardName || !paymentDetails.expiryDate || !paymentDetails.cvv) {
        toast.error('Please fill in all card details');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Create order in backend
      const orderData = {
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        shipping_details: shippingDetails,
        payment_method: paymentMethod,
        subtotal: subtotal,
        shipping_cost: shippingCost,
        tax: tax,
        total_amount: total,
      };
      
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(orderData),
      });
      
      if (response.ok) {
        const order = await response.json();
        clearCart();
        toast.success('Order placed successfully!');
        router.push(`/orders/${order.id}`);
      } else {
        // Mock success for demo
        toast.success('Order placed successfully! (Demo)');
        clearCart();
        router.push('/orders');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // Mock success for demo
      toast.success('Order placed successfully! (Demo)');
      clearCart();
      router.push('/orders');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <div className={`rounded-full h-10 w-10 flex items-center justify-center ${step >= 1 ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'}`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-black' : 'bg-gray-300'}`}></div>
              <div className={`rounded-full h-10 w-10 flex items-center justify-center ${step >= 2 ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'}`}>
                2
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center mt-2">
            <span className="text-sm font-medium mx-8">Shipping</span>
            <span className="text-sm font-medium mx-8">Payment</span>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Main Checkout Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-lg shadow p-6">
              {step === 1 && (
                <form onSubmit={handleShippingSubmit}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Information</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingDetails.fullName}
                        onChange={(e) => setShippingDetails({ ...shippingDetails, fullName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={shippingDetails.email}
                          onChange={(e) => setShippingDetails({ ...shippingDetails, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={shippingDetails.phone}
                          onChange={(e) => setShippingDetails({ ...shippingDetails, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingDetails.addressLine1}
                        onChange={(e) => setShippingDetails({ ...shippingDetails, addressLine1: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        value={shippingDetails.addressLine2}
                        onChange={(e) => setShippingDetails({ ...shippingDetails, addressLine2: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingDetails.city}
                          onChange={(e) => setShippingDetails({ ...shippingDetails, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingDetails.postalCode}
                          onChange={(e) => setShippingDetails({ ...shippingDetails, postalCode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Province *
                      </label>
                      <select
                        required
                        value={shippingDetails.province}
                        onChange={(e) => setShippingDetails({ ...shippingDetails, province: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                      >
                        <option>Gauteng</option>
                        <option>Western Cape</option>
                        <option>KwaZulu-Natal</option>
                        <option>Eastern Cape</option>
                        <option>Free State</option>
                        <option>Limpopo</option>
                        <option>Mpumalanga</option>
                        <option>North West</option>
                        <option>Northern Cape</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </form>
              )}
              
              {step === 2 && (
                <form onSubmit={handlePaymentSubmit}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>
                  
                  {/* Payment Method Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`px-4 py-2 border rounded-md transition ${
                          paymentMethod === 'card' 
                            ? 'border-black bg-black text-white' 
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Credit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('eft')}
                        className={`px-4 py-2 border rounded-md transition ${
                          paymentMethod === 'eft' 
                            ? 'border-black bg-black text-white' 
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        EFT
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`px-4 py-2 border rounded-md transition ${
                          paymentMethod === 'cod' 
                            ? 'border-black bg-black text-white' 
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Cash on Delivery
                      </button>
                    </div>
                  </div>
                  
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={paymentDetails.cardNumber}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cardholder Name *
                        </label>
                        <input
                          type="text"
                          value={paymentDetails.cardName}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, cardName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiry Date *
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={paymentDetails.expiryDate}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, expiryDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CVV *
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            value={paymentDetails.cvv}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {paymentMethod === 'eft' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <p className="text-sm text-blue-800">
                        You will be redirected to your banking app to complete the payment after placing your order.
                      </p>
                    </div>
                  )}
                  
                  {paymentMethod === 'cod' && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <p className="text-sm text-green-800">
                        Pay with cash when your order is delivered. Additional R50 fee applies.
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                      {loading ? 'Processing...' : `Place Order • R${total.toLocaleString()}`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-5 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium">R{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>R{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>{shippingCost === 0 ? 'Free' : `R${shippingCost.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (15% VAT)</span>
                  <span>R{tax.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>R{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}