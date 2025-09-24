import type { User, Product, Transaction, Category } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  // If no image is found, return a default placeholder to avoid crashes
  return image || { 
    imageUrl: 'https://picsum.photos/seed/placeholder/400/400', 
    imageHint: 'placeholder' 
  };
};

export const users: User[] = [
  { id: 'user-1', name: '管理者ユーザー', email: 'admin@swiftpos.com', role: 'admin' },
  { id: 'user-2', name: '従業員ユーザー', email: 'employee@swiftpos.com', role: 'employee' },
];

export const products: Product[] = [
  { id: 'prod-1', name: '絶品コロッケ', price: 180, stock: 50, sku: 'SKU001', category: '揚げ物', imageUrl: getImage('croquette').imageUrl, imageHint: getImage('croquette').imageHint },
  { id: 'prod-2', name: 'ジューシー唐揚げ (100g)', price: 250, stock: 30, sku: 'SKU002', category: '揚げ物', imageUrl: getImage('karaage').imageUrl, imageHint: getImage('karaage').imageHint },
  { id: 'prod-3', name: '自家製メンチカツ', price: 220, stock: 40, sku: 'SKU003', category: '揚げ物', imageUrl: getImage('menchi-katsu').imageUrl, imageHint: getImage('menchi-katsu').imageHint },
  { id: 'prod-4', name: '彩り野菜のポテトサラダ', price: 320, stock: 25, sku: 'SKU004', category: 'サラダ', imageUrl: getImage('potato-salad').imageUrl, imageHint: getImage('potato-salad').imageHint },
  { id: 'prod-5', name: '日替わり幕の内弁当', price: 850, stock: 20, sku: 'SKU005', category: 'お弁当', imageUrl: getImage('bento-box').imageUrl, imageHint: getImage('bento-box').imageHint },
  { id: 'prod-6', name: 'のり弁当', price: 550, stock: 35, sku: 'SKU006', category: 'お弁当', imageUrl: getImage('nori-bento').imageUrl, imageHint: getImage('nori-bento').imageHint },
  { id: 'prod-7', name: '特製だし巻き卵', price: 480, stock: 15, sku: 'SKU007', category: '一品料理', imageUrl: getImage('dashimaki-tamago').imageUrl, imageHint: getImage('dashimaki-tamago').imageHint },
  { id: 'prod-8', name: 'ほうれん草の胡麻和え', price: 280, stock: 40, sku: 'SKU008', category: '一品料理', imageUrl: getImage('gomaae').imageUrl, imageHint: getImage('gomaae').imageHint },
  { id: 'prod-9', name: 'おにぎり (鮭)', price: 180, stock: 60, sku: 'SKU009', category: 'ご飯もの', imageUrl: getImage('onigiri-salmon').imageUrl, imageHint: getImage('onigiri-salmon').imageHint },
  { id: 'prod-10', name: 'おにぎり (梅)', price: 160, stock: 60, sku: 'SKU010', category: 'ご飯もの', imageUrl: getImage('onigiri-ume').imageUrl, imageHint: getImage('onigiri-ume').imageHint },
];

export const transactions: Transaction[] = [
  {
    id: 'txn-1',
    date: new Date(new Date().setHours(12, 30, 0, 0) - 1 * 24 * 60 * 60 * 1000),
    items: [
      { productId: 'prod-5', name: '日替わり幕の内弁当', quantity: 2, unitPrice: 850 },
      { productId: 'prod-4', name: '彩り野菜のポテトサラダ', quantity: 1, unitPrice: 320 },
    ],
    totalAmount: 2020.00,
    discount: null,
    finalAmount: 2182.00,
    paymentMethod: 'Credit Card',
    staffId: 'user-2',
  },
  {
    id: 'txn-2',
    date: new Date(new Date().setHours(18, 0, 0, 0) - 2 * 24 * 60 * 60 * 1000),
    items: [
      { productId: 'prod-1', name: '絶品コロッケ', quantity: 3, unitPrice: 180 },
      { productId: 'prod-2', name: 'ジューシー唐揚げ (100g)', quantity: 2, unitPrice: 250 },
      { productId: 'prod-3', name: '自家製メンチカツ', quantity: 2, unitPrice: 220 },
    ],
    totalAmount: 1480.00,
    discount: { type: 'percentage', value: 10 }, // 10% discount
    finalAmount: 1439.00, // (1480 * 0.9) * 1.08
    paymentMethod: 'Cash',
    staffId: 'user-2',
  },
  {
    id: 'txn-3',
    date: new Date(new Date().setHours(19, 15, 0, 0) - 3 * 24 * 60 * 60 * 1000),
    items: [
      { productId: 'prod-6', name: 'のり弁当', quantity: 1, unitPrice: 550 },
    ],
    totalAmount: 550.00,
    discount: { type: 'amount', value: 50 }, // 50 yen off
    finalAmount: 540.00, // (550 - 50) * 1.08
    paymentMethod: 'QR Code',
    staffId: 'user-2',
  },
    {
    id: 'txn-4',
    date: new Date(new Date().setHours(10, 5, 0, 0)),
    items: [
      { productId: 'prod-9', name: 'おにぎり (鮭)', quantity: 2, unitPrice: 180 },
      { productId: 'prod-10', name: 'おにぎり (梅)', quantity: 1, unitPrice: 160 },
    ],
    totalAmount: 520,
    discount: null,
    finalAmount: 562,
    paymentMethod: 'E-Money',
    staffId: 'user-1'
  },
  {
    id: 'txn-5',
    date: new Date(new Date().setHours(17, 45, 0, 0)),
    items: [
      { productId: 'prod-1', name: '絶品コロッケ', quantity: 5, unitPrice: 180 },
      { productId: 'prod-2', name: 'ジューシー唐揚げ (100g)', quantity: 3, unitPrice: 250 },
    ],
    totalAmount: 1650,
    discount: { type: 'percentage', value: 20 }, // 20% time sale
    finalAmount: 1426,
    paymentMethod: 'Credit Card',
    staffId: 'user-2'
  }
];
