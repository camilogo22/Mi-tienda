// hooks/useLiveQuerySafe.web.ts
// En entorno Web, proporciona reactividad segura sin fallar por falta de soporte SQLite WASM
import { useState, useEffect } from 'react';
import { productsRepo } from '@/db/repositories/products';
import type { Product } from '@/db/schema';

export function useLiveQuery(query?: any) {
  const [data, setData] = useState<Product[]>([]);
  const [error, setError] = useState<any>(null);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const items = await productsRepo.getAll();
        if (isMounted) {
          setData(items);
          setUpdatedAt(new Date());
        }
      } catch (err) {
        if (isMounted) setError(err);
      }
    };

    loadData();

    // Se suscribe a los cambios locales en el repositorio
    const unsubscribe = productsRepo.subscribe(() => {
      loadData();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { data, error, updatedAt };
}

