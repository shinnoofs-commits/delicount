import type { User, Product, Transaction, Category } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  return image || PlaceHolderImages[0];
};

export const users: User[] = [
  { id: 'user-1', name: 'Admin User', email: 'admin@swiftpos.com', role: 'admin' },
  { id: 'user-2', name: 'Employee User', email: 'employee@swiftpos.com', role: 'employee' },
];

export const products: Product[] = [
  { id: 'prod-1', name: 'Espresso Machine', price: 1200.00, stock: 5, sku: 'SKU001', category: 'Equipment', imageUrl: getImage('espresso-machine').imageUrl, imageHint: getImage('espresso-machine').imageHint },
  { id: 'prod-2', name: 'Coffee Beans 1kg', price: 45.00, stock: 50, sku: 'SKU002', category: 'Consumables', imageUrl: getImage('coffee-beans').imageUrl, imageHint: getImage('coffee-beans').imageHint },
  { id: 'prod-3', name: 'Milk Frothing Jug', price: 25.50, stock: 25, sku: 'SKU003', category: 'Accessories', imageUrl: getImage('milk-jug').imageUrl, imageHint: getImage('milk-jug').imageHint },
  { id: 'prod-4', name: 'Latte Art Pen', price: 15.00, stock: 40, sku: 'SKU004', category: 'Accessories', imageUrl: getImage('latte-art-pen').imageUrl, imageHint: getImage('latte-art-pen').imageHint },
  { id: 'prod-5', name: 'Ceramic Cup Set', price: 60.00, stock: 30, sku: 'SKU005', category: 'Accessories', imageUrl: getImage('cup-set').imageUrl, imageHint: getImage('cup-set').imageHint },
  { id: 'prod-6', name: 'Coffee Tamper', price: 35.00, stock: 20, sku: 'SKU006', category: 'Accessories', imageUrl: getImage('tamper').imageUrl, imageHint: getImage('tamper').imageHint },
  { id: 'prod-7', name: 'Croissant', price: 4.50, stock: 100, sku: 'SKU007', category: 'Pastries', imageUrl: getImage('croissant').imageUrl, imageHint: getImage('croissant').imageHint },
  { id: 'prod-8', name: 'Chocolate Muffin', price: 5.00, stock: 80, sku: 'SKU008', category: 'Pastries', imageUrl: getImage('muffin').imageUrl, imageHint: getImage('muffin').imageHint },
  { id: 'prod-9', name: 'Cold Brew Bottle', price: 8.00, stock: 60, sku: 'SKU009', category: 'Consumables', imageUrl: getImage('cold-brew').imageUrl, imageHint: getImage('cold-brew').imageHint },
];

export const transactions: Transaction[] = [
  {
    id: 'txn-1',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    items: [
      { productId: 'prod-2', name: 'Coffee Beans 1kg', quantity: 2, unitPrice: 45.00 },
      { productId: 'prod-7', name: 'Croissant', quantity: 4, unitPrice: 4.50 },
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
      { productId: 'prod-5', name: 'Ceramic Cup Set', quantity: 1, unitPrice: 60.00 },
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
      { productId: 'prod-9', name: 'Cold Brew Bottle', quantity: 5, unitPrice: 8.00 },
    ],
    totalAmount: 40.00,
    discount: null,
    finalAmount: 40.00,
    paymentMethod: 'QR Code',
    staffId: 'user-2',
  },
];
