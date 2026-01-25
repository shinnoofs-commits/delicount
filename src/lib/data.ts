
import type { User, Product, Transaction, Category } from './types';

export const users: User[] = [
  { id: 'user-1', name: '管理者ユーザー', email: 'admin@swiftpos.com', role: 'admin' },
  { id: 'user-2', name: '従業員ユーザー', email: 'employee@swiftpos.com', role: 'employee' },
];

export const products: Product[] = [];
export const transactions: Transaction[] = [];
