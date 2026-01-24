import type { User, Product, Transaction, Category } from './types';

export const users: User[] = [
  { id: 'user-1', name: '管理者ユーザー', email: 'admin@swiftpos.com', role: 'admin' },
  { id: 'user-2', name: '従業員ユーザー', email: 'employee@swiftpos.com', role: 'employee' },
];

const productDefinitions: Omit<Product, 'id' | 'pricePattern'>[] = [];

export const initialProducts: Product[] = productDefinitions.map((p, index) => ({
    ...p,
    id: `prod-${p.productCode || (index + 1)}-${new Date().getTime()}`,
    pricePattern: '',
}));


export const products: Product[] = initialProducts;

export const transactions: Transaction[] = [];

    