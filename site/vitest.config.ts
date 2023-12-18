import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // run tests in sequence instead of parallel
    chaiConfig: {
      showDiff: false,
      truncateThreshold: 1000,
    },
    bail: 1,
    env: {
      REGISTRY_URL: "http://localhost:3000",
    },
  },
})
