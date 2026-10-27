// hooks/useProducts.ts
import { useMemo } from 'react';
import { desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { products, type Product } from '@/db/schema';
import { productsRepo } from '@/db/repositories/products';
import { useLiveQuery } from './useLiveQuerySafe';

export function useProducts(searchQuery: string = '') {
  const query = useMemo(() => {
    return db.select().from(products).orderBy(desc(products.updatedAt));
  }, []);

  const { data: allProducts, error, updatedAt } = useLiveQuery(query);

  const productList: Product[] = allProducts || [];

  // Filtrado por búsqueda en memoria
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return productList;
    const q = searchQuery.toLowerCase().trim();
    return productList.filter((p) => p.name.toLowerCase().includes(q));
  }, [productList, searchQuery]);

  // Cálculos de totales requeridos en el parcial
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
    updatedAt,
    createProduct: productsRepo.create,
    updateProduct: productsRepo.update,
    deleteProduct: productsRepo.delete,
    getProductById: productsRepo.getById,
  };
}
