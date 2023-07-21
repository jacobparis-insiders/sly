# Sly

**Sly is a CLI tool to add components, icons, and utilities as code**, not dependencies. Most docs start with installation and configuration but those are boring so lets do this backwards.

After you run a command with Sly, one or more files will appear in your codebase in a directory of your choice.

These files are yours to customize<sup>[1]</sup> and own forever after. No dependencies<sup>[2]</sup>, no build step<sup>[3]</sup>, no configuration.

For example, **if you add a React component this way, it will look just like a React component you wrote yourself, or like one you copy/pasted from the internet.** 

1. Provide transformer functions to **customize each new component as it's added to your codebase**.
2. If the component you added has its own dependencies, Sly will ask you if you want to install them and offload that work to npm.
3. **You are not dealing with built/compiled/minified output code**. Everything in the Sly registry is curated to be used natively.

## Commands

Sly does NOT require a config file IF you provide enough information in the command, so instead of telling you what each option does, let's go through what happens if you **don't** include each option

As an example, we'll install `eraser` icon from `@radix-ui/icons`.

### --overwrite

```sh
npx @sly-cli/sly add @radix-ui/icons eraser --directory ./icons --yes --overwrite
```

If you don't provide `--overwrite`, the installation will fail if the file already exists.

### --yes

```sh
npx @sly-cli/sly add @radix-ui/icons eraser --directory ./icons --yes
```

If you don't provide `--yes`, you will be prompted to confirm the installation before a file is written.

### --directory

```sh
npx @sly-cli/sly add @radix-ui/icons eraser --directory ./icons
```

If you don't provide `--directory`, Sly will look for your `sly.json` file and look for the directory field under `@radix-ui/icons` in the config. **If Sly can't find that config file, you will be asked which directory you want to install the icon to** and Sly will create a `sly.json` file for you.

### component

```sh
npx @sly-cli/sly add @radix-ui/icons eraser
```

If you don't provide a component name like `eraser`, **Sly will show you a list of all the icons available** in `@radix-ui/icons` and ask you to select the ones you want.

### library

```sh
npx @sly-cli/sly add @radix-ui/icons
```

If you don't provide `@radix-ui/icons`, Sly will show you a list of all the libraries you've configured and ask you to select the one you want before proceeding to show you the list of icons.

### add

```sh
npx @sly-cli/sly add
```

If you don't provide add, you're at the root of the CLI and will get a help menu

### npx @sly-cli/sly

```sh
npx @sly-cli/sly
```

If you don't provide `@sly-cli/sly`, it might be because you've installed Sly already and you can just run `sly` directly.

```bash
npm install --save-dev @sly-cli/sly

npx sly
```

### global installation

If you don't want to use npx, install  Sly globally and you can run `sly` directly.

```bash
npm install -g @sly-cli/sly

sly
```

## Configuration

If you don't pass a `--directory` flag to Sly, it will walk you though creating a `sly.json` configuration file. Here's what it looks like

```json
{
  "$schema": "https://sly-cli.fly.dev/registry/config.json",
  "libraries": [
    {
      "name": "@radix-ui/icons",
      "directory": "./other/svg-icons",
      "postinstall": ["npm", "run", "build:icons"],
      "transformers": ["transform-icon.ts"]
    }
  ]
}
```

You can configure each library individually, either via the CLI or by editing the config file directly.

|field|description|
|---|---|
|name|The name of the library in Sly's registry.|
|directory|The directory where you want to insert the components. If a component with the same name already exists, adding will fail unless you pass the --overwrite flag.|
|transformers|An array of paths to transformers. These paths are resolved relative to the config file, so simply listing a filename will search in the same directory as the config file.|
|postinstall|This is a command that will be executed each time that components are added. If multiple components are added at once, it runs once at the end.|

Sly will create the `sly.json` in your project root by default, but you are free to move it to one of several locations.

- `sly.json`
- `sly/sly.json`
- `config/sly.json`
- `config/sly/sly.json`
- `.config/sly.json`
- `.config/sly/sly.json`
- `others/sly.json`
- `others/sly/sly.json`

## Transformers

Transformers automate the initial customization steps you would normally do by hand when adding new code to your project.

When you add a component, Sly will pass it through each transformer in order, like a pipeline.  For example, you could use this to format the code with Prettier, to append license information, to remove attributes from SVGs, to enforce opinionated formatting preferences, to replace imports, etc.

A transformer to convert a [shadcn/ui](https://ui.shadcn.com/) component to match your project's style might look like this

```ts
import prettier from 'prettier'

const usesServerComponents = false
const cnFunctionDir = 'tailwind.config.ts'

/**
 * @type {import('@sly-cli/sly/dist').Transformer}
 */
export default async function transformShadcn(input, meta) {
	if (!usesServerComponents) {
		input = input.replace(/"use client".*/g, '\n')
	}

	input = input.replace('@/lib/utils', cnFunctionDir)

	input = prettier.format(input, {
		parser: 'typescript',
	})

	return input
}
```

Each transformer must `default export` a function whose first arg accepts a string, and that returns a string. Returning a promise that resolves to a string is ok too – you're allowed to use async/await here. 

The second arg is `meta` and contains the name of the library, the source url for the component, and its license information. Some licenses require you to keep attribution, and you can add such information as a header comment in this way.


## Environment variables

The `--directory`, `--yes`, and `--overwrite` flags can also be set as environment variables. Values set as flags will override values set as environment variables, and a directory set either way will override the `sly.json` config file.

```
DIRECTORY=./other/svg-icons YES=true OVERWRITE=true npx sly add
```

## Custom registry

You may want a custom registry to share proprietary components with your team, or to 
To connect to a custom registry, use the `REGISTRY_URL` environment variable. 
```
REGISTRY_URL=http://localhost:3000 npx sly
```

## Future

- **Support more libraries.** Any open source library of icons, components, hooks, utilities, etc. can be added to Sly.
- **Caching**. We should cache the registry so we don't hit the upstream sources so often.
- **Typescript config instead of JSON** Is this possible? It's easy enough to read a typescript config file from the CLI, but writing new config values seemed prohibitively difficult.
- **Additional registries.** Right now you can point to a locally hosted registry if you wanted full control of the available libraries. If someone wanted to add their own libs while _also_ having access to the official registry, they would need their custom registry to proxy requests to the official registry. Is that ok? Should we support multiple registries up front?
- **Improved contribution flow**. We should have some contribution guidelines, list of contributors.
- **Convert website to ESM**. The website is currently all CJS and should be ported to ESM.
