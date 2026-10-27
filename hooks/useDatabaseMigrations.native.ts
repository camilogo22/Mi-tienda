// hooks/useDatabaseMigrations.native.ts
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import { db } from '@/db/client';

export function useDatabaseMigrations() {
  return useMigrations(db, migrations);
}
