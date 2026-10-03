import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on("error", (error: Error) => {
  console.error(
    "Unexpected PostgreSQL error:",
    error
  );
});