export const db = {
  libraries: [
    {
      id: "shadcn",
      name: "shadcn/ui",
      type: "component",
      registryUrl: "https://ui.shadcn.com/r",
      itemUrl: "https://ui.shadcn.com/r/styles/default/{name}.json",
      defaultConfig: {
        directory: "./app/components",
      },
    },
    {
      id: "shadcn-new-york",
      name: "shadcn/ui-new-york",
      type: "component",
      registryUrl: "https://ui.shadcn.com/r",
      itemUrl: "https://ui.shadcn.com/r/styles/new-york/{name}.json",
      defaultConfig: {
        directory: "./app/components",
      },
    },
    {
      id: "aceternity",
      name: "aceternity",
      type: "component",
      registryUrl: "https://ui.aceternity.com/registry",
      itemUrl: "https://ui.aceternity.com/registry/components/ui/{name}.json",
      defaultConfig: {
        directory: "./app/components",
      },
    },
    {
      id: "draft-ui",
      name: "draft-ui",
      type: "component",
      registryUrl:
        "https://github.com/IHIutch/draft-ui/tree/main/packages/ui/src",
      defaultConfig: {
        directory: "./app/components",
      },
    },
    {
      id: "jolly-ui",
      name: "jolly-ui",
      type: "component",
      registryUrl: "https://jollyui.dev/registry",
      itemUrl: "https://jollyui.dev/default/{name}",
      defaultConfig: {
        directory: "./app/components",
      },
    },
  ],
}

// "aceternity": {
//   "registryUrl": "https://ui.aceternity.com/registry",
//   "itemUrl": "https://ui.aceternity.com/registry/components/ui/{name}.json",
//   "config": "components:ui"
// },
// "draft-ui": {
//   "registryUrl": "https://github.com/IHIutch/draft-ui/tree/main/packages/ui/src",
//   "config": "components:ui"
// },
// "jolly-ui": {
//   "registryUrl": "https://jollyui.dev/registry",
//   "itemUrl": "https://jollyui.dev/default/{name}",
//   "config": "components:ui"
// },
// "iconify:covid": {
//   "name": "Covid Icons",
//   "config": {
//     "directory": "./svg-icons",
//     "postinstall": [],
//     "transformers": []
//   }
// }
