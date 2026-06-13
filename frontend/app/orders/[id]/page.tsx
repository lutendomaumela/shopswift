'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersAPI, tokenStorage } from '@/lib/api';
import type { Order } from '@/lib/types';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      toast.error('Please login to view order details');
      router.push('/login');
      return;
    }

    const fetchOrder = async () => {
      try {
        const orderId = parseInt(params.id as string);
        console.log('Fetching order ID:', orderId);
        
        const response = await ordersAPI.getById(orderId);
        console.log('Order API response:', response.data);
        
        // The response.data is the Order object directly from backend to_dict()
        setOrder(response.data);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching order:', error);
        const errorMsg = error.response?.data?.error || 'Failed to load order details';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchOrder();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-8 w-48 mb-8"></div>
            <div className="bg-gray-200 h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h1 className="text-xl font-bold text-red-800 mb-2">Unable to Load Order</h1>
            <p className="text-red-600">{error || 'Order not found'}</p>
          </div>
          <Link href="/orders" className="inline-block px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800">
            View All Orders
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Pending Payment',
      paid: 'Payment Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return texts[status] || status;
  };

  // Calculate amounts safely
  const shippingCost = 99;
  const subtotal = order.total_amount - shippingCost;
  const tax = subtotal * 0.15;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="text-gray-600 mt-2">
            Thank you for your purchase. Your order has been received.
          </p>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-gray-900">Order #{order.id}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
          </div>

          <div className="p-6">
            {/* Order Items */}
            <h3 className="font-medium text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-4 mb-6">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-medium">R{(item.price_at_time * item.quantity).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No items found</p>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>R{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>R{shippingCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (15% VAT)</span>
                  <span>R{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>R{order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="border-t mt-4 pt-4">
                <h3 className="font-medium text-gray-900 mb-2">Shipping Address</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{order.shipping_address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/products"
            className="text-center px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
          >
            Continue Shopping
          </Link>
          <Link
            href="/orders"
            className="text-center px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
          >
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
}