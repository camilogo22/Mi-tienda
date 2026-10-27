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
      .select('client_id, name, quantity, price, updated_at')
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
    // Enviar los productos pendientes con upsert por client_id
    // Solo enviamos columnas existentes en Supabase (sin deleted_at para evitar error de caché de esquema)
    const pendingProducts = await productsRepo.getPending();
    let uploadedCount = 0;

    for (const p of pendingProducts) {
      const uploadTimestamp = p.updatedAt;

      const payload = {
        client_id: p.clientId,
        user_id: userId,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        updated_at: uploadTimestamp.toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'client_id' });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      // Marcar en la base local como sincronizado
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
    const rawMsg = error?.message || '';
    const errorMsg =
      rawMsg.includes('Network request failed') || rawMsg.includes('fetch failed')
        ? 'Sin conexión a internet (modo local)'
        : rawMsg || 'Error al sincronizar con la nube';

    return {
      success: false,
      uploadedCount: 0,
      downloadedCount: 0,
      message: errorMsg,
    };
  }
}
