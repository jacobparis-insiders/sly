import { expect, test } from "vitest"
import { correctFilePatch } from "./correctFilePatch.js"

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

  const targetFileContent = `
const greeting = "hello"
`
  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -1,1 +1,1 @@
    - const greeting = "hello"
    + const greeting = "hello world"
  `)
})

test("corrects single line number", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
- const greeting = "hello"
+ const greeting = "hello world"
`)

  const targetFileContent = `
// comment
// comment
// comment
const greeting = "hello"
`
  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -4,1 +4,1 @@
    - const greeting = "hello"
    + const greeting = "hello world"
  `)
})

test("removes empty hunk", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
`)

  const targetFileContent = `
const greeting = "hello"
`
  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
  `)
})

test("removes empty diff", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
`)

  const targetFileContent = `
const greeting = "hello"
`
  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
  `)
})

test("deletes adds if already present", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
-   "execa": "^8.0.1",
-   "express": "^4.18.3",
+   "better-sqlite3": "^11.1.2",
+   "clsx": "^2.1.1",
+   "execa": "^9.3.0",
+   "express": "^4.19.2",
`)

  const targetFileContent = `
    "better-sqlite3": "^11.1.2",
    "clsx": "^2.1.1",
    "execa": "^8.0.1",
    "express": "^4.18.3",
    "express-rate-limit": "^7.2.0",
    "get-port": "^7.1.0",
    "glob": "^11.0.0",
`
  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -3,4 +3,4 @@
    -    "execa": "^8.0.1",
    -    "express": "^4.18.3",
         "better-sqlite3": "^11.1.2",
         "clsx": "^2.1.1",
    +    "execa": "^9.3.0",
    +    "express": "^4.19.2",
  `)
})

test("matches indents", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
-     const greeting = "hello"
+     const greeting = "hello world"
`)

  const targetFileContent = `
function main() {
\t\tconst greeting = "hello"
}
`
  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -2,1 +2,1 @@
    -		const greeting = "hello"
    +		const greeting = "hello world"
  `)
})

test("matches indent when diff is deep", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
-     const greeting = "hello"
+     const greeting = "hello world"
`)

  const targetFileContent = `
function main() {
  if (!rude) {
    const greeting = "hello"
  }
}
`
  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/file
    +++ b/file
    @@ -3,1 +3,1 @@
    -     const greeting = "hello"
    +     const greeting = "hello world"
  `)
})

test("remove missing initial line", () => {
  const patchText = `
diff --git a/app/root.tsx b/app/root.tsx
index d984345..1088069 100644
--- a/app/root.tsx
+++ b/app/root.tsx
@@ -1,10 +1,6 @@
-import { useForm, getFormProps } from '@conform-to/react'
-import { parseWithZod } from '@conform-to/zod'
-import { invariantResponse } from '@epic-web/invariant'
 import {
 	json,
 	type LoaderFunctionArgs,
-	type ActionFunctionArgs,
 	type HeadersFunction,
 	type LinksFunction,
 	type MetaFunction,
`

  const targetFileContent = `
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
`

  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/app/root.tsx
    +++ b/app/root.tsx
    @@ -1,9 +1,6 @@
    -import { parseWithZod } from '@conform-to/zod'
    -import { invariantResponse } from '@epic-web/invariant'
     import {
     	json,
     	type LoaderFunctionArgs,
    -	type ActionFunctionArgs,
     	type HeadersFunction,
     	type LinksFunction,
     	type MetaFunction,
  `)
})

