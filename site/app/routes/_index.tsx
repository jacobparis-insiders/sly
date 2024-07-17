// http://localhost:3000/
// https://sly-cli.fly.dev/

import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import copy from "copy-to-clipboard"
import cachified from "cachified"
import { useMemo, useState } from "react"
import { cache } from "~/cache.server"
import { Icon } from "~/components/icon"
import { registryIndexSchema } from "~/schemas"

export const meta: MetaFunction = () => {
  return [
    { title: "Add code, not dependencies, with Sly CLi" },
    {
      name: "description",
      content: "Add components, icons, and utilities to your app.",
    },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)

  const registry = await cachified({
    key: "registry",
    cache,
    staleWhileRevalidate: 1000 * 60 * 60 * 12, // 2 hours
    ttl: 1000 * 60 * 60 * 12, // 1 hours
    async getFreshValue() {
      return fetch(url.origin + "/registry/index.json")
        .then((response) => response.json())
        .then((response) => registryIndexSchema.parseAsync(response))
    },
  })

  return {
    version: registry.version,
    libraries: registry.libraries,
  }
}

export default function Index() {
  const { libraries } = useLoaderData<typeof loader>()

  const iconLibraries = useMemo(
    () => libraries.filter(({ tags }) => tags.includes("icons")),
    [libraries]
  )

  const uiLibraries = useMemo(
    () => libraries.filter(({ tags }) => tags.includes("ui")),
    [libraries]
  )

  const utilLibraries = useMemo(
    () => libraries.filter(({ tags }) => tags.includes("utilities")),
    [libraries]
  )

  const [isCopied, setIsCopied] = useState(false)

  return (
    <div className="flex mx-auto my-24 max-w-5xl px-4 flex-col text-neutral-600">
      <div>
        <h1 className="font-bold inline text-5xl drop-shadow-2xl md:text-8xl text-neutral-800">
          Add code, not dependencies
        </h1>
      </div>

      <div className="mt-8">
        <button
          className="group gap-x-2 rounded-3xl bg-neutral-800 text-white px-8 py-3 font-bold text-lg flex items-center hover:scale-[102%] duration-75"
          type="button"
          onClick={() => {
            copy(
              "npx @sly-cli/sly add @radix-ui/icons eraser --directory ./icons --overwrite --yes"
            )
            setIsCopied(true)
          }}
          onMouseOut={() => setIsCopied(false)}
        >
          Copy to clipboard
          <Icon
            name={isCopied ? "copy-check" : "copy"}
            className="w-6 h-6 group-hover:scale-110 group-hover:rotate-6 duration-150"
          />
        </button>
      </div>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Run this command and two svg icons will appear in your codebase
        immediately.
      </p>

      <AddWithFlagsExample />

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        <strong>
          Sly is a CLI tool to add components, icons, and utilities as code
        </strong>
        , not dependencies.
      </p>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        With one command, or through an interactive prompt, you can choose a
        component from Sly's registry and it will appear in your codebase, in
        exactly the format it would be if you had written it yourself.
      </p>

      <ul className="mt-4 list-disc ml-8 text-xl text-neutral-600 space-y-2">
        <li>
          Automatically customize each component with{" "}
          <a href="#transformers"> transformers. </a>
        </li>
        <li>
          Write <a href="#transformers"> postinstall</a> scripts that run each
          time you add a component.
        </li>
        <li>Only source code, no minified bundle output. code. </li>
        <li>
          Prevent supply chain attacks by detaching from automatic updates.
        </li>
        <li>
          <a href="#self-host">Host your own registry</a> and share code across
          your organization.
        </li>
      </ul>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Joyou<b>sly</b> interactive
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you don't provide any flags to the CLI, Sly will walk you through
        choosing which libraries and components you want to add
      </p>

      <AddExample />

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">
        Icon libraries
      </h3>

      <p className="mt-4 max-w-prose text-xl text-neutral-600">
        Sly can add SVG files to your project, and automatically kick off a
        postinstall script that{" "}
        <a
          href="https://www.jacobparis.com/content/svg-icons"
          target="_blank"
          rel="noopener  noreferrer"
          className="hover:underline"
        >
          generates an SVG spritesheet and updates the types for your Icon
          component.
        </a>
      </p>

      <ul className="mt-8 flex flex-wrap text-xl text-neutral-600 gap-x-4 gap-y-2">
        {iconLibraries.map(({ source, name }) => (
          <li key={source}>
            <a
              href={source}
              target="_blank"
              rel="noopener  noreferrer"
              className="block shadow-sm px-4 py-2 bg-neutral-100 rounded-3xl no-underline hover:bg-neutral-200"
            >
              {name}
            </a>
          </li>
        ))}
      </ul>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">
        UI component libraries
      </h3>

      <p className="mt-4 max-w-prose text-xl text-neutral-600">
        Use Sly to add UI components into your codebase, then run transformer
        functions on each to customize their colors, import paths, and more.
      </p>

      <ul className="mt-8 flex flex-wrap text-xl text-neutral-600 gap-x-4 gap-y-2">
        {uiLibraries.map(({ source, name }) => (
          <li key={source}>
            <a
              href={source}
              target="_blank"
              rel="noopener  noreferrer"
              className="block shadow-sm px-4 py-2 bg-neutral-100 rounded-3xl no-underline hover:bg-neutral-200"
            >
              {name}
            </a>
          </li>
        ))}
      </ul>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">
        Utility functions
      </h3>

      <p className="mt-4 max-w-prose text-xl text-neutral-600">
        Grab one-off functions instead of installing a full-featured library.
      </p>

      <ul className="mt-8 flex flex-wrap text-xl text-neutral-600 gap-x-4 gap-y-2">
        {utilLibraries.map(({ source, name }) => (
          <li key={source}>
            <a
              href={source}
              target="_blank"
              rel="noopener  noreferrer"
              className="block shadow-sm px-4 py-2 bg-neutral-100 rounded-3xl no-underline hover:bg-neutral-200"
            >
              {name}
            </a>
          </li>
        ))}
      </ul>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">Used by</h3>

      <div className="mt-4 max-w-prose">
        <a
          className="group !no-underline"
          href="https://github.com/epicweb-dev/epic-stack/discussions/333"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="sr-only"> Epic Stack </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="228"
            height="48"
            fill="none"
            viewBox="0 0 228 48"
            aria-hidden
            className="text-neutral-500 group-hover:text-violet-600"
          >
            <path
              fill="currentcolor"
              d="m20.677 12.674-1.806 6.197-6.185 1.806L0 0l20.677 12.674Zm6.646 0 1.806 6.197 6.185 1.806L48 0 27.323 12.674ZM29.13 29.13l-1.806 6.197L48 48 35.314 27.323 29.13 29.13Zm-8.452 6.197-1.806-6.197-6.185-1.806L0 48l20.677-12.674Z"
              fill-rule="evenodd"
              clip-rule="evenodd"
            ></path>
            <path
              fill="currentcolor"
              d="M145.523 33.556c-3.354 0-5.838-1.665-6.786-4.404l2.049-1.178c.691 2.176 2.304 3.252 4.788 3.252 2.458 0 3.79-1.101 3.79-2.766 0-.845-.333-1.485-.973-1.92-.64-.436-1.741-.871-3.252-1.357l-1.716-.564a26.477 26.477 0 0 1-1.485-.666c-.589-.307-1.024-.614-1.306-.921-.589-.64-1.127-1.69-1.127-2.996 0-1.562.538-2.792 1.639-3.688 1.101-.921 2.433-1.382 3.995-1.382 2.842 0 5.019 1.562 6.069 3.917l-1.998 1.153c-.768-1.844-2.125-2.766-4.071-2.766-1.946 0-3.252 1.024-3.252 2.663 0 .794.282 1.383.845 1.793.563.41 1.536.845 2.919 1.28l1.05.333c.205.077.512.18.947.358.897.333 1.101.461 1.793.845.717.384.947.666 1.382 1.178.641.64.897 1.562.897 2.689 0 1.562-.564 2.817-1.716 3.764-1.152.922-2.637 1.383-4.481 1.383Zm10.758-18.257h12.931v2.253h-5.301v15.67h-2.355v-15.67h-5.275v-2.253Zm31.804 17.924h-2.535l-1.46-4.02h-8.066l-1.459 4.02h-2.535l6.683-17.924h2.689l6.683 17.924Zm-8.041-15.082-3.2 8.834h6.427l-3.227-8.834Zm20.884 15.415c-2.714 0-4.967-.896-6.734-2.689-1.767-1.792-2.638-3.995-2.638-6.606 0-2.612.871-4.814 2.638-6.607 1.767-1.792 4.02-2.688 6.734-2.688 3.278 0 6.197 1.69 7.733 4.353l-2.074 1.203c-1.024-1.971-3.2-3.252-5.659-3.252-2.074 0-3.764.666-5.07 1.997-1.306 1.332-1.946 2.996-1.946 4.994 0 1.971.64 3.636 1.946 4.967 1.306 1.332 2.996 1.998 5.07 1.998 2.459 0 4.635-1.28 5.659-3.227l2.074 1.178c-.742 1.332-1.818 2.407-3.2 3.2-1.383.795-2.894 1.179-4.533 1.179Zm18.572-9.551 8.168 9.218h-2.919l-7.733-8.604v8.604h-2.382V15.299h2.382v8.091l7.477-8.091h2.919l-7.912 8.706Z"
            ></path>
            <path
              fill="currentcolor"
              d="M104.912 14.5h-8.094v1.679h2.875v17.044h2.381V16.18h2.838V14.5Zm-40.61 16.47v-5.685h7.554v-2.227h-7.554v-5.506h8.194V15.3H61.92v17.924h10.704V30.97h-8.322ZM86.74 15.299h-6.504v17.924h2.381v-6.401h4.123c1.664 0 3.021-.564 4.123-1.665 1.1-1.1 1.664-2.484 1.664-4.097 0-1.639-.563-2.996-1.665-4.097-1.1-1.1-2.458-1.664-4.122-1.664Zm0 9.295h-4.123v-7.068h4.123c1.972 0 3.431 1.486 3.431 3.534 0 .999-.333 1.844-.973 2.535-.64.666-1.46.999-2.458.999Zm25.606 6.273c1.767 1.793 4.021 2.689 6.735 2.689 1.639 0 3.149-.384 4.532-1.178 1.383-.794 2.458-1.87 3.201-3.2L124.74 28c-1.024 1.945-3.201 3.226-5.659 3.226-2.074 0-3.764-.666-5.07-1.997-1.306-1.332-1.946-2.996-1.946-4.968 0-1.997.64-3.662 1.946-4.993 1.306-1.332 2.996-1.998 5.07-1.998 2.458 0 4.635 1.28 5.659 3.252l2.074-1.203c-1.536-2.663-4.456-4.353-7.733-4.353-2.714 0-4.968.896-6.735 2.688-1.766 1.793-2.637 3.995-2.637 6.607s.871 4.814 2.637 6.606Z"
              fill-rule="evenodd"
              clip-rule="evenodd"
            ></path>
            <path
              fill="currentcolor"
              d="M96.819 31.821h8.093V33.5h-8.094v-1.68Z"
            ></path>
          </svg>
        </a>
      </div>

      <div className="mt-16 bg-neutral-200 rounded-3xl p-8 -mx-8">
        <h2 className="font-bold text-3xl text-neutral-600">
          Seriou<b>sly</b> simple
        </h2>

        <p className="mt-8  max-w-prose text-xl text-neutral-600">
          If you install Sly first, run <Code>npx sly</Code> instead of{" "}
          <Code>npx @sly-cli/sly</Code>
        </p>
      </div>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Generou<b>sly</b> configurable
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        You can configure each library individually, either via the CLI or by
        editing the config file directly.
      </p>

      <ConfigExample />

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Before a new component is saved, Sly processes it through a pipeline of
        transformer functions that you can include.
        <br />
        <br />
        For example, you could use a transformer to:
      </p>

      <ul className="mt-4 list-disc ml-8 text-xl text-neutral-600 space-y-2">
        <li>enforce opinionated formatting preferences</li>
        <li>
          replace imported util functions with the path to your own utils
          folder,
        </li>
        <li>to remove attributes from SVGs, </li>
        <li>modify colors to match your brand </li>
      </ul>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Instructions in reverse
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Sly does <strong>not</strong> require a config file{" "}
        <strong> IF </strong> you provide enough information in the command, so
        instead of telling you what each option does, let's go through what
        happens if you <strong>don&rsquo;t</strong> include each option
      </p>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        As an example, we'll install <Code>eraser</Code> icon from
        <Code>@radix-ui/icons</Code>.
      </p>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">--overwrite</h3>

      <CodeBlock>
        {">"} npx @sly-cli/sly add @radix-ui/icons eraser --directory ./icons
        --overwrite --yes
      </CodeBlock>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you don't provide <Code>--overwrite</Code>, the installation will
        fail if the file already exists.
      </p>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">--yes</h3>

      <CodeBlock>
        {">"} npx @sly-cli/sly add @radix-ui/icons eraser --directory ./icons
        --yes
      </CodeBlock>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you don't provide <Code>--yes</Code>, you will be prompted to confirm
        the installation before a file is written.
      </p>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">--directory</h3>

      <CodeBlock>
        {">"} npx @sly-cli/sly add @radix-ui/icons eraser --directory ./icons
      </CodeBlock>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you don't provide <Code>--directory</Code>, Sly will look for your{" "}
        <Code>sly.json</Code>
        file and look for the directory field under <Code>
          @radix-ui/icons
        </Code>{" "}
        in the config. **If Sly can't find that config file, you will be asked
        which directory you want to install the icon to** and Sly will create a
        <Code>sly.json</Code> file for you.
      </p>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">component</h3>

      <CodeBlock>{">"} npx @sly-cli/sly add @radix-ui/icons eraser</CodeBlock>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you don't provide a component name like <Code>eraser</Code>, **Sly
        will show you a list of all the icons available** in{" "}
        <Code>@radix-ui/icons</Code> and ask you to select the ones you want.
      </p>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">library</h3>

      <CodeBlock>{">"} npx @sly-cli/sly add @radix-ui/icons</CodeBlock>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you don't provide <Code>@radix-ui/icons</Code>, Sly will show you a
        list of all the libraries you've configured and ask you to select the
        one you want before proceeding to show you the list of icons.
      </p>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">add</h3>

      <CodeBlock>{">"} npx @sly-cli/sly add</CodeBlock>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you don't provide add, you're at the root of the CLI and will get a
        help menu
      </p>

      <h3 className="mt-16 font-bold text-2xl text-neutral-600">
        npx @sly-cli/sly
      </h3>

      <CodeBlock>{">"} npx @sly-cli/sly</CodeBlock>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you don't provide <Code>@sly-cli/sly</Code>, it might be because
        you've installed Sly already and you can just run <Code>sly</Code>{" "}
        directly.
      </p>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Shameles<b>sly</b> open source
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Sly is{" "}
        <a
          href="https://github.com/jacobparis-insiders/sly"
          target="_blank"
          rel="noopener noreferrer"
        >
          free and open source.
        </a>{" "}
      </p>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you have your own proprietary component library, you can host your
        own registry and share code across your organization using Sly{" "}
      </p>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">Get started</h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Add Sly to your project and
      </p>

      <InstallExample />

      <p className="mt-8 max-w-prose text-xl text-neutral-600 text-center flex items-center justify-center">
        made&nbsp;&nbsp;&nbsp;&nbsp;with&nbsp;&nbsp;&nbsp;&nbsp;❤️{" "}
        <a
          className="group inline-block text-xl font-medium ml-4 align-middle !no-underline"
          href="https://twitter.com/intent/follow?screen_name=jacobmparis"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="text-neutral-600 group-hover:underline">
            by <span className="group-hover:opacity-100 opacity-0">@</span>jacob
            <span className="group-hover:opacity-100 opacity-0">m</span>paris
          </span>
        </a>
      </p>
    </div>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-neutral-800 px-10 py-8 -mx-10 rounded-3xl mt-4 overflow-x-auto">
      <code className="text-slate-200 text-lg">{children}</code>
    </pre>
  )
}
function InstallExample() {
  return (
    <div>
      <CodeBlock>{">"} npm i --save-dev @sly-cli/sly</CodeBlock>
      <CodeBlock>{">"} npx sly add</CodeBlock>
    </div>
  )
}

