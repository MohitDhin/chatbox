import { env } from "./config/env.js";
import { initializeDatabase } from "./config/schema.js";
import { pool } from "./config/db.js";
import { createApp } from "./app.js";

const start = async (): Promise<void> => {
  await initializeDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`Chat backend listening on port ${env.PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

start().catch(async (error: unknown) => {
  console.error("Failed to start server:", error);
  await pool.end();
  process.exit(1);
});
