import { Pool } from "pg";

// One small pool per server instance. In production DATABASE_URL is Neon's pooled
// endpoint; locally it is the docker-compose Postgres.
const globalParaPool = globalThis as unknown as { pool?: Pool };
const pool = (globalParaPool.pool ??= new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://sexto:sexto@localhost:5435/sexto_homem",
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
}));

/** Always parameterized: values travel as $1, $2…, never inside the SQL text. */
export async function consulta<T extends Record<string, unknown>>(sql: string, valores: unknown[] = []): Promise<T[]> {
  const { rows } = await pool.query<T>(sql, valores);
  return rows;
}
