import { unstable_vitePlugin as remix } from "@remix-run/dev"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { flatRoutes } from "remix-flat-routes"
import { installGlobals } from "@remix-run/node"
installGlobals()
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      async routes(defineRoutes) {
        return flatRoutes("routes", defineRoutes)
      },
    }),
    tsconfigPaths(),
  ],
})
