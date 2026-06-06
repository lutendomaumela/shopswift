// frontend/lib/types.ts

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number?: string;
  address?: string;
  is_active: boolean;
  is_admin?: boolean;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category_id: number;
  category_name?: string;
  brand?: string;
  sku?: string;
  stock: number;
  image_url: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  description?: string;
}

export interface CartItem {
  id: number;           // This is the cart item ID (used for updates/deletes)
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

export interface CartResponse {
  items: CartItem[];
  item_count: number;
  total: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  image_url?: string;
  quantity: number;
  price_at_time: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number?: string;
  user_id: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: string;
  shipping_cost?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  items: OrderItem[];
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
}

export interface Cart extends CartResponse {}

// Helper type for API responses that might be wrapped
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}