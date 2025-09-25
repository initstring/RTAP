/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globalSetup: ["./src/test/global-setup.ts"],
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "src/app/**",
        "src/components/**",
        "src/features/**",
        "src/contexts/**",
        "src/hooks/**",
        "src/trpc/**",
        "src/test/**",
        "src/types/**",
        "scripts/**",
        "deploy/**",
        "public/**",
        "prisma/**",
        "**/*.config.*",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@features": resolve(__dirname, "src/features"),
      "@components": resolve(__dirname, "src/components"),
      "@lib": resolve(__dirname, "src/lib"),
      "@server": resolve(__dirname, "src/server"),
      "@root": resolve(__dirname, "."),
    },
  },
});
