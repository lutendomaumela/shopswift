'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_cost: number;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }>;
  shipping_address: {
    full_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to view your orders');
      router.push('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch orders');

        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
        // Mock orders for demo
        setOrders(mockOrders);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const getStatusText = (status: Order['status']) => {
    const texts = {
      pending: 'Pending Payment',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return texts[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-8 w-48 mb-8"></div>
            <div className="space-y-4">
              {[1,2,3].map((i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Orders</h1>
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
            <Link
              href="/products"
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
        
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Order Header */}
              <div className="p-6 border-b bg-gray-50">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order #{order.id}</p>
                    <p className="text-sm text-gray-600">
                      Placed on {new Date(order.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="text-sm text-black hover:text-gray-600 underline"
                    >
                      {selectedOrder?.id === order.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Order Summary */}
              <div className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-2xl font-bold text-black mt-1">
                      R{order.total_amount.toLocaleString()}
                    </p>
                  </div>
                  {order.status === 'pending' && (
                    <button className="px-4 py-2 border border-black rounded-md text-sm font-medium text-black hover:bg-gray-50">
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
              
              {/* Order Details (Expandable) */}
              {selectedOrder?.id === order.id && (
                <div className="border-t p-6 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 mb-4">Order Details</h3>
                  
                  {/* Items */}
                  <div className="space-y-4 mb-6">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-gray-900">R{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Shipping Address */}
                  {order.shipping_address && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
                      <p className="text-sm text-gray-600">
                        {order.shipping_address.full_name}<br />
                        {order.shipping_address.address_line1}<br />
                        {order.shipping_address.address_line2 && <>{order.shipping_address.address_line2}<br /></>}
                        {order.shipping_address.city}, {order.shipping_address.postal_code}<br />
                        {order.shipping_address.country}
                      </p>
                    </div>
                  )}
                  
                  {/* Order Summary */}
                  <div className="border-t pt-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span>R{(order.total_amount - order.shipping_cost).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping</span>
                        <span>R{order.shipping_cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Total</span>
                        <span className="text-lg">R{order.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="mt-6 flex gap-4">
                    {order.status === 'delivered' && (
                      <button className="px-4 py-2 border border-black rounded-md text-sm font-medium text-black hover:bg-gray-50">
                        Write a Review
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <button className="px-4 py-2 border border-red-600 rounded-md text-sm font-medium text-red-600 hover:bg-red-50">
                        Cancel Order
                      </button>
                    )}
                    <Link
                      href={`/orders/${order.id}/track`}
                      className="px-4 py-2 text-sm text-black hover:text-gray-600 underline"
                    >
                      Track Order →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mock orders for demo
const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    date: '2026-05-15',
    status: 'delivered',
    total_amount: 24998,
    shipping_cost: 99,
    items: [
      {
        id: 1,
        name: 'Samsung Galaxy S24 Ultra',
        quantity: 1,
        price: 21999,
        image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200',
      },
      {
        id: 3,
        name: 'Sony WH-1000XM5',
        quantity: 1,
        price: 7299,
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=200',
      },
    ],
    shipping_address: {
      full_name: 'John Doe',
      address_line1: '123 Main Street',
      city: 'Cape Town',
      postal_code: '8001',
      country: 'South Africa',
    },
  },
  {
    id: 'ORD-002',
    date: '2026-05-20',
    status: 'shipped',
    total_amount: 38500,
    shipping_cost: 0,
    items: [
      {
        id: 2,
        name: 'MacBook Pro M3 14"',
        quantity: 1,
        price: 38500,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200',
      },
    ],
    shipping_address: {
      full_name: 'John Doe',
      address_line1: '123 Main Street',
      city: 'Cape Town',
      postal_code: '8001',
      country: 'South Africa',
    },
  },
];