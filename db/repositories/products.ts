// db/repositories/products.ts
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { eq, desc, isNull } from 'drizzle-orm';
import { db } from '../client';
import { products, type Product } from '../schema';

type Listener = () => void;
const listeners = new Set<Listener>();

const isWeb = Platform.OS === 'web';
const WEB_STORAGE_KEY = 'mitienda_local_products_web';

// Soporte para Web usando localStorage
function getWebProducts(): Product[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(WEB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((p: any) => ({
      ...p,
      updatedAt: new Date(p.updatedAt),
      syncedAt: p.syncedAt ? new Date(p.syncedAt) : null,
      deletedAt: p.deletedAt ? new Date(p.deletedAt) : null,
    }));
  } catch (err) {
    console.warn('Error leyendo localStorage:', err);
    return [];
  }
}

function saveWebProducts(items: Product[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (err) {
    console.warn('Error guardando en localStorage:', err);
  }
}

export const productsRepo = {
  // Suscripción a cambios para reactividad en pantalla
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  notify() {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error notificando listener:', err);
      }
    });
  },

  // Obtener todos los productos activos (excluye borrados lógicos)
  async getAll(): Promise<Product[]> {
    if (isWeb) {
      const items = getWebProducts().filter((p) => !p.deletedAt);
      return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    return db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.updatedAt));
  },

  // Obtener todos los productos incluyendo borrados lógicos (para sincronización)
  async getAllWithDeleted(): Promise<Product[]> {
    if (isWeb) {
      const items = getWebProducts();
      return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    return db.select().from(products).orderBy(desc(products.updatedAt));
  },

  // Obtener producto activo por ID local
  async getById(id: number): Promise<Product | null> {
    if (isWeb) {
      const items = getWebProducts();
      return items.find((p) => p.id === id && !p.deletedAt) ?? null;
    }
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    const prod = rows[0] ?? null;
    return prod && !prod.deletedAt ? prod : null;
  },

  // Obtener producto por clientId (UUID)
  async getByClientId(clientId: string): Promise<Product | null> {
    if (isWeb) {
      const items = getWebProducts();
      return items.find((p) => p.clientId === clientId) ?? null;
    }
    const rows = await db.select().from(products).where(eq(products.clientId, clientId));
    return rows[0] ?? null;
  },

  // Crear nuevo producto local
  async create(data: { name: string; quantity: number; price: number }): Promise<Product> {
    const clientId = Crypto.randomUUID();
    const now = new Date();

    if (isWeb) {
      const items = getWebProducts();
      const nextId = items.length > 0 ? Math.max(...items.map((p) => p.id)) + 1 : 1;
      const newProd: Product = {
        id: nextId,
        clientId,
        name: data.name.trim(),
        quantity: Math.max(0, Math.floor(data.quantity)),
        price: Math.max(0, Math.floor(data.price)),
        updatedAt: now,
        syncedAt: null,
        deletedAt: null,
      };
      items.push(newProd);
      saveWebProducts(items);
      productsRepo.notify();
      return newProd;
    }

    const [created] = await db
      .insert(products)
      .values({
        clientId,
        name: data.name.trim(),
        quantity: Math.max(0, Math.floor(data.quantity)),
        price: Math.max(0, Math.floor(data.price)),
        updatedAt: now,
        syncedAt: null,
        deletedAt: null,
      })
      .returning();

    productsRepo.notify();
    return created;
  },

  // Editar producto existente local
  async update(id: number, data: { name: string; quantity: number; price: number }): Promise<void> {
    const now = new Date();

    if (isWeb) {
      const items = getWebProducts();
      const index = items.findIndex((p) => p.id === id);
      if (index !== -1) {
        items[index] = {
          ...items[index],
          name: data.name.trim(),
          quantity: Math.max(0, Math.floor(data.quantity)),
          price: Math.max(0, Math.floor(data.price)),
          updatedAt: now,
        };
        saveWebProducts(items);
        productsRepo.notify();
      }
      return;
    }

    await db
      .update(products)
      .set({
        name: data.name.trim(),
        quantity: Math.max(0, Math.floor(data.quantity)),
        price: Math.max(0, Math.floor(data.price)),
        updatedAt: now,
      })
      .where(eq(products.id, id));

    productsRepo.notify();
  },

  // Borrado lógico sincronizable (punto extra)
  async delete(id: number): Promise<void> {
    const now = new Date();

    if (isWeb) {
      const items = getWebProducts();
      const index = items.findIndex((p) => p.id === id);
      if (index !== -1) {
        items[index] = {
          ...items[index],
          deletedAt: now,
          updatedAt: now,
        };
        saveWebProducts(items);
        productsRepo.notify();
      }
      return;
    }

    await db
      .update(products)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(products.id, id));

    productsRepo.notify();
  },

  // Obtener productos pendientes de sincronizar
  async getPending(): Promise<Product[]> {
    const all = await productsRepo.getAllWithDeleted();
    return all.filter((p) => !p.syncedAt || p.syncedAt.getTime() < p.updatedAt.getTime());
  },

  // Marcar como sincronizado
  async markAsSynced(clientId: string, syncedAt: Date): Promise<void> {
    if (isWeb) {
      const items = getWebProducts();
      const index = items.findIndex((p) => p.clientId === clientId);
      if (index !== -1) {
        items[index].syncedAt = syncedAt;
        saveWebProducts(items);
        productsRepo.notify();
      }
      return;
    }

    await db
      .update(products)
      .set({ syncedAt })
      .where(eq(products.clientId, clientId));

    productsRepo.notify();
  },

  // Bajar productos de la nube e insertar / actualizar con regla 'gana el último cambio' y borrado lógico
  async upsertFromCloud(items: Array<{
    client_id: string;
    name: string;
    quantity: number;
    price: number;
    updated_at: string;
    deleted_at?: string | null;
  }>): Promise<{ downloadedCount: number }> {
    let downloadedCount = 0;

    for (const cloudItem of items) {
      const local = await productsRepo.getByClientId(cloudItem.client_id);
      const cloudUpdatedAt = new Date(cloudItem.updated_at);
      const cloudDeletedAt = cloudItem.deleted_at ? new Date(cloudItem.deleted_at) : null;

      if (!local) {
        // No existe en local
        if (isWeb) {
          const webItems = getWebProducts();
          const nextId = webItems.length > 0 ? Math.max(...webItems.map((p) => p.id)) + 1 : 1;
          webItems.push({
            id: nextId,
            clientId: cloudItem.client_id,
            name: cloudItem.name,
            quantity: cloudItem.quantity,
            price: cloudItem.price,
            updatedAt: cloudUpdatedAt,
            syncedAt: cloudUpdatedAt,
            deletedAt: cloudDeletedAt,
          });
          saveWebProducts(webItems);
        } else {
          await db.insert(products).values({
            clientId: cloudItem.client_id,
            name: cloudItem.name,
            quantity: cloudItem.quantity,
            price: cloudItem.price,
            updatedAt: cloudUpdatedAt,
            syncedAt: cloudUpdatedAt,
            deletedAt: cloudDeletedAt,
          });
        }
        if (!cloudDeletedAt) {
          downloadedCount++;
        }
      } else {
        // Regla 'gana el último cambio'
        if (cloudUpdatedAt.getTime() >= local.updatedAt.getTime()) {
          if (isWeb) {
            const webItems = getWebProducts();
            const index = webItems.findIndex((p) => p.clientId === cloudItem.client_id);
            if (index !== -1) {
              webItems[index] = {
                ...webItems[index],
                name: cloudItem.name,
                quantity: cloudItem.quantity,
                price: cloudItem.price,
                updatedAt: cloudUpdatedAt,
                syncedAt: cloudUpdatedAt,
                deletedAt: cloudDeletedAt,
              };
              saveWebProducts(webItems);
            }
          } else {
            await db
              .update(products)
              .set({
                name: cloudItem.name,
                quantity: cloudItem.quantity,
                price: cloudItem.price,
                updatedAt: cloudUpdatedAt,
                syncedAt: cloudUpdatedAt,
                deletedAt: cloudDeletedAt,
              })
              .where(eq(products.clientId, cloudItem.client_id));
          }
        }
      }
    }

    productsRepo.notify();
    return { downloadedCount };
  },
};
