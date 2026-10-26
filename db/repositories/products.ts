// db/repositories/products.ts
import * as Crypto from 'expo-crypto';
import { eq, isNull, lt, or, desc, sql } from 'drizzle-orm';
import { db } from '../client';
import { products, type Product, type NewProduct } from '../schema';

export const productsRepo = {
  // Obtener todos los productos (ordenados por fecha de modificación)
  async getAll(): Promise<Product[]> {
    return db.select().from(products).orderBy(desc(products.updatedAt));
  },

  // Obtener producto por ID local
  async getById(id: number): Promise<Product | null> {
    const rows = await db.select().from(products).where(eq(products.id, id));
    return rows[0] ?? null;
  },

  // Obtener producto por clientId (UUID)
  async getByClientId(clientId: string): Promise<Product | null> {
    const rows = await db.select().from(products).where(eq(products.clientId, clientId));
    return rows[0] ?? null;
  },

  // Crear nuevo producto local
  async create(data: { name: string; quantity: number; price: number }): Promise<Product> {
    const clientId = Crypto.randomUUID();
    const now = new Date();

    const [created] = await db
      .insert(products)
      .values({
        clientId,
        name: data.name.trim(),
        quantity: Math.max(0, Math.floor(data.quantity)),
        price: Math.max(0, Math.floor(data.price)),
        updatedAt: now,
        syncedAt: null,
      })
      .returning();

    return created;
  },

  // Editar producto existente local
  async update(id: number, data: { name: string; quantity: number; price: number }): Promise<void> {
    const now = new Date();
    await db
      .update(products)
      .set({
        name: data.name.trim(),
        quantity: Math.max(0, Math.floor(data.quantity)),
        price: Math.max(0, Math.floor(data.price)),
        updatedAt: now,
      })
      .where(eq(products.id, id));
  },

  // Eliminar producto local
  async delete(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  },

  // Obtener productos pendientes de sincronizar (syncedAt nulo o menor a updatedAt)
  async getPending(): Promise<Product[]> {
    const all = await db.select().from(products);
    return all.filter((p) => !p.syncedAt || p.syncedAt.getTime() < p.updatedAt.getTime());
  },

  // Marcar como sincronizado
  async markAsSynced(clientId: string, syncedAt: Date): Promise<void> {
    await db
      .update(products)
      .set({ syncedAt })
      .where(eq(products.clientId, clientId));
  },

  // Bajar productos de la nube e insertar / actualizar con regla 'gana el último cambio'
  async upsertFromCloud(items: Array<{
    client_id: string;
    name: string;
    quantity: number;
    price: number;
    updated_at: string;
  }>): Promise<{ downloadedCount: number }> {
    let downloadedCount = 0;

    for (const cloudItem of items) {
      const local = await productsRepo.getByClientId(cloudItem.client_id);
      const cloudUpdatedAt = new Date(cloudItem.updated_at);

      if (!local) {
        // No existe en local -> se inserta marcado como sincronizado
        await db.insert(products).values({
          clientId: cloudItem.client_id,
          name: cloudItem.name,
          quantity: cloudItem.quantity,
          price: cloudItem.price,
          updatedAt: cloudUpdatedAt,
          syncedAt: cloudUpdatedAt,
        });
        downloadedCount++;
      } else {
        // Existe localmente: regla 'gana el último cambio'
        if (cloudUpdatedAt.getTime() >= local.updatedAt.getTime()) {
          await db
            .update(products)
            .set({
              name: cloudItem.name,
              quantity: cloudItem.quantity,
              price: cloudItem.price,
              updatedAt: cloudUpdatedAt,
              syncedAt: cloudUpdatedAt,
            })
            .where(eq(products.clientId, cloudItem.client_id));
        }
      }
    }

    return { downloadedCount };
  },
};
