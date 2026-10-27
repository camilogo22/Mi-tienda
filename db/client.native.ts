// db/client.native.ts
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const expoDbInstance = openDatabaseSync('mitienda.db', { enableChangeListener: true });
expoDbInstance.execSync('PRAGMA foreign_keys = ON;');
const dbInstance = drizzle(expoDbInstance, { schema });

export const expoDb = expoDbInstance;
export const db = dbInstance;