test("remove missing intermediate line", () => {
  const patchText = `
diff --git a/app/root.tsx b/app/root.tsx
index d984345..1088069 100644
--- a/app/root.tsx
+++ b/app/root.tsx
@@ -1,10 +1,6 @@
-import { useForm, getFormProps } from '@conform-to/react'
-import { parseWithZod } from '@conform-to/zod'
-import { invariantResponse } from '@epic-web/invariant'
 import {
 	json,
 	type LoaderFunctionArgs,
-	type ActionFunctionArgs,
 	type HeadersFunction,
 	type LinksFunction,
 	type MetaFunction,
`

  const targetFileContent = `
import { useForm, getFormProps } from '@conform-to/react'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
`

  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/app/root.tsx
    +++ b/app/root.tsx
    @@ -1,9 +1,6 @@
    -import { useForm, getFormProps } from '@conform-to/react'
    -import { invariantResponse } from '@epic-web/invariant'
     import {
     	json,
     	type LoaderFunctionArgs,
    -	type ActionFunctionArgs,
     	type HeadersFunction,
     	type LinksFunction,
     	type MetaFunction,
  `)
})

test("remove missing intermediate line with extras", () => {
  const patchText = `
diff --git a/app/root.tsx b/app/root.tsx
index d984345..1088069 100644
--- a/app/root.tsx
+++ b/app/root.tsx
@@ -1,10 +1,6 @@
-import { useForm, getFormProps } from '@conform-to/react'
-import { parseWithZod } from '@conform-to/zod'
-import { invariantResponse } from '@epic-web/invariant'
 import {
 	json,
 	type LoaderFunctionArgs,
-	type ActionFunctionArgs,
 	type HeadersFunction,
 	type LinksFunction,
 	type MetaFunction,
`

  const targetFileContent = `
import { useForm, getFormProps } from '@conform-to/react'
import { blag } from 'blag'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
`

  expect(correctFilePatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
    --- a/app/root.tsx
    +++ b/app/root.tsx
    @@ -1,9 +1,6 @@
    -import { useForm, getFormProps } from '@conform-to/react'
    -import { invariantResponse } from '@epic-web/invariant'
     import {
     	json,
     	type LoaderFunctionArgs,
    -	type ActionFunctionArgs,
     	type HeadersFunction,
     	type LinksFunction,
     	type MetaFunction,
  `)
})

test("does not mangle the function", () => {
  const patchText = `
--- a/app/root.tsx
+++ b/app/root.tsx
@@ -1,10 +1,6 @@
-import { useForm, getFormProps } from '@conform-to/react'
-import { parseWithZod } from '@conform-to/zod'
-import { invariantResponse } from '@epic-web/invariant'
 import {
 	json,
 	type LoaderFunctionArgs,
-	type ActionFunctionArgs,
 	type HeadersFunction,
 	type LinksFunction,
 	type MetaFunction,
@@ -17,8 +13,6 @@ import {
 	Outlet,
 	Scripts,
 	ScrollRestoration,
-	useFetcher,
-	useFetchers,
 	useLoaderData,
 	useMatches,
 	useSubmit,
@@ -26,7 +20,6 @@ import {
 import { withSentry } from '@sentry/remix'
 import { useRef } from 'react'
 import { HoneypotProvider } from 'remix-utils/honeypot/react'
-import { z } from 'zod'
 import { GeneralErrorBoundary } from './components/error-boundary.tsx'
 import { EpicProgress } from './components/progress-bar.tsx'
 import { SearchBar } from './components/search-bar.tsx'
@@ -41,16 +34,16 @@ import {
 } from './components/ui/dropdown-menu.tsx'
 import { Icon, href as iconsHref } from './components/ui/icon.tsx'
 import { EpicToaster } from './components/ui/sonner.tsx'
+import { ThemeSwitch, useTheme } from './routes/resources+/theme-switch.tsx'
 import tailwindStyleSheetUrl from './styles/tailwind.css?url'
 import { getUserId, logout } from './utils/auth.server.ts'
-import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
+import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
 import { prisma } from './utils/db.server.ts'
 import { getEnv } from './utils/env.server.ts'
 import { honeypot } from './utils/honeypot.server.ts'
 import { combineHeaders, getDomainUrl, getUserImgSrc } from './utils/misc.tsx'
 import { useNonce } from './utils/nonce-provider.ts'
-import { useRequestInfo } from './utils/request-info.ts'
-import { type Theme, setTheme, getTheme } from './utils/theme.server.ts'
+import { type Theme, getTheme } from './utils/theme.server.ts'
 import { makeTimings, time } from './utils/timing.server.ts'
 import { getToast } from './utils/toast.server.ts'
 import { useOptionalUser, useUser } from './utils/user.ts'
@@ -59,7 +52,6 @@ export const links: LinksFunction = () => {
 	return [
 		// Preload svg sprite as a resource to avoid render blocking
 		{ rel: 'preload', href: iconsHref, as: 'image' },
-		// Preload CSS as a resource to avoid render blocking
 		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
 		{
 			rel: 'alternate icon',
@@ -72,7 +64,6 @@ export const links: LinksFunction = () => {
 			href: '/site.webmanifest',
 			crossOrigin: 'use-credentials',
 		} as const, // necessary to make typescript happy
-		//These should match the css preloads above to avoid css as render blocking resource
 		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
 		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
 	].filter(Boolean)
@@ -156,36 +147,18 @@ export const headers: HeadersFunction = ({ loaderHeaders }) => {
 	return headers
 }
 
-const ThemeFormSchema = z.object({
-	theme: z.enum(['system', 'light', 'dark']),
-})
-
-export async function action({ request }: ActionFunctionArgs) {
-	const formData = await request.formData()
-	const submission = parseWithZod(formData, {
-		schema: ThemeFormSchema,
-	})
-
-	invariantResponse(submission.status === 'success', 'Invalid theme received')
-
-	const { theme } = submission.value
-
-	const responseInit = {
-		headers: { 'set-cookie': setTheme(theme) },
-	}
-	return json({ result: submission.reply() }, responseInit)
-}
-
 function Document({
 	children,
 	nonce,
 	theme = 'light',
 	env = {},
+	allowIndexing = true,
 }: {
 	children: React.ReactNode
 	nonce: string
 	theme?: Theme
 	env?: Record<string, string>
+	allowIndexing?: boolean
 }) {
 	return (
 		<html lang="en" >
@@ -194,6 +167,9 @@ function Document({
 				<Meta />
 				<meta charSet="utf-8" />
 				<meta name="viewport" content="width=device-width,initial-scale=1" />
+				{allowIndexing ? null : (
+					<meta name="robots" content="noindex, nofollow" />
+				)}
 				<Links />
 			</head>
 			<body className="bg-background text-foreground">
@@ -217,12 +193,18 @@ function App() {
 	const user = useOptionalUser()
 	const theme = useTheme()
 	const matches = useMatches()
-	const isOnSearchPage = matches.find(m => m.id === 'routes/users+/index')
+	const isOnSearchPage = matches.find((m) => m.id === 'routes/users+/index')
 	const searchBar = isOnSearchPage ? null : <SearchBar status="idle" />
+	const allowIndexing = data.ENV.ALLOW_INDEXING !== 'false'
 	useToast(data.toast)
 
 	return (
-		<Document nonce={nonce} theme={theme} env={data.ENV}>
+		<Document
+			nonce={nonce}
+			theme={theme}
+			allowIndexing={allowIndexing}
+			env={data.ENV}
+		>
 			<div className="flex h-screen flex-col justify-between">
 				<header className="container py-6">
 					<nav className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap md:gap-8">
@@ -293,7 +275,7 @@ function UserDropdown() {
 					<Link
 						to={\`/users/\${user.username}\`}
 						// this is for progressive enhancement
-						onClick={e => e.preventDefault()}
+						onClick={(e) => e.preventDefault()}
 						className="flex items-center gap-2"
 					>
 						<img
@@ -326,7 +308,7 @@ function UserDropdown() {
 					<DropdownMenuItem
 						asChild
 						// this prevents the menu from closing before the form submission is completed
-						onSelect={event => {
+						onSelect={(event) => {
 							event.preventDefault()
 							submit(formRef.current)
 						}}
@@ -343,84 +325,6 @@ function UserDropdown() {
 	)
 }
 
-/**
- * @returns the user's theme preference, or the client hint theme if the user
- * has not set a preference.
- */
-export function useTheme() {
-	const hints = useHints()
-	const requestInfo = useRequestInfo()
-	const optimisticMode = useOptimisticThemeMode()
-	if (optimisticMode) {
-		return optimisticMode === 'system' ? hints.theme : optimisticMode
-	}
-	return requestInfo.userPrefs.theme ?? hints.theme
-}
-
-/**
- * If the user's changing their theme mode preference, this will return the
- * value it's being changed to.
- */
-export function useOptimisticThemeMode() {
-	const fetchers = useFetchers()
-	const themeFetcher = fetchers.find(f => f.formAction === '/')
-
-	if (themeFetcher && themeFetcher.formData) {
-		const submission = parseWithZod(themeFetcher.formData, {
-			schema: ThemeFormSchema,
-		})
-
-		if (submission.status === 'success') {
-			return submission.value.theme
-		}
-	}
-}
-
-function ThemeSwitch({ userPreference }: { userPreference?: Theme | null }) {
-	const fetcher = useFetcher<typeof action>()
-
-	const [form] = useForm({
-		id: 'theme-switch',
-		lastResult: fetcher.data?.result,
-	})
-
-	const optimisticMode = useOptimisticThemeMode()
-	const mode = optimisticMode ?? userPreference ?? 'system'
-	const nextMode =
-		mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
-	const modeLabel = {
-		light: (
-			<Icon name="sun">
-				<span className="sr-only">Light</span>
-			</Icon>
-		),
-		dark: (
-			<Icon name="moon">
-				<span className="sr-only">Dark</span>
-			</Icon>
-		),
-		system: (
-			<Icon name="laptop">
-				<span className="sr-only">System</span>
-			</Icon>
-		),
-	}
-
-	return (
-		<fetcher.Form method="POST" {...getFormProps(form)}>
-			<input type="hidden" name="theme" value={nextMode} />
-			<div className="flex gap-2">
-				<button
-					type="submit"
-					className="flex h-8 w-8 cursor-pointer items-center justify-center"
-				>
-					{modeLabel[mode]}
-				</button>
-			</div>
-		</fetcher.Form>
-	)
-}
-
 export function ErrorBoundary() {
 	// the nonce doesn't rely on the loader so we can access that
 	const nonce = useNonce()`

  const targetFileContent = `import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useFetchers,
	useLoaderData,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { useToast } from './components/toaster.tsx'
import { href as iconsHref } from './components/ui/icon.tsx'
import { EpicToaster } from './components/ui/sonner.tsx'
import { KCDShop } from './kcdshop.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { combineHeaders, getDomainUrl } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { useRequestInfo } from './utils/request-info.ts'
import { type Theme, setTheme, getTheme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'

export const links: LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
		// Preload CSS as a resource to avoid render blocking
		{ rel: 'preload', href: tailwindStyleSheetUrl, as: 'style' },
		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
		{
			rel: 'alternate icon',
			type: 'image/png',
			href: '/favicons/favicon-32x32.png',
		},
		{ rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const, // necessary to make typescript happy
		//These should match the css preloads above to avoid css as render blocking resource
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	].filter(Boolean)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{ title: data ? 'Epic Notes' : 'Error | Epic Notes' },
		{ name: 'description', content: "Your own captain's log" },
	]
}

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const user = userId
		? await time(
				() =>
					prisma.user.findUniqueOrThrow({
						select: {
							id: true,
							name: true,
							username: true,
							image: { select: { id: true } },
							roles: {
								select: {
									name: true,
									permissions: {
										select: { entity: true, action: true, access: true },
									},
								},
							},
						},
						where: { id: userId },
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const { toast, headers: toastHeaders } = await getToast(request)
	const honeyProps = honeypot.getInputProps()

	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: {
					theme: getTheme(request),
				},
			},
			ENV: getEnv(),
			toast,
			honeyProps,
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
			),
		},
	)
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	const headers = {
		'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
	}
	return headers
}

const ThemeFormSchema = z.object({
	theme: z.enum(['system', 'light', 'dark']),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	})

	invariantResponse(submission.status === 'success', 'Invalid theme received')

	const { theme } = submission.value

	const responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	}
	return json({ result: submission.reply() }, responseInit)
}

function Document({
	children,
	nonce,
	theme = 'light',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string>
}) {
	return (
		<html lang="en">
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<Links />
			</head>
			<body className="bg-background text-foreground">
				{children}
				<script
					nonce={nonce}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<KCDShop />
			</body>
		</html>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const nonce = useNonce()
	const theme = useTheme()
	useToast(data.toast)

	return (
		<Document nonce={nonce} theme={theme} env={data.ENV}>
			<Outlet />
			<EpicToaster closeButton position="top-center" theme={theme} />
			<EpicProgress />
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<HoneypotProvider {...data.honeyProps}>
			<App />
		</HoneypotProvider>
	)
}

export default withSentry(AppWithProviders)

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	const hints = useHints()
	const requestInfo = useRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints.theme : optimisticMode
	}
	return requestInfo.userPrefs.theme ?? hints.theme
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(f => f.formAction === '/')

	if (themeFetcher && themeFetcher.formData) {
		const submission = parseWithZod(themeFetcher.formData, {
			schema: ThemeFormSchema,
		})

		if (submission.status === 'success') {
			return submission.value.theme
		}
	}
}

export function ErrorBoundary() {
	// the nonce doesn't rely on the loader so we can access that
	const nonce = useNonce()

	// NOTE: you cannot use useLoaderData in an ErrorBoundary because the loader
	// likely failed to run so we have to do the best we can.
	// We could probably do better than this (it's possible the loader did run).
	// This would require a change in Remix.

	// Just make sure your root route never errors out and you'll always be able
	// to give the user a better UX.

	return (
		<Document nonce={nonce}>
			<GeneralErrorBoundary />
		</Document>
	)
}
`

  expect(correctFilePatch(patchText, targetFileContent)).toMatchInlineSnapshot(`
    --- a/app/root.tsx
    +++ b/app/root.tsx
    @@ -1,9 +1,6 @@
    -import { parseWithZod } from '@conform-to/zod'
    -import { invariantResponse } from '@epic-web/invariant'
     import {
     	json,
     	type LoaderFunctionArgs,
    -	type ActionFunctionArgs,
     	type HeadersFunction,
     	type LinksFunction,
     	type MetaFunction,
    @@ -14,7 +10,6 @@
     	Outlet,
     	Scripts,
     	ScrollRestoration,
    -	useFetcher,
     	useLoaderData,
     	useMatches,
     	useSubmit,
    @@ -25,15 +18,16 @@
     } from './components/ui/dropdown-menu.tsx'
     import { Icon, href as iconsHref } from './components/ui/icon.tsx'
     import { EpicToaster } from './components/ui/sonner.tsx'
    +import { ThemeSwitch, useTheme } from './routes/resources+/theme-switch.tsx'
     import tailwindStyleSheetUrl from './styles/tailwind.css?url'
     import { getUserId, logout } from './utils/auth.server.ts'
    -import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
    +import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
     import { prisma } from './utils/db.server.ts'
     import { getEnv } from './utils/env.server.ts'
     import { honeypot } from './utils/honeypot.server.ts'
     import { combineHeaders, getDomainUrl, getUserImgSrc } from './utils/misc.tsx'
     import { useNonce } from './utils/nonce-provider.ts'
    -import { type Theme, setTheme, getTheme } from './utils/theme.server.ts'
    +import { type Theme, getTheme } from './utils/theme.server.ts'
     import { makeTimings, time } from './utils/timing.server.ts'
     import { getToast } from './utils/toast.server.ts'
     import { useOptionalUser, useUser } from './utils/user.ts'
    @@ -57,7 +49,6 @@
     			href: '/site.webmanifest',
     			crossOrigin: 'use-credentials',
     		} as const, // necessary to make typescript happy
    -		//These should match the css preloads above to avoid css as render blocking resource
     		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
     		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
     	].filter(Boolean)
    @@ -141,36 +132,18 @@
     	return headers
     }
     
    -const ThemeFormSchema = z.object({
    -	theme: z.enum(['system', 'light', 'dark']),
    -})
    -
    -export async function action({ request }: ActionFunctionArgs) {
    -	const formData = await request.formData()
    -	const submission = parseWithZod(formData, {
    -		schema: ThemeFormSchema,
    -	})
    -
    -	invariantResponse(submission.status === 'success', 'Invalid theme received')
    -
    -	const { theme } = submission.value
    -
    -	const responseInit = {
    -		headers: { 'set-cookie': setTheme(theme) },
    -	}
    -	return json({ result: submission.reply() }, responseInit)
    -}
    -
     function Document({
     	children,
     	nonce,
     	theme = 'light',
     	env = {},
    +	allowIndexing = true,
     }: {
     	children: React.ReactNode
     	nonce: string
     	theme?: Theme
     	env?: Record<string, string>
    +	allowIndexing?: boolean
     }) {
     	return (
     		<html lang="en" >
    @@ -179,6 +152,9 @@
     				<Meta />
     				<meta charSet="utf-8" />
     				<meta name="viewport" content="width=device-width,initial-scale=1" />
    +				{allowIndexing ? null : (
    +					<meta name="robots" content="noindex, nofollow" />
    +				)}
     				<Links />
     			</head>
     			<body className="bg-background text-foreground">
    @@ -200,10 +176,18 @@
     	const user = useOptionalUser()
     	const theme = useTheme()
     	const matches = useMatches()
    +	const isOnSearchPage = matches.find((m) => m.id === 'routes/users+/index')
     	const searchBar = isOnSearchPage ? null : <SearchBar status="idle" />
    +	const allowIndexing = data.ENV.ALLOW_INDEXING !== 'false'
     	useToast(data.toast)
     
     	return (
    +		<Document
    +			nonce={nonce}
    +			theme={theme}
    +			allowIndexing={allowIndexing}
    +			env={data.ENV}
    +		>
     			<div className="flex h-screen flex-col justify-between">
     				<header className="container py-6">
     					<nav className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap md:gap-8">
    @@ -182,6 +164,7 @@
     					<Link
     						to={\`/users/\${user.username}\`}
     						// this is for progressive enhancement
    +						onClick={(e) => e.preventDefault()}
     						className="flex items-center gap-2"
     					>
     						<img
    @@ -91,6 +73,7 @@
     					<DropdownMenuItem
     						asChild
     						// this prevents the menu from closing before the form submission is completed
    +						onSelect={(event) => {
     							event.preventDefault()
     							submit(formRef.current)
     						}}
    @@ -202,52 +184,6 @@
     	)
     }
     
    -/**
    - * @returns the user's theme preference, or the client hint theme if the user
    - * has not set a preference.
    - */
    -export function useTheme() {
    -	const hints = useHints()
    -	const requestInfo = useRequestInfo()
    -	const optimisticMode = useOptimisticThemeMode()
    -	if (optimisticMode) {
    -		return optimisticMode === 'system' ? hints.theme : optimisticMode
    -	}
    -	return requestInfo.userPrefs.theme ?? hints.theme
    -}
    -
    -/**
    - * If the user's changing their theme mode preference, this will return the
    - * value it's being changed to.
    - */
    -export function useOptimisticThemeMode() {
    -	const fetchers = useFetchers()
    -	const themeFetcher = fetchers.find(f => f.formAction === '/')
    -
    -	if (themeFetcher && themeFetcher.formData) {
    -		const submission = parseWithZod(themeFetcher.formData, {
    -			schema: ThemeFormSchema,
    -		})
    -
    -		if (submission.status === 'success') {
    -			return submission.value.theme
    -		}
    -	}
    -}
    -
    -
    -	})
    -
    -		),
    -		),
    -		),
    -	}
    -
    -	return (
    -				>
    -	)
    -}
    -
     export function ErrorBoundary() {
     	// the nonce doesn't rely on the loader so we can access that
     	const nonce = useNonce()
  `)
})

test("elides the remove when the add is already present", () => {
  const patchText = `diff --git a/other/build-icons.ts b/other/build-icons.ts
index f8e7586..ccaaf1a 100644
--- a/other/build-icons.ts
+++ b/other/build-icons.ts
@@ -0,12 +0,12 @@ async function generateIconFiles() {
 		.readFile(typeOutputFilepath, 'utf8')
 		.catch(() => '')
 
+	const iconNames = files.map((file) => iconName(file))
 
-	const spriteUpToDate = iconNames.every(name =>
+	const spriteUpToDate = iconNames.every((name) =>
 		currentSprite.includes(\`id=\${name}\`),
 	)
-	const typesUpToDate = iconNames.every(name =>
+	const typesUpToDate = iconNames.every((name) =>
 		currentTypes.includes(\`"\${name}"\`),
 	)`

  const targetFileContent = `
async function generateIconFiles() {
	const spriteFilepath = path.join(outputDir, 'sprite.svg')
	const typeOutputFilepath = path.join(outputDir, 'name.d.ts')
	const currentSprite = await fsExtra
		.readFile(spriteFilepath, 'utf8')
		.catch(() => '')
	const currentTypes = await fsExtra
		.readFile(typeOutputFilepath, 'utf8')
		.catch(() => '')

	const spriteUpToDate = iconNames.every((name) =>
		currentSprite.includes(\`id=\${name}\`),
	)
	const typesUpToDate = iconNames.every((name) =>
		currentTypes.includes(\`"\${name}"\`),
	)

	if (spriteUpToDate && typesUpToDate) {
		logVerbose(\`Icons are up to date\`)
		return
	}
}
`

  expect(correctFilePatch(patchText, targetFileContent)).toMatchInlineSnapshot(`
    --- a/other/build-icons.ts
    +++ b/other/build-icons.ts
    @@ -9,10 +9,11 @@
     		.readFile(typeOutputFilepath, 'utf8')
     		.catch(() => '')
     
    +	const iconNames = files.map((file) => iconName(file))
     
     	const spriteUpToDate = iconNames.every((name) =>
     		currentSprite.includes(\`id=\${name}\`),
     	)
     	const typesUpToDate = iconNames.every((name) =>
     		currentTypes.includes(\`"\${name}"\`),
     	)
  `)
})

test("doesn't retain additions if it's just a symbol", () => {
  const patchText = `diff --git a/vite.config.ts b/vite.config.ts
index 3bebdb3..ff10d2e 100644
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -0,5 +0,10 @@ export default defineConfig({
 		rollupOptions: {
 			external: [/node:.*/, 'stream', 'crypto', 'fsevents'],
 		},
+		assetsInlineLimit: (source: string) => {
+			if (source.endsWith('sprite.svg')) {
+				return false
+			}
+		},
 	},
`

  const targetFileContent = `
export default defineConfig({
	build: {
		cssMinify: MODE === 'production',
		rollupOptions: {
			external: [/node:.*/, 'stream', 'crypto', 'fsevents'],
		},
	},
	plugins: [
})`

  expect(correctFilePatch(patchText, targetFileContent)).toMatchInlineSnapshot(`
    --- a/vite.config.ts
    +++ b/vite.config.ts
    @@ -5,4 +5,9 @@
     		rollupOptions: {
     			external: [/node:.*/, 'stream', 'crypto', 'fsevents'],
     		},
    +		assetsInlineLimit: (source: string) => {
    +			if (source.endsWith('sprite.svg')) {
    +				return false
    +			}
    +		},
     	},
  `)
})
