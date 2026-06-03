'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { ShopSwiftProduct } from '@/lib/fakestore';

interface ProductCardProps {
  product: ShopSwiftProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const isOutOfStock = product.stock === 0;
  
  return (
    <div className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <Link href={`/products/${product.id}`}>
        <div className="relative overflow-hidden bg-gray-100">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-64 object-contain group-hover:scale-105 transition-transform duration-300 p-4"
          />
          {product.original_price && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold">
              SALE
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-lg hover:text-gray-600 transition line-clamp-2">
            {product.name}
          </h3>
        </Link>
        
        {/* Rating */}
        {product.rating && (
          <div className="flex items-center mt-1">
            <div className="flex text-yellow-400">
              {'★'.repeat(Math.floor(product.rating))}
              {'☆'.repeat(5 - Math.floor(product.rating))}
            </div>
            <span className="text-xs text-gray-500 ml-1">({product.reviews})</span>
          </div>
        )}
        
        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
          {product.description.substring(0, 80)}...
        </p>
        
        <div className="mt-3">
          {product.original_price ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-600">
                R{product.price.toLocaleString()}
              </span>
              <span className="text-sm text-gray-400 line-through">
                R{product.original_price.toLocaleString()}
              </span>
            </div>
          ) : (
            <span className="text-2xl font-bold">
              R{product.price.toLocaleString()}
            </span>
          )}
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          {isOutOfStock ? (
            <span className="text-red-500 font-medium text-sm">Out of Stock</span>
          ) : (
            <button
              onClick={() => addToCart(product)}
              className="w-full py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}