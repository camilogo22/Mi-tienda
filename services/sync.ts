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
    // Traer de Supabase los productos del usuario
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

      const { error: upsertError } = await supabase.from('products').upsert(
        {
          client_id: p.clientId,
          user_id: userId,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          updated_at: uploadTimestamp.toISOString(),
        },
        { onConflict: 'client_id' }
      );

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      // Marcar en SQLite como sincronizado con syncedAt igual al updatedAt que se subió
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
    const errorMsg = error?.message?.includes('Network request failed') ||
      error?.message?.includes('fetch failed')
      ? 'No hay conexión a internet'
      : error?.message || 'Error al sincronizar con la nube';

    return {
      success: false,
      uploadedCount: 0,
      downloadedCount: 0,
      message: errorMsg,
    };
  }
}
