// db/client.web.ts
import * as schema from './schema';

const mockDb = {
  select: () => ({
    from: () => ({
      where: () => ({ orderBy: () => Promise.resolve([]) }),
      orderBy: () => Promise.resolve([]),
    }),
  }),
  insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
  update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  delete: () => ({ where: () => Promise.resolve() }),
};

export const expoDb = null;
export const db = mockDb as any;
