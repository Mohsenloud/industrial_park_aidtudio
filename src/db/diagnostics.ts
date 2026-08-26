import { db } from "./index.ts";
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
  banners: ["id", "company_name", "title", "subtitle", "description", "image", "badge", "phone", "created_at"],
  classifieds: ["id", "owner_id", "type", "title", "description", "phone", "category", "created_at"],
  settings: ["key", "value", "updated_at"],
  sms_logs: ["id", "phone", "code", "provider", "template", "status", "timestamp"],
  quotes: ["id", "product_id", "unit_id", "buyer_name", "buyer_phone", "description", "status", "created_at"],
  reviews: ["id", "unit_id", "author_name", "rating", "comment", "status", "created_at"],
  activity_logs: ["id", "action", "title", "created_at"]
};

export async function runDatabaseDiagnostics(): Promise<DatabaseDiagnosticReport> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  const report: DatabaseDiagnosticReport = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    latencyMs: 0,
    connection: {
      connected: false,
      database: "postgresql",
      currentUser: "postgres",
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

  try {
    const res = await db.execute(sql`SELECT version()`);
    report.connection.connected = true;
    report.connection.serverVersion = (res.rows[0] as any).version as string;
  } catch (connErr: any) {
    report.status = "error";
    report.connection.error = connErr.message || String(connErr);
    errors.push(`Database connection failed: ${report.connection.error}`);
    report.latencyMs = Date.now() - startTime;
    report.summary.errors = errors;
    return report;
  }

  try {
    const tableNames = Object.keys(REQUIRED_TABLE_COLUMNS);

    for (const tableName of tableNames) {
      let accessible = false;
      let rowCount = 0;
      let tableError: string | undefined;
      const cols: { name: string; type: string; nullable: boolean }[] = [];

      try {
        const tableInfo = await db.execute(sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = ${tableName}`);
        if (tableInfo.rows.length > 0) {
          for (const row of tableInfo.rows) {
            cols.push({
              name: (row as any).column_name as string,
              type: (row as any).data_type as string,
              nullable: (row as any).is_nullable === 'YES',
            });
          }

          const countRes = await db.execute(sql.raw(`SELECT COUNT(*) AS count FROM "${tableName}"`));
          rowCount = parseInt((countRes.rows[0] as any).count) || 0;
          accessible = true;
          report.summary.accessibleTables++;
        } else {
          tableError = `Table "${tableName}" does not exist`;
          errors.push(tableError);
        }
      } catch (queryErr: any) {
        tableError = queryErr.message || String(queryErr);
        errors.push(`Table "${tableName}" query failed: ${tableError}`);
      }

      const colNames = cols.map((c) => c.name);
      const expectedCols = REQUIRED_TABLE_COLUMNS[tableName] || [];
      const missing = expectedCols.filter((expected) => !colNames.includes(expected));

      if (missing.length > 0) {
        warnings.push(`Table "${tableName}" is missing required column(s): ${missing.join(", ")}`);
      }

      report.tables[tableName] = {
        name: tableName,
        exists: cols.length > 0,
        accessible,
        rowCount,
        columns: cols,
        missingColumns: missing.length > 0 ? missing : undefined,
        error: tableError,
      };
    }

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
