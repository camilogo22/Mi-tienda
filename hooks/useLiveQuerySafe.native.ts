// hooks/useLiveQuerySafe.native.ts
// En entornos nativos (Android / iOS), utiliza directamente useLiveQuery de drizzle-orm
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

export { useLiveQuery };
