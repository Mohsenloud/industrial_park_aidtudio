import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as dotenv from "dotenv";
import * as schema from "./schema.ts";

dotenv.config();

const Pool = pg.Pool || (pg as any).default?.Pool || pg;

export const createPool = () => {
  // First priority: Cloud SQL individual variables provided by GCP environment
  const host = process.env.SQL_HOST || process.env.PGHOST;
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.PGUSER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || process.env.PGPASSWORD;
  const database = process.env.SQL_DB_NAME || process.env.SQL_DATABASE || process.env.PGDATABASE;
  const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;

  if (host && user && database) {
    const isSocket = host.startsWith("/");
    const useSsl = process.env.SQL_SSL === "true";
    return new Pool({
      host,
      user,
      password: password || "",
      database,
      port: isSocket ? undefined : port,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
  }

  // Second priority: DATABASE_URL if explicitly provided
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.SQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
  }

  return new Pool({
    host: "127.0.0.1",
    user: "postgres",
    password: "",
    database: "postgres",
    port: 5432,
    ssl: false,
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


