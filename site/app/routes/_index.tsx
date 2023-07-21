// http://localhost:3000/
// https://sly-cli.fly.dev/

import type { V2_MetaFunction } from "@remix-run/node"

export const meta: V2_MetaFunction = () => {
  return [
    { title: "Add code, not dependencies, with Sly CLi" },
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
          Add code, not dependencies
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
        Some code is meant to be customized, duplicated, and rewritten. For all
        the kinds of code you may find yourself copy/pasting from the internet,
        or from your other projects, Sly is here to help.
      </p>

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
        Seriou<b>sly</b> simple
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Run this command and two svg icons will appear in your codebase
        immediately.
      </p>

      <AddWithFlagsExample />

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        If you install Sly first, you can run `npx sly add` instead.
      </p>

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Joyou<b>sly</b> interactive
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        Sly will walk you through choosing which libraries and components to
        pick
      </p>

      <AddExample />

      <h2 className="mt-16 font-bold text-3xl text-neutral-600">
        Ambitiou<b>sly</b> growing
      </h2>

      <p className="mt-8 max-w-prose text-xl text-neutral-600">
        There are currently 3 libraries available, but <strong>many</strong>{" "}
        more are coming soon.
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
        ].map(({ href, name }) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener  noreferrer">
              {name}
            </a>
          </li>
        ))}
      </ul>

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

function InstallExample() {
  return (
    <div>
      <pre className="bg-slate-600 px-8 py-4 rounded-lg mt-4">
        <code className="text-slate-200 text-lg">
          {">"} npm i --save-dev @sly-cli/sly
        </code>
      </pre>
      <pre className="bg-slate-600 px-8 py-4 rounded-lg mt-4">
        <code className="text-slate-200 text-lg">{">"} npx sly add</code>
      </pre>
    </div>
  )
}

function AddWithFlagsExample() {
  return (
    <pre className="bg-slate-600 px-8 py-4 rounded-lg mt-4 overflow-x-scroll">
      <code className="text-slate-200 text-lg">
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
      </code>
    </pre>
  )
}

function AddExample() {
  return (
    <pre className="bg-slate-600 px-8 py-4 rounded-lg mt-4 overflow-x-scroll">
      <code className="text-slate-200 text-lg">
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
      </code>
    </pre>
  )
}
function ConfigExample() {
  return (
    <pre className="bg-slate-600 px-8 py-4 rounded-lg mt-4 overflow-x-scroll">
      <code className="text-slate-200 text-lg">
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
      </code>
    </pre>
  )
}
