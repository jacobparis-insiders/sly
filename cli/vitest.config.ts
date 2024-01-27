import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // CLI tests are against the live registry, so they need a longer timeout
    testTimeout: 10000,
    // run tests in sequence instead of parallel
    chaiConfig: {
      showDiff: false,
      truncateThreshold: 1000,
    },
    globalSetup: "../test/setup.ts",
  },
})