function AddWithFlagsExample() {
  return (
    <CodeBlock>
      {">"} npx @sly-cli/sly add @radix-ui/icons camera card-stack --yes
      --directory ./svg-icons
      <br />
      <br />
      <span className="text-slate-400">⠸</span> Adding camera...
      <br />
      <span className="text-green-400">✔</span> <strong>Added</strong>{" "}
      /svg-icons/camera.svg
      <br />
      <br />
      <span className="text-slate-400">⠸</span> Adding card-stack...
      <br />
      <span className="text-green-400">✔</span> <strong>Added</strong>{" "}
      /svg-icons/card-stack.svg
    </CodeBlock>
  )
}

function AddExample() {
  return (
    <CodeBlock>
      {">"} npx @sly-cli/sly add
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
      /svg-icons/camera.svg
      <br />
      <br />
      <span className="text-slate-400">⠸</span> Adding card-stack...
      <br />
      <span className="text-green-400">✔</span> <strong>Added</strong>{" "}
      /svg-icons/card-stack.svg
    </CodeBlock>
  )
}
function ConfigExample() {
  return (
    <CodeBlock>
      {"{\n"}
      {"  "}
      <span className="text-orange-300">"$schema"</span>
      {": "}
      <span className="text-cyan-200">
        "https://sly-cli.fly.dev/registry/config.json"
      </span>
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
      <span className="text-cyan-200">"./svg-icons"</span>
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
      <span className="text-cyan-200">"sly/svg-remove-dimensions.ts"</span>
      {",\n"}
      {"        "}
      <span className="text-cyan-200">"sly/html-prettier.ts"</span>
      {",\n"}
      {"        "}
      <span className="text-cyan-200">"sly/html-add-license-info.js"</span>
      {",\n"}
      {"      ]\n"}
      {"    }\n"}
      {"  ]\n"}
      {"}\n"}
    </CodeBlock>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-sans font-medium bg-neutral-100 rounded-md px-1 -z-10 inline-block">
      {children}
    </code>
  )
}
