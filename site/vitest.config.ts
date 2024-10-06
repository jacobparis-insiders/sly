import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Site tests involve installing different CLIs from npm
    // so they need a longer timeout
    testTimeout: 30000,
    // run tests in sequence instead of parallel
    chaiConfig: {
      showDiff: false,
      truncateThreshold: 1000,
    },
    bail: 1,
    env: {
      REGISTRY_URL: "http://localhost:3000",
    },
    globalSetup: "../test/setup.ts",
  },
})
