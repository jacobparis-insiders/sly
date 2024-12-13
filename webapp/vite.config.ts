import { vitePlugin as remix } from "@remix-run/dev"
import { defineConfig } from "vite"
import { vercelPreset } from "@vercel/remix/vite"
import { iconsSpritesheet } from "vite-plugin-icons-spritesheet"
import babel from "vite-plugin-babel"
export default defineConfig({
  plugins: [
    iconsSpritesheet({
      // Defaults to false, should it generate TS types for you
      withTypes: true,
      // The path to the icon directory
      inputDir: "icons",
      // Output path for the generated spritesheet and types
      outputDir: "app/components/icons",
      // Output path for the generated type file, defaults to types.ts in outputDir
      typesOutputFile: "app/components/icons/icons.ts",
      // Callback function that is called when the script is generating the icon name
      iconNameTransformer(fileName) {
        // PascalCase to kebab-case and remove any numeric suffixes
        return fileName
          .replace(/([A-Z0-9]+)([A-Z])/g, "$1-$2")
          .replace(/(-[0-9]+)$/, "")
      },
    }),
    remix({
      presets: [vercelPreset()],
      future: {
        // unstable_optimizeDeps: true,
        v3_routeConfig: false,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    babel({
      filter: /\.[jt]sx$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"], // if you use TypeScript
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
})
