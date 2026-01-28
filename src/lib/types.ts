
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
};

export type Store = {
  id: string;
  name: string;
  email: string;
  userId: string;
  isAdmin?: boolean;
}

export type AdminRole = {
  id: string; // This will be the user's UID
  name: string;
  email: string;
  role: 'admin';
}

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
  storeId: string;
  name: string;
  price: number;
  costPrice: number;
  productCode: string;
  category: string;
  pricePattern?: string;
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
  storeId: string;
  date: Date;
  items: TransactionItem[];
  totalAmount: number;
  discount: {
    type: 'percentage' | 'amount';
    value: number;
  } | null;
  finalAmount: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'E-Money' | 'QR Code' | 'Points';
};

export type WasteItem = {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
};

export type WasteEntry = {
  id: string;
  storeId: string;
  userId: string;
  date: Date;
  items: WasteItem[];
  totalWasteCost: number;
};
