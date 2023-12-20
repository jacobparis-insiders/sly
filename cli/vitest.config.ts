import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // run tests in sequence instead of parallel
    chaiConfig: {
      showDiff: false,
      truncateThreshold: 1000,
    },
  },
})
