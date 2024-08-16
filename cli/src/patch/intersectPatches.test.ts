import { test, expect } from "vitest"
import { intersectPatches } from "./intersectPatches.js"

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

test("returns same number of hunks as patch b", () => {
  const patchA = createPatch(`
@@ -1,4 +1,2 @@
 context
-import { useForm, getFormProps } from '@conform-to/react'
-import { invariantResponse } from '@epic-web/invariant'
 context
`)

  const patchB = createPatch(`
@@ -1,1 +1,0 @@
-import { useForm, getFormProps } from '@conform-to/react'
@@ -1,1 +1,0 @@
-import { invariantResponse } from '@epic-web/invariant'
`)

  const numberOfHunks = patchB.split("\n@@ -").length - 1
  const result = intersectPatches(patchA, patchB)
  expect(result.split("\n@@ -").length - 1).toBe(numberOfHunks)
})

test("retains lines not present in b", () => {
  const patchA = createPatch(`
@@ -1,4 +1,2 @@
 context
-import { useForm, getFormProps } from '@conform-to/react'
-import { invariantResponse } from '@epic-web/invariant'
 context
`)

  const patchB = createPatch(`
@@ -1,1 +1,0 @@
-import { useForm, getFormProps } from '@conform-to/react'
@@ -1,1 +1,0 @@
-import { invariantResponse } from '@epic-web/invariant'
`)

  expect(intersectPatches(patchA, patchB)).toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -1,4 +1,3 @@
     context
    -import { useForm, getFormProps } from '@conform-to/react'
     import { invariantResponse } from '@epic-web/invariant'
     context
    @@ -1,4 +1,3 @@
     context
     import { useForm, getFormProps } from '@conform-to/react'
    -import { invariantResponse } from '@epic-web/invariant'
     context
  `)
})

test("something", () => {
  const patchA = `--- a/package.json
+++ b/package.json
@@ -4,2 +4,6 @@
   "type": "module",
+  "epic-stack": {
+    "head": "5e8df6fa4392107f978906e1a04fa00705f37dde",
+    "date": "2024-08-12T05:40:24Z"
+  },
   "imports": {
@@ -6,1 +6,2 @@
 context
-    "#*": "./*"
+    "#app/*": "./app/*",
+    "#tests/*": "./tests/*"
 context
@@ -11,1 +11,1 @@
 context
-    "build:remix": "remix vite:build --sourcemapClient",
+    "build:remix": "remix vite:build",
 context
@@ -56,2 +61,3 @@
 context
+    "@testing-library/dom": "^10.3.2",
     "@total-typescript/ts-reset": "^0.5.1",
     "@types/bcryptjs": "^2.4.6",
 context
@@ -107,1 +112,1 @@
 context
-    "@sly-cli/sly": "^1.10.0",
+    "@sly-cli/sly": "file:../sly/cli",
 context
`

  const patchB = `@@ -7,1 +7,2 @@
-    "#*": "./*"
+    "#app/*": "./app/*",
+    "#tests/*": "./tests/*"
@@ -12,1 +12,1 @@
-    "build:remix": "remix vite:build --sourcemapClient",
+    "build:remix": "remix vite:build",
@@ -159,1 +164,1 @@
-    "@sly-cli/sly": "^1.10.0",
+    "@sly-cli/sly": "file:../sly/cli",`

  expect(intersectPatches(patchA, patchB)).toMatchInlineSnapshot(`
    --- a/package.json
    +++ b/package.json
    @@ -6,3 +6,4 @@
     context
    -    "#*": "./*"
    +    "#app/*": "./app/*",
    +    "#tests/*": "./tests/*"
     context
    @@ -11,3 +11,3 @@
     context
    -    "build:remix": "remix vite:build --sourcemapClient",
    +    "build:remix": "remix vite:build",
     context
    @@ -112,3 +112,3 @@
     context
    -    "@sly-cli/sly": "^1.10.0",
    +    "@sly-cli/sly": "file:../sly/cli",
     context
  `)
})
