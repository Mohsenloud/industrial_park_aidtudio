import { createPool, db } from "./index.ts";
import { sql } from "drizzle-orm";
import { users, otps } from "./schema.ts";

export interface TableDiagnosticResult {
  name: string;
  exists: boolean;
  accessible: boolean;
  rowCount: number;
  columns: { name: string; type: string; nullable: boolean }[];
  primaryKey?: string;
  missingColumns?: string[];
  error?: string;
}

export interface DatabaseDiagnosticReport {
  timestamp: string;
  status: "healthy" | "degraded" | "error";
  latencyMs: number;
  connection: {
    connected: boolean;
    database: string;
    currentUser: string;
    serverVersion?: string;
    error?: string;
  };
  tables: Record<string, TableDiagnosticResult>;
  summary: {
    totalTablesChecked: number;
    accessibleTables: number;
    usersTableHealthy: boolean;
    otpsTableHealthy: boolean;
    warnings: string[];
    errors: string[];
  };
}

const REQUIRED_TABLE_COLUMNS: Record<string, string[]> = {
  users: ["uid", "name", "phone", "email", "created_at", "password_hash", "last_login_at"],
  otps: ["phone", "code", "expires_at"],
  units: ["id", "owner_id", "name", "phone", "address", "description", "category", "profile_image", "status", "created_at", "updated_at"],
  products: ["id", "unit_id", "owner_id", "name", "description", "image", "created_at"],
  settings: ["key", "value", "updated_at"],
  sms_logs: ["id", "phone", "code", "provider", "template", "status", "timestamp"],
};

/**
 * Diagnostic utility to verify the PostgreSQL connection and validate table schemas,
 * with particular focus on `users` and `otps`.
 */
export async function runDatabaseDiagnostics(): Promise<DatabaseDiagnosticReport> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const pool = createPool();

  const report: DatabaseDiagnosticReport = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    latencyMs: 0,
    connection: {
      connected: false,
      database: "unknown",
      currentUser: "unknown",
    },
    tables: {},
    summary: {
      totalTablesChecked: Object.keys(REQUIRED_TABLE_COLUMNS).length,
      accessibleTables: 0,
      usersTableHealthy: false,
      otpsTableHealthy: false,
      warnings: [],
      errors: [],
    },
  };

  // 1. Check basic connection
  let client;
  try {
    client = await pool.connect();
    const connCheck = await client.query(`
      SELECT 
        current_database() AS db_name,
        current_user AS user_name,
        version() AS pg_version,
        NOW() AS server_time;
    `);

    const row = connCheck.rows[0];
    report.connection.connected = true;
    report.connection.database = row?.db_name || "unknown";
    report.connection.currentUser = row?.user_name || "unknown";
    report.connection.serverVersion = row?.pg_version?.split(" ")[0] + " " + (row?.pg_version?.split(" ")[1] || "");
  } catch (connErr: any) {
    report.status = "error";
    report.connection.error = connErr.message || String(connErr);
    errors.push(`Database connection failed: ${report.connection.error}`);
    report.latencyMs = Date.now() - startTime;
    report.summary.errors = errors;
    return report;
  } finally {
    if (client) {
      client.release();
    }
  }

  // 2. Query information_schema for table and column structure
  try {
    const tableNames = Object.keys(REQUIRED_TABLE_COLUMNS);
    const schemaQuery = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    // Group columns by table
    const tableColumnsMap: Record<string, { name: string; type: string; nullable: boolean }[]> = {};
    for (const row of schemaQuery.rows) {
      if (!tableColumnsMap[row.table_name]) {
        tableColumnsMap[row.table_name] = [];
      }
      tableColumnsMap[row.table_name].push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === "YES",
      });
    }

    // 3. Check each required table
    for (const tableName of tableNames) {
      const cols = tableColumnsMap[tableName] || [];
      const exists = cols.length > 0;
      const colNames = cols.map((c) => c.name);
      const expectedCols = REQUIRED_TABLE_COLUMNS[tableName] || [];
      const missing = expectedCols.filter((expected) => !colNames.includes(expected));

      let accessible = false;
      let rowCount = 0;
      let tableError: string | undefined;

      if (exists) {
        try {
          // Verify SELECT query permission and count rows
          const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM "${tableName}"`);
          rowCount = countRes.rows[0]?.count || 0;
          accessible = true;
          report.summary.accessibleTables++;
        } catch (queryErr: any) {
          tableError = queryErr.message || String(queryErr);
          errors.push(`Table "${tableName}" query failed: ${tableError}`);
        }
      } else {
        tableError = `Table "${tableName}" does not exist in schema "public"`;
        errors.push(tableError);
      }

      if (missing.length > 0) {
        warnings.push(`Table "${tableName}" is missing required column(s): ${missing.join(", ")}`);
      }

      report.tables[tableName] = {
        name: tableName,
        exists,
        accessible,
        rowCount,
        columns: cols,
        missingColumns: missing.length > 0 ? missing : undefined,
        error: tableError,
      };
    }

    // 4. Targeted Drizzle ORM functional verification for users & otps
    try {
      await db.select().from(users).limit(1);
      report.summary.usersTableHealthy = (report.tables.users?.accessible ?? false) && (!report.tables.users?.missingColumns || report.tables.users.missingColumns.length === 0);
    } catch (uErr: any) {
      report.summary.usersTableHealthy = false;
      warnings.push(`Drizzle ORM 'users' select check failed: ${uErr.message}`);
    }

    try {
      await db.select().from(otps).limit(1);
      report.summary.otpsTableHealthy = (report.tables.otps?.accessible ?? false) && (!report.tables.otps?.missingColumns || report.tables.otps.missingColumns.length === 0);
    } catch (oErr: any) {
      report.summary.otpsTableHealthy = false;
      warnings.push(`Drizzle ORM 'otps' select check failed: ${oErr.message}`);
    }

  } catch (diagErr: any) {
    errors.push(`Diagnostics execution error: ${diagErr.message || String(diagErr)}`);
  }

  // 5. Calculate overall status
  report.latencyMs = Date.now() - startTime;
  report.summary.warnings = warnings;
  report.summary.errors = errors;

  if (errors.length > 0) {
    report.status = "error";
  } else if (warnings.length > 0) {
    report.status = "degraded";
  } else {
    report.status = "healthy";
  }

  return report;
}
