// vite.config.ts
import { vitePlugin as remix } from "file:///Users/jacobparis/Projects/sly/node_modules/@remix-run/dev/dist/index.js";
import { defineConfig } from "file:///Users/jacobparis/Projects/sly/node_modules/vite/dist/node/index.js";
import { vercelPreset } from "file:///Users/jacobparis/Projects/sly/node_modules/@vercel/remix/vite.js";
import { iconsSpritesheet } from "file:///Users/jacobparis/Projects/sly/node_modules/vite-plugin-icons-spritesheet/dist/index.mjs";
import babel from "file:///Users/jacobparis/Projects/sly/node_modules/vite-plugin-babel/dist/index.mjs";
var vite_config_default = defineConfig({
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
        return fileName.replace(/([A-Z0-9]+)([A-Z])/g, "$1-$2").replace(/(-[0-9]+)$/, "");
      }
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
        v3_throwAbortReason: true
      }
    }),
    babel({
      filter: /\.[jt]sx$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        // if you use TypeScript
        plugins: [["babel-plugin-react-compiler"]]
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvamFjb2JwYXJpcy9Qcm9qZWN0cy9zbHkvd2ViYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvamFjb2JwYXJpcy9Qcm9qZWN0cy9zbHkvd2ViYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9qYWNvYnBhcmlzL1Byb2plY3RzL3NseS93ZWJhcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyB2aXRlUGx1Z2luIGFzIHJlbWl4IH0gZnJvbSBcIkByZW1peC1ydW4vZGV2XCJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCJcbmltcG9ydCB7IHZlcmNlbFByZXNldCB9IGZyb20gXCJAdmVyY2VsL3JlbWl4L3ZpdGVcIlxuaW1wb3J0IHsgaWNvbnNTcHJpdGVzaGVldCB9IGZyb20gXCJ2aXRlLXBsdWdpbi1pY29ucy1zcHJpdGVzaGVldFwiXG5pbXBvcnQgYmFiZWwgZnJvbSBcInZpdGUtcGx1Z2luLWJhYmVsXCJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICBpY29uc1Nwcml0ZXNoZWV0KHtcbiAgICAgIC8vIERlZmF1bHRzIHRvIGZhbHNlLCBzaG91bGQgaXQgZ2VuZXJhdGUgVFMgdHlwZXMgZm9yIHlvdVxuICAgICAgd2l0aFR5cGVzOiB0cnVlLFxuICAgICAgLy8gVGhlIHBhdGggdG8gdGhlIGljb24gZGlyZWN0b3J5XG4gICAgICBpbnB1dERpcjogXCJpY29uc1wiLFxuICAgICAgLy8gT3V0cHV0IHBhdGggZm9yIHRoZSBnZW5lcmF0ZWQgc3ByaXRlc2hlZXQgYW5kIHR5cGVzXG4gICAgICBvdXRwdXREaXI6IFwiYXBwL2NvbXBvbmVudHMvaWNvbnNcIixcbiAgICAgIC8vIE91dHB1dCBwYXRoIGZvciB0aGUgZ2VuZXJhdGVkIHR5cGUgZmlsZSwgZGVmYXVsdHMgdG8gdHlwZXMudHMgaW4gb3V0cHV0RGlyXG4gICAgICB0eXBlc091dHB1dEZpbGU6IFwiYXBwL2NvbXBvbmVudHMvaWNvbnMvaWNvbnMudHNcIixcbiAgICAgIC8vIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIHNjcmlwdCBpcyBnZW5lcmF0aW5nIHRoZSBpY29uIG5hbWVcbiAgICAgIGljb25OYW1lVHJhbnNmb3JtZXIoZmlsZU5hbWUpIHtcbiAgICAgICAgLy8gUGFzY2FsQ2FzZSB0byBrZWJhYi1jYXNlIGFuZCByZW1vdmUgYW55IG51bWVyaWMgc3VmZml4ZXNcbiAgICAgICAgcmV0dXJuIGZpbGVOYW1lXG4gICAgICAgICAgLnJlcGxhY2UoLyhbQS1aMC05XSspKFtBLVpdKS9nLCBcIiQxLSQyXCIpXG4gICAgICAgICAgLnJlcGxhY2UoLygtWzAtOV0rKSQvLCBcIlwiKVxuICAgICAgfSxcbiAgICB9KSxcbiAgICByZW1peCh7XG4gICAgICBwcmVzZXRzOiBbdmVyY2VsUHJlc2V0KCldLFxuICAgICAgZnV0dXJlOiB7XG4gICAgICAgIC8vIHVuc3RhYmxlX29wdGltaXplRGVwczogdHJ1ZSxcbiAgICAgICAgdjNfcm91dGVDb25maWc6IGZhbHNlLFxuICAgICAgICB2M19zaW5nbGVGZXRjaDogdHJ1ZSxcbiAgICAgICAgdjNfbGF6eVJvdXRlRGlzY292ZXJ5OiB0cnVlLFxuICAgICAgICB2M19mZXRjaGVyUGVyc2lzdDogdHJ1ZSxcbiAgICAgICAgdjNfcmVsYXRpdmVTcGxhdFBhdGg6IHRydWUsXG4gICAgICAgIHYzX3Rocm93QWJvcnRSZWFzb246IHRydWUsXG4gICAgICB9LFxuICAgIH0pLFxuICAgIGJhYmVsKHtcbiAgICAgIGZpbHRlcjogL1xcLltqdF1zeCQvLFxuICAgICAgYmFiZWxDb25maWc6IHtcbiAgICAgICAgcHJlc2V0czogW1wiQGJhYmVsL3ByZXNldC10eXBlc2NyaXB0XCJdLCAvLyBpZiB5b3UgdXNlIFR5cGVTY3JpcHRcbiAgICAgICAgcGx1Z2luczogW1tcImJhYmVsLXBsdWdpbi1yZWFjdC1jb21waWxlclwiXV0sXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVMsU0FBUyxjQUFjLGFBQWE7QUFDclUsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyx3QkFBd0I7QUFDakMsT0FBTyxXQUFXO0FBQ2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLGlCQUFpQjtBQUFBO0FBQUEsTUFFZixXQUFXO0FBQUE7QUFBQSxNQUVYLFVBQVU7QUFBQTtBQUFBLE1BRVYsV0FBVztBQUFBO0FBQUEsTUFFWCxpQkFBaUI7QUFBQTtBQUFBLE1BRWpCLG9CQUFvQixVQUFVO0FBRTVCLGVBQU8sU0FDSixRQUFRLHVCQUF1QixPQUFPLEVBQ3RDLFFBQVEsY0FBYyxFQUFFO0FBQUEsTUFDN0I7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELE1BQU07QUFBQSxNQUNKLFNBQVMsQ0FBQyxhQUFhLENBQUM7QUFBQSxNQUN4QixRQUFRO0FBQUE7QUFBQSxRQUVOLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQjtBQUFBLFFBQ2hCLHVCQUF1QjtBQUFBLFFBQ3ZCLG1CQUFtQjtBQUFBLFFBQ25CLHNCQUFzQjtBQUFBLFFBQ3RCLHFCQUFxQjtBQUFBLE1BQ3ZCO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxNQUFNO0FBQUEsTUFDSixRQUFRO0FBQUEsTUFDUixhQUFhO0FBQUEsUUFDWCxTQUFTLENBQUMsMEJBQTBCO0FBQUE7QUFBQSxRQUNwQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQztBQUFBLE1BQzNDO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
