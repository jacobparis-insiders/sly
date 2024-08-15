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
     import { useForm, getFormProps } from '@conform-to/react'
    -import { invariantResponse } from '@epic-web/invariant'
     context
    @@ -1,4 +1,3 @@
     context
    -import { useForm, getFormProps } from '@conform-to/react'
     import { invariantResponse } from '@epic-web/invariant'
     context
  `)
})
