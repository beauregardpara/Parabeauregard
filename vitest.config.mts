import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
      "next/headers": fileURLToPath(new URL("./tests/mocks/next-headers.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: [fileURLToPath(new URL("./tests/setup.ts", import.meta.url))],
    globals: false,
  },
});