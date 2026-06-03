// lib/fakestore.ts
export interface FakeStoreProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

export interface ShopSwiftProduct {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  image: string;
  stock: number;
  category: string;
  description: string;
  rating?: number;
  reviews?: number;
  specifications?: {
    brand?: string;
    warranty?: string;
    condition?: string;
  };
}

// Map FakeStore categories to ShopSwift categories
const categoryMapping: { [key: string]: string } = {
  "men's clothing": 'Fashion',
  "women's clothing": 'Fashion',
  "jewelery": 'Accessories',
  "electronics": 'Electronics',
};

// Transform FakeStore product to ShopSwift format
export const transformToShopSwift = (product: FakeStoreProduct): ShopSwiftProduct => {
  // Map category
  const shopCategory = categoryMapping[product.category] || product.category;
  
  // Generate realistic stock (1-50 units)
  const stock = Math.floor(Math.random() * 50) + 1;
  
  // Add discount for some products (20% chance)
  const hasDiscount = Math.random() < 0.2;
  const original_price = hasDiscount ? Math.round(product.price * 1.15) : undefined;
  const finalPrice = hasDiscount ? product.price : product.price;
  
  // Convert USD to ZAR (approximate conversion)
  const zarPrice = Math.round(finalPrice * 18.5);
  const zarOriginalPrice = original_price ? Math.round(original_price * 18.5) : undefined;
  
  // Generate brand from title
  let brand = '';
  if (product.title.includes('Samsung')) brand = 'Samsung';
  else if (product.title.includes('Apple') || product.title.includes('iPhone')) brand = 'Apple';
  else if (product.title.includes('Sony')) brand = 'Sony';
  else if (product.title.includes('LG')) brand = 'LG';
  else if (product.title.includes('Dell')) brand = 'Dell';
  else if (product.title.includes('HP')) brand = 'HP';
  else brand = 'Generic';
  
  return {
    id: product.id,
    name: product.title.length > 60 ? product.title.substring(0, 57) + '...' : product.title,
    price: zarPrice,
    original_price: zarOriginalPrice,
    image: product.image,
    stock: stock,
    category: shopCategory,
    description: product.description,
    rating: product.rating.rate,
    reviews: product.rating.count,
    specifications: {
      brand: brand,
      warranty: '1 year manufacturer warranty',
      condition: 'New',
    },
  };
};

// Fetch all products from FakeStore
export const fetchProductsFromFakeStore = async (): Promise<ShopSwiftProduct[]> => {
  try {
    const response = await fetch('https://fakestoreapi.com/products');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const products: FakeStoreProduct[] = await response.json();
    return products.map(transformToShopSwift);
  } catch (error) {
    console.error('Error fetching from FakeStore:', error);
    throw error;
  }
};

// Fetch single product
export const fetchProductFromFakeStore = async (id: number): Promise<ShopSwiftProduct> => {
  try {
    const response = await fetch(`https://fakestoreapi.com/products/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const product: FakeStoreProduct = await response.json();
    return transformToShopSwift(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

// Fetch products by category
export const fetchProductsByCategory = async (category: string): Promise<ShopSwiftProduct[]> => {
  try {
    const response = await fetch(`https://fakestoreapi.com/products/category/${category}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const products: FakeStoreProduct[] = await response.json();
    return products.map(transformToShopSwift);
  } catch (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
};

// Get all categories
export const fetchCategories = async (): Promise<string[]> => {
  try {
    const response = await fetch('https://fakestoreapi.com/products/categories');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const categories: string[] = await response.json();
    // Map categories to ShopSwift categories
    return categories.map(cat => categoryMapping[cat] || cat);
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};