'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import type { Product } from '@/lib/types';
// Add missing import
import toast from 'react-hot-toast';
interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, loading } = useCart();
  const isOutOfStock = product.stock === 0;
  
  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error('Out of stock');
      return;
    }
    await addToCart(product.id, 1);
  };
  
  return (
    <div className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <Link href={`/products/${product.id}`}>
        <div className="relative overflow-hidden bg-gray-100">
          <img 
            src={product.image_url || 'https://via.placeholder.com/400x400?text=No+Image'} 
            alt={product.name}
            className="w-full h-64 object-contain group-hover:scale-105 transition-transform duration-300 p-4"
          />
        </div>
      </Link>
      
      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-lg hover:text-gray-600 transition line-clamp-2">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
          {product.description?.substring(0, 80)}...
        </p>
        
        <div className="mt-3">
          <span className="text-2xl font-bold">
            R{product.price.toLocaleString()}
          </span>
        </div>
        
        <div className="mt-3">
          {isOutOfStock ? (
            <span className="block w-full text-center py-2 text-red-500 font-medium text-sm border border-red-200 rounded-lg">
              Out of Stock
            </span>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={loading}
              className="w-full py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

