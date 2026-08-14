import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as dotenv from "dotenv";
import * as schema from "./schema.ts";

dotenv.config();

export const createPool = () => {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.SQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
  }

  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.PGUSER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || process.env.PGPASSWORD;
  const host = process.env.SQL_HOST || process.env.PGHOST || "127.0.0.1";
  const database = process.env.SQL_DB_NAME || process.env.SQL_DATABASE || process.env.PGDATABASE;
  const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;

  return new Pool({
    host,
    user,
    password,
    database,
    port,
    ssl: process.env.SQL_SSL === "true" ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
  });
};

const pool = createPool();

pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});

export const db = drizzle(pool, { schema });

