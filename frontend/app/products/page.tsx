'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/product/ProductCard';
import { productsAPI } from '@/lib/api';
import type { Product } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name_asc' | 'name_desc'>('name_asc');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration mismatch - only render price numbers after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await productsAPI.getCategories();
        const cats = Array.isArray(response.data) ? response.data : (response.data as any).categories || [];
        setCategories([{ id: 0, name: 'All' }, ...cats]);
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback categories
        setCategories([
          { id: 0, name: 'All' },
          { id: 1, name: 'Electronics' },
          { id: 2, name: 'Appliances' },
          { id: 3, name: 'Gadgets' },
          { id: 4, name: 'Audio' },
        ]);
      }
    };
    loadCategories();
  }, []);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const params: any = { per_page: 100 };
        if (selectedCategoryId && selectedCategoryId !== 0) {
          params.category_id = selectedCategoryId;
        }
        
        const response = await productsAPI.getAll(params);
        let productsData = [];
        
        if (Array.isArray(response.data)) {
          productsData = response.data;
        } else if ((response.data as any).products) {
          productsData = (response.data as any).products;
        } else {
          productsData = response.data as any;
        }
        
        setProducts(productsData);
        
        // Set max price for filter
        if (productsData.length > 0) {
          const max = Math.max(...productsData.map((p: Product) => p.price));
          setMaxPrice(max);
          setPriceRange([0, max]);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, [selectedCategoryId]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...products];

    // Filter by price
    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Sort
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    setFilteredProducts(filtered);
  }, [products, priceRange, sortBy]);

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategoryId(categoryId === 0 ? null : categoryId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">All Products</h1>
        
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Category</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategoryId === (category.id === 0 ? null : category.id)}
                        onChange={() => handleCategoryChange(category.id)}
                        className="h-4 w-4 text-black focus:ring-black border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-600">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Price Range - Fix hydration mismatch */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Price Range (ZAR)</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    {isMounted ? (
                      <>
                        <span className="text-sm text-gray-600">R{priceRange[0].toLocaleString()}</span>
                        <span className="text-sm text-gray-600">R{priceRange[1].toLocaleString()}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-600">R0</span>
                        <span className="text-sm text-gray-600">R0</span>
                      </>
                    )}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    step="500"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
              
              {/* Sort By */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black text-sm"
                >
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Products Grid */}
          <div className="mt-8 lg:mt-0 lg:col-span-3">
            <div className="mb-6 flex justify-between items-center">
              <p className="text-gray-600">{filteredProducts.length} products found</p>
              {(selectedCategoryId || priceRange[1] < maxPrice) && (
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setPriceRange([0, maxPrice]);
                  }}
                  className="text-sm text-black hover:text-gray-600"
                >
                  Clear all filters
                </button>
              )}
            </div>
            
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
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600">No products found matching your criteria.</p>
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setPriceRange([0, maxPrice]);
                  }}
                  className="mt-4 text-black hover:text-gray-600 underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}