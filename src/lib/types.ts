
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
};

export type Category = string;

export type Material = {
  name: string;
  quantity: number;
}

export type Container = {
  name: string;
  quantity: number;
}

export type Product = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  productionQuantity: number;
  productCode: string;
  category: Category;
  materials?: Material[];
  containers?: Container[];
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type TransactionItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  wasDiscounted: boolean;
};

export type Transaction = {
  id: string;
  date: Date;
  items: TransactionItem[];
  totalAmount: number;
  discount: {
    type: 'percentage' | 'amount';
    value: number;
  } | null;
  finalAmount: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'E-Money' | 'QR Code' | 'Points';
  staffId: string;
};
