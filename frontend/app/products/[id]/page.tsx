'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';
import { fetchProductFromFakeStore, fetchProductsFromFakeStore, ShopSwiftProduct } from '@/lib/fakestore';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  stock: number;
  category: string;
  description: string;
  specifications?: {
    brand?: string;
    model?: string;
    warranty?: string;
    condition?: string;
  };
}

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
    const data = await fetchProductFromFakeStore(parseInt(params.id as string));
    setProduct(data);
    setSelectedImage(data.image);
    
    // Fetch related products
    const allProducts = await fetchProductsFromFakeStore();
    const related = allProducts
      .filter(p => p.category === data.category && p.id !== data.id)
      .slice(0, 4);
    setRelatedProducts(related);
    
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

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      toast.success(`Added ${quantity} × ${product.name} to cart`);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
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
          <Link href={`/products?category=${product.category}`} className="text-gray-500 hover:text-black">
            {product.category}
          </Link>
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
                  className="w-full h-96 object-cover"
                />
              </div>
              {product.image && (
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setSelectedImage(product.image)}
                    className={`border rounded-lg overflow-hidden ${
                      selectedImage === product.image ? 'border-black ring-2 ring-black' : 'border-gray-200'
                    }`}
                  >
                    <img src={product.image} alt={product.name} className="w-full h-20 object-cover" />
                  </button>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="mt-6 lg:mt-0">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{product.category}</span>
                  {product.stock > 0 ? (
                    <span className="text-sm text-green-600">In Stock ({product.stock} available)</span>
                  ) : (
                    <span className="text-sm text-red-600">Out of Stock</span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">{product.name}</h1>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-black">R{product.price.toLocaleString()}</span>
                  {product.price > 10000 && (
                    <span className="ml-2 text-sm text-gray-500 line-through">
                      R{(product.price * 1.2).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-b py-4 my-4">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>

              {/* Specifications */}
              {product.specifications && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Specifications</h3>
                  <div className="space-y-1 text-sm">
                    {product.specifications.brand && (
                      <p><span className="text-gray-600">Brand:</span> {product.specifications.brand}</p>
                    )}
                    {product.specifications.model && (
                      <p><span className="text-gray-600">Model:</span> {product.specifications.model}</p>
                    )}
                    {product.specifications.warranty && (
                      <p><span className="text-gray-600">Warranty:</span> {product.specifications.warranty}</p>
                    )}
                  </div>
                </div>
              )}

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
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                    <h3 className="font-medium text-gray-900">{relatedProduct.name}</h3>
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

