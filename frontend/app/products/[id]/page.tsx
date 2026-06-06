'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { productsAPI } from '@/lib/api';
import type { Product } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const id = parseInt(params.id as string);
        const response = await productsAPI.getById(id);
        const productData = response.data;
        setProduct(productData);
        setSelectedImage(productData.image_url || 'https://via.placeholder.com/600x600?text=No+Image');
        
        // Fetch related products (same category)
        if (productData.category_id) {
          const relatedResponse = await productsAPI.getAll({ category_id: productData.category_id, per_page: 5 });
          let relatedData = [];
          if (Array.isArray(relatedResponse.data)) {
            relatedData = relatedResponse.data;
          } else if ((relatedResponse.data as any).products) {
            relatedData = (relatedResponse.data as any).products;
          }
          setRelatedProducts(relatedData.filter((p: { id: number; }) => p.id !== productData.id).slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Product not found');
        router.push('/products');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProduct();
    }
  }, [params.id, router]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 10)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (product) {
      await addToCart(product.id, quantity);
      toast.success(`Added ${quantity} × ${product.name} to cart`);
    }
  };

  const handleBuyNow = async () => {
    if (product) {
      await addToCart(product.id, quantity);
      router.push('/cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-96 rounded-lg mb-8"></div>
            <div className="bg-gray-200 h-8 w-3/4 mb-4"></div>
            <div className="bg-gray-200 h-4 w-1/2 mb-2"></div>
            <div className="bg-gray-200 h-4 w-full mb-2"></div>
            <div className="bg-gray-200 h-4 w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Product not found</h1>
          <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
          <Link href="/products" className="text-black hover:text-gray-600 underline">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8 text-sm">
          <Link href="/" className="text-gray-500 hover:text-black">Home</Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link href="/products" className="text-gray-500 hover:text-black">Products</Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 p-6 lg:p-8">
            {/* Product Images */}
            <div>
              <div className="bg-gray-100 rounded-lg overflow-hidden mb-4">
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-96 object-contain p-4"
                />
              </div>
            </div>

            {/* Product Info */}
            <div className="mt-6 lg:mt-0">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{product.brand || 'General'}</span>
                  {product.stock > 0 ? (
                    <span className="text-sm text-green-600">In Stock ({product.stock} available)</span>
                  ) : (
                    <span className="text-sm text-red-600">Out of Stock</span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">{product.name}</h1>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-black">R{product.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-b py-4 my-4">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>

              {/* Specifications */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Specifications</h3>
                <div className="space-y-1 text-sm">
                  {product.brand && (
                    <p><span className="text-gray-600">Brand:</span> {product.brand}</p>
                  )}
                  {product.sku && (
                    <p><span className="text-gray-600">SKU:</span> {product.sku}</p>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              {product.stock > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-500 ml-2">{product.stock} available</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="w-full py-3 px-4 border border-black rounded-md text-base font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Buy Now
                </button>
              </div>

              {/* Shipping Info */}
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 text-sm">
                  <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Free shipping on orders over R1000</span>
                </div>
                <div className="flex items-center space-x-3 text-sm mt-2">
                  <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-gray-600">2-year warranty on all products</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link key={relatedProduct.id} href={`/products/${relatedProduct.id}`}>
                  <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-4">
                    <img
                      src={relatedProduct.image_url || 'https://via.placeholder.com/200x200?text=No+Image'}
                      alt={relatedProduct.name}
                      className="w-full h-48 object-contain rounded-lg mb-3"
                    />
                    <h3 className="font-medium text-gray-900 line-clamp-2">{relatedProduct.name}</h3>
                    <p className="text-lg font-bold text-black mt-1">R{relatedProduct.price.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}