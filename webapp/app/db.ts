export const db = {
  libraries: [
    {
      id: "shadcn",
      name: "shadcn/ui",
      type: "component",
      registryUrl: "https://pkgless-shadcn.vercel.app/registry",
      itemUrl: "https://pkgless-shadcn.vercel.app/registry/{name}",
      defaultConfig: {
        directory: "./app/components",
      },
    },
    {
      id: "xstate-machines",
      name: "xstate-machines",
      type: "component",
      registryUrl: "https://xstate.dev/registry",
      itemUrl: "https://xstate.dev/machines/{name}",
      defaultConfig: {
        directory: "./app/machines",
      },
    },

    {
      id: "just-utils",
      name: "just-utils",
      type: "utils",
      registryUrl: "https://just-utils.dev/registry",
      itemUrl: "https://just-utils.dev/utils/{name}",
      defaultConfig: {
        directory: "./app/utils",
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
      itemUrl:
        "https://github.com/IHIutch/draft-ui/tree/main/packages/ui/src/{name}",
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
