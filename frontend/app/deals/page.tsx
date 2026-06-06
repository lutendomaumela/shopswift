'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { productsAPI } from '@/lib/api';
import type { Product } from '@/lib/types';
import toast from 'react-hot-toast';

interface Deal extends Product {
  discount_percent: number;
  original_price: number;
  ends_at: string;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{ [key: number]: string }>({});

  // Generate random deals from real products
  const generateDealsFromProducts = (products: Product[]): Deal[] => {
    // Take random 8 products or less if not enough
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, Math.min(8, products.length));
    
    return selectedProducts.map(product => {
      // Generate random discount between 10-40%
      const discountPercent = Math.floor(Math.random() * 30) + 10;
      const originalPrice = Math.round(product.price / (1 - discountPercent / 100));
      
      // Random end date between 1-7 days from now
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 7) + 1);
      
      return {
        ...product,
        original_price: originalPrice,
        discount_percent: discountPercent,
        ends_at: endDate.toISOString(),
      };
    });
  };

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true);
        
        // Fetch from REAL backend API
        const response = await productsAPI.getAll({ per_page: 50 });
        let products: Product[] = [];
        
        if (Array.isArray(response.data)) {
          products = response.data;
        } else if ((response.data as any).products) {
          products = (response.data as any).products;
        } else {
          products = response.data as any;
        }
        
        if (products.length === 0) {
          throw new Error('No products found');
        }
        
        // Check if we have cached deals
        const cachedDeals = localStorage.getItem('cachedDeals');
        const cachedTimestamp = localStorage.getItem('cachedDealsTimestamp');
        const now = Date.now();
        
        // Use cached deals if less than 1 hour old
        if (cachedDeals && cachedTimestamp && (now - parseInt(cachedTimestamp)) < 3600000) {
          setDeals(JSON.parse(cachedDeals));
        } else {
          // Generate new deals from real products
          const newDeals = generateDealsFromProducts(products);
          setDeals(newDeals);
          
          // Cache the deals
          localStorage.setItem('cachedDeals', JSON.stringify(newDeals));
          localStorage.setItem('cachedDealsTimestamp', now.toString());
        }
        
      } catch (error) {
        console.error('Error fetching deals:', error);
        toast.error('Failed to load deals');
        
        // Try to load cached deals
        const cachedDeals = localStorage.getItem('cachedDeals');
        if (cachedDeals) {
          setDeals(JSON.parse(cachedDeals));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  // Update countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft: { [key: number]: string } = {};
      deals.forEach(deal => {
        const end = new Date(deal.ends_at).getTime();
        const now = new Date().getTime();
        const diff = end - now;

        if (diff <= 0) {
          newTimeLeft[deal.id] = 'Expired';
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          if (days > 0) {
            newTimeLeft[deal.id] = `${days}d ${hours}h`;
          } else if (hours > 0) {
            newTimeLeft[deal.id] = `${hours}h ${minutes}m`;
          } else if (minutes > 0) {
            newTimeLeft[deal.id] = `${minutes}m ${seconds}s`;
          } else {
            newTimeLeft[deal.id] = `${seconds}s`;
          }
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [deals]);

  // Get unique categories from deals
  const categories = ['All Deals', ...new Set(deals.map(deal => deal.category_name || 'Electronics'))];
  const [selectedCategory, setSelectedCategory] = useState('All Deals');

  const filteredDeals = selectedCategory === 'All Deals' 
    ? deals 
    : deals.filter(deal => (deal.category_name || 'Electronics') === selectedCategory);

  // Sort deals by discount percentage (highest first)
  const sortedDeals = [...filteredDeals].sort((a, b) => b.discount_percent - a.discount_percent);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-8 mb-12 text-white">
          <h1 className="text-4xl font-bold mb-2">Limited Time Deals</h1>
          <p className="text-lg mb-4">Save big on premium electronics and accessories</p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
              <p className="text-sm font-medium">Up to 40% OFF</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
              <p className="text-sm font-medium">Limited stock available</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
              <p className="text-sm font-medium">Free shipping on orders over R1000</p>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-md transition whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Deals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : sortedDeals.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedDeals.map((deal) => (
                <div key={deal.id} className="group bg-white rounded-lg shadow hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <Link href={`/products/${deal.id}`}>
                    <div className="relative">
                      <div className="relative overflow-hidden bg-gray-100">
                        <img 
                          src={deal.image_url || 'https://via.placeholder.com/400x400?text=No+Image'} 
                          alt={deal.name} 
                          className="w-full h-56 object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      
                      {/* Discount Badge */}
                      <div className="absolute top-4 left-4 bg-red-600 text-white px-2 py-1 rounded-md text-sm font-bold">
                        -{deal.discount_percent}%
                      </div>
                      
                      {/* Hot Deal Badge for high discounts */}
                      {deal.discount_percent >= 30 && (
                        <div className="absolute top-4 right-4 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                          HOT DEAL
                        </div>
                      )}
                      
                      {/* Countdown Timer */}
                      {timeLeft[deal.id] && timeLeft[deal.id] !== 'Expired' && (
                        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur text-white px-2 py-1 rounded-md text-xs font-mono">
                          {timeLeft[deal.id]} left
                        </div>
                      )}
                      
                      {timeLeft[deal.id] === 'Expired' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-white text-black px-3 py-1 rounded-md text-sm font-bold">
                            Deal Expired
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="text-xs text-gray-500 mb-1">{deal.category_name || 'Electronics'}</div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-gray-600 transition line-clamp-2 min-h-[48px]">
                        {deal.name}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                        {deal.description?.substring(0, 70)}...
                      </p>
                      
                      <div className="mt-3">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-2xl font-bold text-red-600">
                            R{deal.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-400 line-through">
                            R{deal.original_price.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-green-600 font-medium">
                          Save R{(deal.original_price - deal.price).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between items-center">
                        {deal.stock > 0 ? (
                          <>
                            {deal.stock < 10 && (
                              <span className="text-xs text-orange-600 font-medium">
                                Only {deal.stock} left!
                              </span>
                            )}
                            {deal.stock >= 10 && (
                              <span className="text-xs text-gray-500">
                                In stock
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">Out of stock</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
            
            {/* Deal Stats */}
            <div className="mt-12 bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-600">{deals.length}</div>
                  <div className="text-sm text-gray-600">Active Deals</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">Up to 40%</div>
                  <div className="text-sm text-gray-600">Maximum Discount</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">Free Shipping</div>
                  <div className="text-sm text-gray-600">On orders over R1000</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">24/7 Support</div>
                  <div className="text-sm text-gray-600">Customer Service</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600">No active deals at the moment.</p>
            <Link 
              href="/products"
              className="inline-block mt-4 text-black hover:text-gray-600 underline"
            >
              Browse all products →
            </Link>
          </div>
        )}

        {/* Newsletter Signup */}
        <div className="mt-16 bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Early Access to Deals</h2>
          <p className="text-gray-600 mb-6">Subscribe to our newsletter for exclusive discounts and early access to sales</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const email = (e.currentTarget.elements[0] as HTMLInputElement).value;
            if (email) {
              localStorage.setItem('newsletterEmail', email);
              toast.success('Subscribed successfully!');
              (e.currentTarget.elements[0] as HTMLInputElement).value = '';
            }
          }} className="max-w-md mx-auto flex gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              required
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
            />
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
            >
              Subscribe
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-4">No spam, unsubscribe anytime.</p>
        </div>
      </div>
    </div>
  );
}