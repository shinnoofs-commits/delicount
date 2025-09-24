import type { User, Product, Transaction, Category } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  return image || PlaceHolderImages[0];
};

export const users: User[] = [
  { id: 'user-1', name: '管理者ユーザー', email: 'admin@swiftpos.com', role: 'admin' },
  { id: 'user-2', name: '従業員ユーザー', email: 'employee@swiftpos.com', role: 'employee' },
];

export const products: Product[] = [
  { id: 'prod-1', name: 'エスプレッソマシン', price: 1200.00, stock: 5, sku: 'SKU001', category: '機器', imageUrl: getImage('espresso-machine').imageUrl, imageHint: getImage('espresso-machine').imageHint },
  { id: 'prod-2', name: 'コーヒー豆 1kg', price: 45.00, stock: 50, sku: 'SKU002', category: '消耗品', imageUrl: getImage('coffee-beans').imageUrl, imageHint: getImage('coffee-beans').imageHint },
  { id: 'prod-3', name: 'ミルク泡立てジャグ', price: 25.50, stock: 25, sku: 'SKU003', category: 'アクセサリ', imageUrl: getImage('milk-jug').imageUrl, imageHint: getImage('milk-jug').imageHint },
  { id: 'prod-4', name: 'ラテアートペン', price: 15.00, stock: 40, sku: 'SKU004', category: 'アクセサリ', imageUrl: getImage('latte-art-pen').imageUrl, imageHint: getImage('latte-art-pen').imageHint },
  { id: 'prod-5', name: 'セラミックカップセット', price: 60.00, stock: 30, sku: 'SKU005', category: 'アクセサリ', imageUrl: getImage('cup-set').imageUrl, imageHint: getImage('cup-set').imageHint },
  { id: 'prod-6', name: 'コーヒータンパー', price: 35.00, stock: 20, sku: 'SKU006', category: 'アクセサリ', imageUrl: getImage('tamper').imageUrl, imageHint: getImage('tamper').imageHint },
  { id: 'prod-7', name: 'クロワッサン', price: 4.50, stock: 100, sku: 'SKU007', category: 'ペイストリー', imageUrl: getImage('croissant').imageUrl, imageHint: getImage('croissant').imageHint },
  { id: 'prod-8', name: 'チョコレートマフィン', price: 5.00, stock: 80, sku: 'SKU008', category: 'ペイストリー', imageUrl: getImage('muffin').imageUrl, imageHint: getImage('muffin').imageHint },
  { id: 'prod-9', name: 'コールドブリューボトル', price: 8.00, stock: 60, sku: 'SKU009', category: '消耗品', imageUrl: getImage('cold-brew').imageUrl, imageHint: getImage('cold-brew').imageHint },
];

export const transactions: Transaction[] = [
  {
    id: 'txn-1',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    items: [
      { productId: 'prod-2', name: 'コーヒー豆 1kg', quantity: 2, unitPrice: 45.00 },
      { productId: 'prod-7', name: 'クロワッсан', quantity: 4, unitPrice: 4.50 },
    ],
    totalAmount: 108.00,
    discount: null,
    finalAmount: 108.00,
    paymentMethod: 'Credit Card',
    staffId: 'user-2',
  },
  {
    id: 'txn-2',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    items: [
      { productId: 'prod-5', name: 'セラミックカップセット', quantity: 1, unitPrice: 60.00 },
    ],
    totalAmount: 60.00,
    discount: { type: 'amount', value: 10 },
    finalAmount: 50.00,
    paymentMethod: 'Cash',
    staffId: 'user-2',
  },
  {
    id: 'txn-3',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    items: [
      { productId: 'prod-9', name: 'コールドブリューボトル', quantity: 5, unitPrice: 8.00 },
    ],
    totalAmount: 40.00,
    discount: null,
    finalAmount: 40.00,
    paymentMethod: 'QR Code',
    staffId: 'user-2',
  },
];
