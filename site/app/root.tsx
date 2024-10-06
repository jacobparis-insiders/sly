// http://localhost:3000

import { Outlet, Scripts, ScrollRestoration } from "react-router"
import { ButtonLink } from "./components/ButtonLink"
import { Icon } from "./components/icon"

import './tailwind.css'

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title> Sly </title>
        <style>
          {`.bg-light {
          -webkit-backdrop-filter: blur(1.5rem) saturate(200%) contrast(50%) brightness(130%);
          backdrop-filter: blur(1.5rem) saturate(200%) contrast(50%) brightness(130%);
          background-color: rgba(255, 255, 255, 0.2);
        }`}
        </style>
      </head>
      <body className="[&_a]:font-bold [&_a]:text-black">
        <div>
          <div className="sticky top-0 z-30 mb-8 h-16">
            <div
              className="bg-light absolute inset-0 bottom-4"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0, black 3rem, transparent 3rem)",
              }}
            />
            <div className="py-1 relative z-10">
              <div className="max-w-5xl mx-auto px-4 flex justify-between">
                <div className="flex items-center">
                  <a href="/" className="text-2xl font-bold">
                    Sly CLI
                  </a>
                </div>
                <ul className="flex flex-row flex-wrap justify-center print:flex-col print:gap-2">
                  <li>
                    <ButtonLink
                      className="flex items-center rounded-3xl px-4 py-2"
                      to="https://github.com/jacobparis-insiders/sly"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="brand-github" className="h-6 w-6">
                        <span className="hidden sm:inline">Github</span>
                      </Icon>
                    </ButtonLink>
                  </li>

                  <li>
                    <ButtonLink
                      className="flex items-center rounded-3xl px-4 py-2"
                      to="https://twitter.com/jacobmparis"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="brand-twitter" className="h-6 w-6">
                        <span className="hidden sm:inline">Twitter</span>
                      </Icon>
                    </ButtonLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
