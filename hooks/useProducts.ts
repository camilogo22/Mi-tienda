// hooks/useProducts.ts
import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { desc, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { products, type Product } from '@/db/schema';
import { productsRepo } from '@/db/repositories/products';

export function useProducts(searchQuery: string = '') {
  // useLiveQuery escucha automáticamente cambios en SQLite cuando enableChangeListener: true
  const query = useMemo(() => {
    return db.select().from(products).orderBy(desc(products.updatedAt));
  }, []);

  const { data: allProducts, error, updatedAt } = useLiveQuery(query);

  const productList: Product[] = allProducts || [];

  // Filtrado por búsqueda en memoria (o reactivo)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return productList;
    const q = searchQuery.toLowerCase().trim();
    return productList.filter((p) => p.name.toLowerCase().includes(q));
  }, [productList, searchQuery]);

  // Cálculos de totales requeridos
  const totalUnits = useMemo(() => {
    return productList.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  }, [productList]);

  const totalValue = useMemo(() => {
    return productList.reduce((acc, curr) => acc + (curr.quantity || 0) * (curr.price || 0), 0);
  }, [productList]);

  const pendingCount = useMemo(() => {
    return productList.filter(
      (p) => !p.syncedAt || p.syncedAt.getTime() < p.updatedAt.getTime()
    ).length;
  }, [productList]);

  return {
    products: filteredProducts,
    allProducts,
    totalUnits,
    totalValue,
    pendingCount,
    error,
    createProduct: productsRepo.create,
    updateProduct: productsRepo.update,
    deleteProduct: productsRepo.delete,
    getProductById: productsRepo.getById,
  };
}
