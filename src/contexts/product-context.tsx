
'use client';

import type { Product } from '@/lib/types';
import { products as initialProducts } from '@/lib/data';
import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

interface ProductContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  deleteProducts: (productIds: string[]) => void;
  getProductById: (productId: string) => Product | undefined;
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    setProducts(prevProducts => [...prevProducts, { ...product, id: `prod-${Date.now()}` }]);
  }, []);

  const updateProduct = useCallback((productData: Product) => {
    setProducts(prevProducts =>
      prevProducts.map(p => (p.id === productData.id ? productData : p))
    );
  }, []);

  const deleteProduct = useCallback((productId: string) => {
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
  }, []);

  const deleteProducts = useCallback((productIds: string[]) => {
    setProducts(prevProducts => prevProducts.filter(p => !productIds.includes(p.id)));
  }, []);

  const getProductById = useCallback((productId: string) => {
      return products.find(p => p.id === productId);
  }, [products]);

  const value = useMemo(() => ({
    products,
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteProducts,
    getProductById
  }), [products, setProducts, addProduct, updateProduct, deleteProduct, deleteProducts, getProductById]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
