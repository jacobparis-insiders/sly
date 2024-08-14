import { expect, test } from "vitest"
import { minifyPatch } from "./minifyPatch.js"

expect.addSnapshotSerializer({
  test: (val) => typeof val === "string",
  serialize: (val) => val,
})

function createPatch(body: string) {
  return `
--- a/file
+++ b/file
${body}
`.replace(/^\n/, "")
}

test("handles correct patch", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
- const greeting = "hello"
+ const greeting = "hello world"
`)

  expect(minifyPatch(patchText)).toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -1,1 +1,1 @@
    - const greeting = "hello"
    + const greeting = "hello world"
  `)
})

test("removes empty hunk", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
`)

  expect(minifyPatch(patchText)).toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
  `)
})

test("splits hunks into contextless batches", () => {
  const patchText = createPatch(`
@@ -34,19 +27,16 @@
 } from './components/ui/dropdown-menu.tsx'
 import { Icon, href as iconsHref } from './components/ui/icon.tsx'
 import { EpicToaster } from './components/ui/sonner.tsx'
 import { ThemeSwitch, useTheme } from './routes/resources+/theme-switch.tsx'
 import tailwindStyleSheetUrl from './styles/tailwind.css?url'
 import { getUserId, logout } from './utils/auth.server.ts'
-import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
 import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
 import { prisma } from './utils/db.server.ts'
 import { getEnv } from './utils/env.server.ts'
 import { honeypot } from './utils/honeypot.server.ts'
 import { combineHeaders, getDomainUrl, getUserImgSrc } from './utils/misc.tsx'
 import { useNonce } from './utils/nonce-provider.ts'
-import { useRequestInfo } from './utils/request-info.ts'
-import { type Theme, setTheme, getTheme } from './utils/theme.server.ts'
 import { type Theme, getTheme } from './utils/theme.server.ts'
 import { makeTimings, time } from './utils/timing.server.ts'
 import { getToast } from './utils/toast.server.ts'
 import { useOptionalUser, useUser } from './utils/user.ts'
`)

  expect(minifyPatch(patchText)).toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -40,1 +33,0 @@
    -import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
    @@ -47,2 +40,0 @@
    -import { useRequestInfo } from './utils/request-info.ts'
    -import { type Theme, setTheme, getTheme } from './utils/theme.server.ts'
  `)
})

test("removes hunks with only context and empty lines", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
  Hello
  World
+ 
`)

  expect(minifyPatch(patchText)).toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
  `)
})

test("uses correct hunk lengths", () => {
  const patchText = createPatch(`
@@ -12,11 +11,11 @@
 import helmet from 'helmet'
 import morgan from 'morgan'
-
 const MODE = process.env.NODE_ENV ?? 'development'
+const IS_PROD = MODE === 'production'
+const IS_DEV = MODE === 'development'
+const ALLOW_INDEXING = process.env.ALLOW_INDEXING !== 'false'
 
-const createRequestHandler =
-		: _createRequestHandler
 if (IS_PROD && process.env.SENTRY_DSN) {
 	void import('./utils/monitoring.js').then(({ init }) => init())
 }
`)

  expect(minifyPatch(patchText)).toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -16,1 +15,4 @@
    +const IS_PROD = MODE === 'production'
    +const IS_DEV = MODE === 'development'
    +const ALLOW_INDEXING = process.env.ALLOW_INDEXING !== 'false'
     
    @@ -20,2 +19,0 @@
    -const createRequestHandler =
    -		: _createRequestHandler
  `)
})
