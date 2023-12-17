import { flatRoutes } from "remix-flat-routes"

/** @type {import('@remix-run/dev').AppConfig} */
export default {
  tailwind: true,
  ignoredRouteFiles: ["**/.*"],

  async routes(defineRoutes) {
    return flatRoutes("routes", defineRoutes)
  },
}
