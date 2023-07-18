# Sly

Sly is a CLI tool to add components, icons, and utilities as code, not dependencies.

## Installation

```bash
npm install --save-dev @sly-cli/sly
```

## Configure your libraries

This command will create a `sly.json` file in your project root.

```bash
npx sly init

# use a local registry during development
REGISTRY_URL=http://localhost:3000 npx sly init
```

It will interactively walk you through the process of selecting which libraries you want to use and setting the configuration for each of them.

## Add a component

The `add` command will allow you to select a library and interactively select which components you want to add.

```bash
npx sly add
```

You can also add a component non-interactively by passing args up front and you can use the `--yes` flag to skip the confirmation prompt.

```bash
npx sly add @radix-ui/icons arrow-right --yes
```

## Future

- **Support more libraries.** Any open source library of icons, components, hooks, utilities, etc. can be added to Sly.
- **Caching**. We should cache the registry so we don't hit the upstream sources so often.
- **Typescript config instead of JSON** Is this possible? It's easy enough to read a typescript config file from the CLI, but writing new config values seemed prohibitively difficult.
- **Additional registries.** Right now you can point to a locally hosted registry if you wanted full control of the available libraries. If someone wanted to add their own libs while _also_ having access to the official registry, they would need their custom registry to proxy requests to the official registry. Is that ok? Should we support multiple registries up front?
- **Install node dependencies.** If you install a component that has its own dependencies, the registry should be able to provide that information so we can install them for you. The shadcn CLI does an excellent job of this.
- **Just in time initialization**. Right now the `init` command is required to create the `sly.json` file that configures the library. If someone tries to install a component directly, we should just give them the instructions to configure it and then install it all at once. Such a user may not want the `sly.json` file in their project at all.
- **Improved contribution flow**. We should have some contribution guidelines, list of contributors.
- **Convert website to ESM**. The website is currently all CJS and should be ported to ESM.
