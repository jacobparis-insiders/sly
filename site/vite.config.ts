import { reactRouter } from "@react-router/dev/vite";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { iconsSpritesheet } from "vite-plugin-icons-spritesheet";

const MODE = process.env.NODE_ENV;

export default defineConfig({
  // build: {
  //   cssMinify: MODE === "production",
  //   assetsInlineLimit: (source: string) => {
  //     if (
  //       source.endsWith("sprite.svg") ||
  //       source.endsWith("favicon.svg") ||
  //       source.endsWith("apple-touch-icon.png")
  //     ) {
  //       return false;
  //     }
  //   },
  // },
  plugins: [
    iconsSpritesheet({
      // Defaults to false, should it generate TS types for you
      withTypes: true,
      // The path to the icon directory
      inputDir: "svg-icons",
      // Output path for the generated spritesheet and types
      outputDir: "app/components/icons",
      // Output path for the generated type file, defaults to types.ts in outputDir
      typesOutputFile: "app/components/icons/name.d.ts",
      iconNameTransformer(fileName) {
        // PascalCase to kebab-case and remove any numeric suffixes
        return fileName
          .replace(/([A-Z0-9]+)([A-Z])/g, "$1-$2")
          .replace(/(-[0-9]+)$/, "");
      },
    }),
    reactRouter(),
    tailwind({
      content: ["./app/**/*.{js,jsx,ts,tsx}"],
      theme: {
        extend: {},
      },
      plugins: [],
    }),
  ],
});
