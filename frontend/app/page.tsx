'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/product/ProductCard';
import Hero from '@/components/ui/Hero';
import { fetchProductsFromFakeStore, ShopSwiftProduct } from '@/lib/fakestore';
import toast from 'react-hot-toast';

export default function Home() {
  const [products, setProducts] = useState<ShopSwiftProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch from FakeStore API
        const fetchedProducts = await fetchProductsFromFakeStore();
        setProducts(fetchedProducts);
        
        // Optional: Cache in localStorage for offline/dev
        localStorage.setItem('cachedProducts', JSON.stringify(fetchedProducts));
        
      } catch (error) {
        console.error('Error loading products:', error);
        setError('Failed to load products. Using cached data.');
        
        // Try to load from cache
        const cached = localStorage.getItem('cachedProducts');
        if (cached) {
          setProducts(JSON.parse(cached));
          toast('Using cached products', { icon: '📦' });
        } else {
          toast.error('Unable to load products. Please check your connection.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);
  
  const categories = ['Electronics', 'Fashion', 'Jewelery', 'Accessories'];
  
  return (
    <main>
      <Hero />
      
      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => window.location.href = `/products?category=${category}`}
              className="py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-center transition"
            >
              {category}
            </button>
          ))}
        </div>
      </section>
      
      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Featured Products</h2>
          <p className="text-gray-600">{products.length} products available</p>
        </div>
        
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}