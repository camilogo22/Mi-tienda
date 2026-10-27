// services/sync.ts
import { supabase } from '@/lib/supabase';
import { productsRepo } from '@/db/repositories/products';

export interface SyncResult {
  success: boolean;
  uploadedCount: number;
  downloadedCount: number;
  message: string;
}

export async function syncProducts(userId: string): Promise<SyncResult> {
  try {
    // Paso 1: Bajar
    // Traer de Supabase los productos del usuario (incluyendo borrados lógicos si existen)
    const { data: cloudProducts, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    let downloadedCount = 0;
    if (cloudProducts && cloudProducts.length > 0) {
      const res = await productsRepo.upsertFromCloud(cloudProducts);
      downloadedCount = res.downloadedCount;
    }

    // Paso 2: Subir
    // Enviar los productos pendientes con upsert por client_id y marcarlos como sincronizados
    const pendingProducts = await productsRepo.getPending();
    let uploadedCount = 0;

    for (const p of pendingProducts) {
      const uploadTimestamp = p.updatedAt;

      // Payload base
      const payload: any = {
        client_id: p.clientId,
        user_id: userId,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        updated_at: uploadTimestamp.toISOString(),
      };

      if (p.deletedAt) {
        payload.deleted_at = p.deletedAt.toISOString();
      } else {
        payload.deleted_at = null;
      }

      // Intentar upsert con deleted_at
      let { error: upsertError } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'client_id' });

      // Si la columna deleted_at no existe aún en Supabase, reintentar sin ella
      if (upsertError && upsertError.code === '42703') {
        delete payload.deleted_at;
        const retry = await supabase
          .from('products')
          .upsert(payload, { onConflict: 'client_id' });
        upsertError = retry.error;
      }

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      // Marcar en SQLite local como sincronizado
      await productsRepo.markAsSynced(p.clientId, uploadTimestamp);
      uploadedCount++;
    }

    const message = `${uploadedCount} subidos, ${downloadedCount} bajados`;
    return {
      success: true,
      uploadedCount,
      downloadedCount,
      message,
    };
  } catch (error: any) {
    console.error('Error durante sincronización:', error);
    const errorMsg =
      error?.message?.includes('Network request failed') ||
      error?.message?.includes('fetch failed')
        ? 'Sin conexión a internet (modo offline)'
        : error?.message || 'Error al sincronizar con la nube';

    return {
      success: false,
      uploadedCount: 0,
      downloadedCount: 0,
      message: errorMsg,
    };
  }
}
