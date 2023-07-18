// http://localhost:3000/
// https://sly-cli

import type { V2_MetaFunction } from "@remix-run/node"

export const meta: V2_MetaFunction = () => {
  return [
    { title: "Sly CLI" },
    {
      name: "description",
      content: "Add components, icons, and utilities to your app.",
    },
  ]
}

export default function Index() {
  return (
    <div className="flex mx-auto my-24 max-w-4xl px-4 flex-col">
      <div>
        <h1 className="font-bold inline text-5xl drop-shadow-2xl md:text-7xl">
          Write code, not dependencies
        </h1>
        <a
          className="group inline-block text-xl font-medium mb-4 ml-4 align-middle !no-underline"
          href="https://twitter.com/intent/follow?screen_name=jacobmparis"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="text-neutral-600 group-hover:underline">
            by <span className="group-hover:opacity-100 opacity-0">@</span>jacob
            <span className="group-hover:opacity-100 opacity-0">m</span>paris
          </span>
        </a>
      </div>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Sly is a CLI tool to add components, icons, and utilities as code, not
        dependencies.
      </p>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Simple usage
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Choose from a selection of open source libraries and import components
        directly into your codebase.
      </p>

      <AddExample />

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Available libraries
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        There are currently 4 libraries available, but more are coming soon.
      </p>

      <ul className="mt-4 list-disc ml-8 text-xl text-neutral-600 space-y-2">
        {[
          {
            href: "https://icons.radix-ui.com/",
            name: "@radix-ui/icons",
          },
          {
            href: "https://ui.shadcn.com/",
            name: "@shadcn/ui",
          },
          {
            href: "lucide-icons/lucide",
            name: "lucide-icons",
          },
          {
            href: "https://lodash.com/",
            name: "lodash",
          },
        ].map(({ href, name }) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener  noreferrer">
              {name}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">Use cases</h2>

      <ul className="mt-8 max-w-prose text-xl text-neutral-600 list-disc ml-8 space-y-2">
        <li>
          Add SVG icons and{" "}
          <a href="https://github.com/epicweb-dev/epic-stack/blob/main/docs/icons.md">
            run a build command to convert them to sprites
          </a>
        </li>

        <li>
          Insert UI components and transform them to match your project's style
        </li>

        <li>
          Prevent supply chain attacks by detaching third party utilities from
          vulnerable registries.
        </li>

        <li>
          Host your own private registry and share code across your
          organization.
        </li>
      </ul>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Fully configurable
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Rather than going into a generic dependencies directory, Sly lets you
        insert them anywhere you want, so you can commit and modify them as you
        would any other file.
      </p>

      <ConfigExample />

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        You can configure each library individually, either via the CLI or by
        editing the config file directly.
      </p>

      <dl>
        <dt className="mt-8 font-bold text-xl text-neutral-600">name</dt>
        <dd className="mt-2 text-lg text-neutral-600">
          The name of the library in Sly's registry.
        </dd>

        <dt className="mt-8 font-bold text-xl text-neutral-600">directory</dt>
        <dd className="mt-2 text-lg text-neutral-600">
          The directory where you want to insert the components. If a component
          with the same name already exists, adding will fail unless you pass
          the <code>--overwrite</code> flag.
        </dd>

        <dt className="mt-8 font-bold text-xl text-neutral-600">
          transformers
        </dt>
        <dd className="mt-2 text-lg text-neutral-600">
          You can provide a pipeline of transformer functions to apply to the
          components before saving them. Each item is a path to a file that
          looks like{" "}
          <code>export default async function (input: string): string</code> and
          they are applied in order.
          <br />
          <br />
          For example, you could use this to format the code with Prettier, to
          append license information, to remove attributes from SVGs, to enforce
          opinionated formatting preferences, to replace imports, etc.
        </dd>

        <dt className="mt-8 font-bold text-xl text-neutral-600">postinstall</dt>
        <dd className="mt-2 text-lg text-neutral-600">
          This is a command that will be executed each time that components are
          added. If multiple components are added at once, it runs once at the
          end.
        </dd>
      </dl>
    </div>
  )
}

function AddExample() {
  return (
    <pre className="bg-slate-600 px-8 py-4 rounded-lg mt-4">
      <code className="text-slate-200 text-lg">
        {">"} npx sly-cmd add
        <br />
        <br />
        <span className="text-green-400">✔</span>{" "}
        <strong>Which library would you like to use?</strong> › @radix-ui/icons
        <br />
        <span className="text-green-400">✔</span>{" "}
        <strong>Which components would you like to add?</strong> › camera,
        card-stack
        <br />
        <span className="text-green-400">✔</span>{" "}
        <strong>Add 2 components? </strong>… yes
        <br />
        <br />
        <span className="text-slate-400">⠸</span> Adding camera...
        <br />
        <span className="text-green-400">✔</span> <strong>Added</strong>{" "}
        /other/svg-icons/camera.svg
        <br />
        <br />
        <span className="text-slate-400">⠸</span> Adding card-stack...
        <br />
        <span className="text-green-400">✔</span> <strong>Added</strong>{" "}
        /other/svg-icons/card-stack.svg
      </code>
    </pre>
  )
}
function ConfigExample() {
  return (
    <pre className="bg-slate-600 px-8 py-4 rounded-lg mt-4">
      <code className="text-slate-200 text-lg">
        {"{\n"}
        {"  "}
        <span className="text-orange-300">"$schema"</span>
        {": "}
        <span className="text-cyan-200">"./sly-schema.json"</span>
        {",\n"}
        {"  "}
        <span className="text-orange-300">"libraries"</span>
        {": [\n"}
        {"    {\n"}
        {"      "}
        <span className="text-orange-300">"name"</span>
        {": "}
        <span className="text-cyan-200">"@radix-ui/icons"</span>
        {",\n"}
        {"      "}
        <span className="text-orange-300">"directory"</span>
        {": "}
        <span className="text-cyan-200">"./other/svg-icons"</span>
        {",\n"}
        {"      "}
        <span className="text-orange-300">"postinstall"</span>
        {": ["}
        <span className="text-cyan-200">"npm"</span>{" "}
        <span className="text-cyan-200">"run"</span>{" "}
        <span className="text-cyan-200">"build:icons"</span>
        {"],\n"}
        {"      "}
        <span className="text-orange-300">"transformers"</span>
        {": [\n"}
        {"        "}
        <span className="text-cyan-200">"sly/svg-remove-dimensions.js"</span>
        {",\n"}
        {"        "}
        <span className="text-cyan-200">"sly/html-prettier.js"</span>
        {",\n"}
        {"        "}
        <span className="text-cyan-200">"sly/html-add-license-info.js"</span>
        {",\n"}
        {"      ]\n"}
        {"    },\n"}
        {"    {\n"}
        {"      "}
        <span className="text-orange-300">"name"</span>
        {": "}
        <span className="text-cyan-200">"@shadcn/ui"</span>
        {",\n"}
        {"      "}
        <span className="text-orange-300">"directory"</span>
        {": "}
        <span className="text-cyan-200">"./components"</span>
        {",\n"}
        {"      "}
        <span className="text-orange-300">"postinstall"</span>
        {": []"}
        {",\n"}
        {"      "}
        <span className="text-orange-300">"transformers"</span>
        {": [\n"}
        {"        "}
        <span className="text-cyan-200">"sly/tsx-remove-use-client.js"</span>
        {",\n"}
        {"        "}
        <span className="text-cyan-200">"sly/tsx-prettier.js"</span>
        {",\n"}
        {"        "}
        <span className="text-cyan-200">"sly/tsx-add-license-info.js"</span>
        {"\n"}
        {"      ]\n"}
        {"    }\n"}
        {"  ]\n"}
        {"}\n"},
      </code>
    </pre>
  )
}
