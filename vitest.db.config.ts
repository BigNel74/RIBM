import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Load DATABASE_URL from .env if present (CI can set it directly instead).
try {
  process.loadEnvFile(".env");
} catch {
  // no .env — rely on the environment
}

/** Integration tests against a real PostgreSQL (DATABASE_URL). Run: npm run test:db */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Services guard against client bundling with `server-only`; tests run on the server.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
