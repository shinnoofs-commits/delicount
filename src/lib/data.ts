import type { User, Product, Transaction, Category } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  // If no image is found, return a default placeholder to avoid crashes
  return image || { 
    imageUrl: `https://picsum.photos/seed/${id}/400/400`, 
    imageHint: 'placeholder' 
  };
};

export const users: User[] = [
  { id: 'user-1', name: '管理者ユーザー', email: 'admin@swiftpos.com', role: 'admin' },
  { id: 'user-2', name: '従業員ユーザー', email: 'employee@swiftpos.com', role: 'employee' },
];

export const products: Product[] = [
  { id: 'prod-1', name: '絶品コロッケ', price: 180, costPrice: 80, productionQuantity: 50, productCode: '000001', category: '揚げ物', imageUrl: getImage('croquette').imageUrl, imageHint: getImage('croquette').imageHint },
  { id: 'prod-2', name: 'ジューシー唐揚げ (100g)', price: 250, costPrice: 120, productionQuantity: 30, productCode: '000002', category: '揚げ物', imageUrl: getImage('karaage').imageUrl, imageHint: getImage('karaage').imageHint },
  { id: 'prod-3', name: '自家製メンチカツ', price: 220, costPrice: 100, productionQuantity: 40, productCode: '000003', category: '揚げ物', imageUrl: getImage('menchi-katsu').imageUrl, imageHint: getImage('menchi-katsu').imageHint },
  { id: 'prod-4', name: '彩り野菜のポテトサラダ', price: 320, costPrice: 150, productionQuantity: 25, productCode: '000004', category: 'サラダ', imageUrl: getImage('potato-salad').imageUrl, imageHint: getImage('potato-salad').imageHint },
  { id: 'prod-5', name: '日替わり幕の内弁当', price: 850, costPrice: 450, productionQuantity: 20, productCode: '000005', category: 'お弁当', imageUrl: getImage('bento-box').imageUrl, imageHint: getImage('bento-box').imageHint },
  { id: 'prod-6', name: 'のり弁当', price: 550, costPrice: 280, productionQuantity: 35, productCode: '000006', category: 'お弁当', imageUrl: getImage('nori-bento').imageUrl, imageHint: getImage('nori-bento').imageHint },
  { id: 'prod-7', name: '特製だし巻き卵', price: 480, costPrice: 200, productionQuantity: 15, productCode: '000007', category: '一品料理', imageUrl: getImage('dashimaki-tamago').imageUrl, imageHint: getImage('dashimaki-tamago').imageHint },
  { id: 'prod-8', name: 'ほうれん草の胡麻和え', price: 280, costPrice: 130, productionQuantity: 40, productCode: '000008', category: '一品料理', imageUrl: getImage('gomaae').imageUrl, imageHint: getImage('gomaae').imageHint },
  { id: 'prod-9', name: 'おにぎり (鮭)', price: 180, costPrice: 70, productionQuantity: 60, productCode: '000009', category: 'ご飯もの', imageUrl: getImage('onigiri-salmon').imageUrl, imageHint: getImage('onigiri-salmon').imageHint },
  { id: 'prod-10', name: 'おにぎり (梅)', price: 160, costPrice: 60, productionQuantity: 60, productCode: '000010', category: 'ご飯もの', imageUrl: getImage('onigiri-ume').imageUrl, imageHint: getImage('onigiri-ume').imageHint },
];

export const transactions: Transaction[] = [
  {
    id: 'txn-1',
    date: new Date(new Date().setHours(12, 30, 0, 0) - 1 * 24 * 60 * 60 * 1000),
    items: [
      { productId: 'prod-5', name: '日替わり幕の内弁当', quantity: 2, unitPrice: 850, wasDiscounted: false },
      { productId: 'prod-4', name: '彩り野菜のポテトサラダ', quantity: 1, unitPrice: 320, wasDiscounted: false },
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
      { productId: 'prod-1', name: '絶品コロッケ', quantity: 3, unitPrice: 180, wasDiscounted: true },
      { productId: 'prod-2', name: 'ジューシー唐揚げ (100g)', quantity: 2, unitPrice: 250, wasDiscounted: true },
      { productId: 'prod-3', name: '自家製メンチカツ', quantity: 2, unitPrice: 220, wasDiscounted: true },
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
      { productId: 'prod-6', name: 'のり弁当', quantity: 1, unitPrice: 550, wasDiscounted: true },
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
      { productId: 'prod-9', name: 'おにぎり (鮭)', quantity: 2, unitPrice: 180, wasDiscounted: false },
      { productId: 'prod-10', name: 'おにぎり (梅)', quantity: 1, unitPrice: 160, wasDiscounted: false },
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
      { productId: 'prod-1', name: '絶品コロッケ', quantity: 5, unitPrice: 180, wasDiscounted: true },
      { productId: 'prod-2', name: 'ジューシー唐揚げ (100g)', quantity: 3, unitPrice: 250, wasDiscounted: true },
    ],
    totalAmount: 1650,
    discount: { type: 'percentage', value: 20 }, // 20% time sale
    finalAmount: 1426,
    paymentMethod: 'Credit Card',
    staffId: 'user-2'
  }
];
