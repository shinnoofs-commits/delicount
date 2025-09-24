export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
};

export type Category = '機器' | '消耗品' | 'アクセサリ' | 'ペイストリー';

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
  category: Category;
  imageUrl: string;
  imageHint: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Transaction = {
  id: string;
  date: Date;
  items: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  discount: {
    type: 'percentage' | 'amount';
    value: number;
  } | null;
  finalAmount: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'E-Money' | 'QR Code' | 'Points';
  staffId: string;
};
