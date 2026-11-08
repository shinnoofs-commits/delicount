
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
  isMaster?: boolean;
  categories?: string[];
}

export type AdminRole = {
  id: string; // This will be the user's UID
  name: string;
  email: string;
  role: 'admin';
}

export type Category = string;

export const defaultCategories = [
  '温惣菜',
  '冷惣菜',
  '弁当',
  'どんぶり',
  '揚げ物',
  'おこわ',
  '唐揚げ',
  'サラダ',
];

export type Material = {
  name: string;
  quantity: number;
}

export type Container = {
  name: string;
  quantity: number;
}

export type DailyProduction = {
  sun: number;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  holiday: number;
};

export type Product = {
  id: string;
  storeId: string;
  name: string;
  price: number;
  costPrice: number;
  productCode: string;
  category: string;
  pricePattern?: string;
  isFixedPrice?: boolean;
  materials?: Material[];
  containers?: Container[];
  dailyProductionSunny?: DailyProduction;
  dailyProductionRainy?: DailyProduction;
  isActive?: boolean;
};

export type ProductBox = {
  id: string; // The category string (e.g. "米飯")
  storeId: string;
  category: string;
  products: Product[];
  updatedAt: Date;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type TransactionItem = {
  productId: string;
  productCode?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  wasDiscounted: boolean;
  discountRate?: number;
  category?: string;
};

/** 
 * Transaction represents either a legacy sale or a "Stock Check" at a discount milestone.
 * For the new workflow, it stores the quantity of stock REMAINING when a discount starts.
 */
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
  entryType?: 'SALE' | 'STOCK_CHECK';
};

export type DailyTransactionBox = {
  id: string; // YYYY-MM-DD
  storeId: string;
  date: Date;
  transactions: Transaction[];
};

export type WasteItem = {
  productId: string;
  productCode?: string;
  name: string;
  quantity: number;
  costPrice: number;
  unitPrice?: number;
};

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export type WasteEntry = {
  id: string;
  storeId: string;
  userId: string;
  date: Date;
  items: WasteItem[];
  totalWasteCost: number;
  weather?: WeatherType;
};

export type DailyWasteBox = {
  id: string; // YYYY-MM-DD
  storeId: string;
  date: Date;
  entries: WasteEntry[];
};

export type ProductionItem = {
  productId: string;
  productCode?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
};

export type ProductionEntry = {
  id: string;
  storeId: string;
  userId: string;
  date: Date;
  items: ProductionItem[];
  totalProductionCount: number;
  entryType?: 'ADDITIONAL';
};
