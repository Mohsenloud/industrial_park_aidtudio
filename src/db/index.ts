import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    const config: PoolConfig = {
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    };

    if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
      config.connectionString = process.env.DATABASE_URL.trim();
      if (process.env.SQL_SSL === 'require' || process.env.DATABASE_URL.includes('sslmode=require')) {
        config.ssl = { rejectUnauthorized: false };
      }
    } else if (process.env.SQL_HOST && process.env.SQL_HOST.trim()) {
      config.host = process.env.SQL_HOST.trim();
      config.user = process.env.SQL_USER?.trim() || 'postgres';
      config.password = process.env.SQL_PASSWORD?.trim() || '';
      config.database = process.env.SQL_DB_NAME?.trim() || 'postgres';
      if (process.env.SQL_SSL === 'require') {
        config.ssl = { rejectUnauthorized: false };
      }
    } else {
      // Fallback for default local dev environment
      config.host = '127.0.0.1';
      config.user = 'postgres';
      config.password = '';
      config.database = 'postgres';
    }

    global._postgresPool = new Pool(config);

    global._postgresPool.on('error', (err) => {
      console.warn('Notice: SQL pool client idle event / connection warning:', err?.message || err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

