import { expect, test } from "vitest"
import { correctJsonPatch } from "./correctJsonPatch.js"

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

test("removes empty diff", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
`)

  const targetFileContent = `
{
	"key": "value"
}
`
  expect(
    correctJsonPatch(patchText, targetFileContent.replace(/^\n/, ""))
  ).toMatchInlineSnapshot(`null`)
})

test("deletes adds if already present", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
-  "execa": "^8.0.1",
-  "express": "^4.18.3",
+  "better-sqlite3": "^11.1.2",
+  "clsx": "^2.1.1",
+  "execa": "^9.3.0",
+  "express": "^4.19.2",
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
  expect(correctJsonPatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
		--- a/file
		+++ b/file
		@@ -2,1 +2,1 @@
		-    "execa": "^8.0.1",
		+    "execa": "^9.3.0",
		@@ -3,1 +3,1 @@
		-    "express": "^4.18.3",
		+    "express": "^4.19.2",
	`)
})

test("matches indents", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
-    "key": "hello"
+    "key": "hello world"
`)

  const targetFileContent = `
{
\t\t"key": "hello"
}
`
  expect(correctJsonPatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
		--- a/file
		+++ b/file
		@@ -1,1 +1,1 @@
		-		"key": "hello"
		+		"key": "hello world"
	`)
})

test("matches indent when diff is deep", () => {
  const patchText = createPatch(`
@@ -1,1 +1,1 @@
-    "key": "hello"
+    "key": "hello world"
`)

  const targetFileContent = `
{
\t"object": {
\t\t"key": "hello"
\t}
}
`
  expect(correctJsonPatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
		--- a/file
		+++ b/file
		@@ -1,1 +1,1 @@
		-		"key": "hello"
		+		"key": "hello world"
	`)
})

test("pairs symbols", () => {
  const patchText = `
diff --git a/package.json b/package.json
index 2f83413..2684858 100644
--- a/package.json
+++ b/package.json
@@ -3,5 +3,8 @@
	 "private": true,
	 "sideEffects": false,
	 "license": "MIT",
-  "epic-stack": true,
+  "epic-stack": {
+    "head": "08e94d38e00637586262b01b9a217f817c912ecd",
+    "date": "2024-08-05T14:39:44Z"
+  },
	 "author": "Kent C. Dodds <me@kentcdodds.com> (https://kentcdodds.com/)",
`

  const targetFileContent = `{
	"name": "exercises__sep__01.create__sep__01.solution.nested-routing",
	"private": true,
	"sideEffects": false,
	"type": "module",
	"epic-stack": true,
	"imports": {
		"#app/*": "./app/*",
		"#tests/*": "./tests/*"
	}
`

  expect(correctJsonPatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
		--- a/package.json
		+++ b/package.json
		@@ -5,1 +5,4 @@
		-	"epic-stack": true,
		+	"epic-stack": {
		+		"head": "08e94d38e00637586262b01b9a217f817c912ecd",
		+		"date": "2024-08-05T14:39:44Z"
		+	},
	`)
})

test("elides keys even if same-keys have different indents", () => {
  const patchText = createPatch(`
@@ -2,11 +2,13 @@
	 "devDependencies": {
-    "morgan": "^1.10.0",
+    "morgan": "^2.10.0",
-    "prettier": "^3.1.0",
+    "prettier": "^3.3.3",
		 "qrcode": "^1.5.3",
	 },
	 "engines": {
		 "node": "20"
	 },
	 "prisma": {
		 "seed": "tsx prisma/seed.ts"
-  }
+  },
+  "prettier": "@epic-web/config/prettier"
+ }`)

  const targetFileContent = `{
	"devDependencies": {
		"morgan": "^1.10.0",
		"prettier": "^3.3.3",
		"prettier-plugin-sql": "^0.18.0",
		"prettier-plugin-tailwindcss": "^0.5.11",
		"remix-flat-routes": "^0.6.4",
		"tsx": "^4.7.1",
		"typescript": "^5.4.5",
		"vite": "^5.1.5"
	},
	"engines": {
		"node": "20"
	},
	"prisma": {
		 "seed": "tsx prisma/seed.ts"
	}
}`

  expect(correctJsonPatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
		--- a/file
		+++ b/file
		@@ -2,1 +2,1 @@
		-		"morgan": "^1.10.0",
		+		"morgan": "^2.10.0",
		@@ -13,1 +13,3 @@
		-	}
		+	},
		+	"prettier": "@epic-web/config/prettier"
		+ }
	`)
})

test("handles array values", () => {
  const patchText = `diff --git a/tsconfig.json b/tsconfig.json
index b92f566..523f576 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -1,27 +1,14 @@
 {
-  "include": ["**/*.ts", "**/*.tsx"],
-  "compilerOptions": {
-    "lib": ["DOM", "DOM.Iterable", "ES2022"],
-    "isolatedModules": true,
-    "esModuleInterop": true,
-    "jsx": "react-jsx",
-    "module": "ESNext",
-    "target": "ES2022",
-    "moduleResolution": "bundler",
-    "resolveJsonModule": true,
-    "strict": true,
-    "noImplicitAny": true,
-    "allowJs": true,
-    "forceConsistentCasingInFileNames": true,
-    "paths": {
-      "#*": ["./*"],
-      "@/icon-name": [
-        "./app/components/ui/icons/name.d.ts",
-        "./types/icon-name.d.ts",
-      ],
-    },
-    "skipLibCheck": true,
-    "allowImportingTsExtensions": true,
-    "noEmit": true,
-  },
+  "include": ["**/*.ts", "**/*.tsx"],
+  "extends": ["@epic-web/config/typescript"],
+  "compilerOptions": {
+    "paths": {
+      "#app/*": ["./app/*"],
+      "#tests/*": ["./tests/*"],
+      "@/icon-name": [
+        "./app/components/ui/icons/name.d.ts",
+        "./types/icon-name.d.ts"
+      ]
+    }
+  }
 }`

  const targetFileContent = `{
	"include": ["**/*.ts", "**/*.tsx"],
	"compilerOptions": {
		"lib": ["DOM", "DOM.Iterable", "ES2022"],
		"isolatedModules": true,
		"esModuleInterop": true,
		"jsx": "react-jsx",
		"module": "ESNext",
		"target": "ES2022",
		"moduleResolution": "bundler",
		"resolveJsonModule": true,
		"strict": true,
		"noImplicitAny": true,
		"allowJs": true,
		"forceConsistentCasingInFileNames": true,
		"paths": {
			"#*": ["./*"],
			"@/icon-name": [
				"./app/components/ui/icons/name.d.ts",
				"./types/icon-name.d.ts"
			]
		},
		"skipLibCheck": true,
		"allowImportingTsExtensions": true,
		"noEmit": true
	}
}`

  expect(correctJsonPatch(patchText, targetFileContent.replace(/^\n/, "")))
    .toMatchInlineSnapshot(`
		--- a/tsconfig.json
		+++ b/tsconfig.json
		@@ -1,30 +1,13 @@
		-  "include": ["**/*.ts", "**/*.tsx"],
		-  "compilerOptions": {
		-    "lib": ["DOM", "DOM.Iterable", "ES2022"],
		-    "isolatedModules": true,
		-    "esModuleInterop": true,
		-    "jsx": "react-jsx",
		-    "module": "ESNext",
		-    "target": "ES2022",
		-    "moduleResolution": "bundler",
		-    "resolveJsonModule": true,
		-    "strict": true,
		-    "noImplicitAny": true,
		-    "allowJs": true,
		-    "forceConsistentCasingInFileNames": true,
		-    "paths": {
		-      "#*": ["./*"],
		-      "@/icon-name": [
		-        "./app/components/ui/icons/name.d.ts",
		-        "./types/icon-name.d.ts",
		-      ],
		-    },
		-    "skipLibCheck": true,
		-    "allowImportingTsExtensions": true,
		-    "noEmit": true,
		-  },
			 "include": ["**/*.ts", "**/*.tsx"],
		+  "extends": ["@epic-web/config/typescript"],
			 "compilerOptions": {
				 "paths": {
		+      "#app/*": ["./app/*"],
		+      "#tests/*": ["./tests/*"],
					 "@/icon-name": [
						 "./app/components/ui/icons/name.d.ts",
						 "./types/icon-name.d.ts"
					 ]
		+    }
		+  }
		 }
	`)
})

test("corrects line numbers", () => {
  const patchText = createPatch(`
@@ -3,16 +3,20 @@
	 "private": true,
	 "sideEffects": false,
	 "license": "MIT",
-  "epic-stack": true,
+  "epic-stack": {
+    "head": "5e8df6fa4392107f978906e1a04fa00705f37dde",
+    "date": "2024-08-12T05:40:24Z"
+  },
	 "author": "Kent C. Dodds <me@kentcdodds.com> (https://kentcdodds.com/)",
	 "type": "module",
	 "imports": {
-    "#*": "./*"
+    "#app/*": "./app/*",
+    "#tests/*": "./tests/*"
	 },
	 "scripts": {
		 "build": "run-s build:*",
		 "build:icons": "tsx ./other/build-icons.ts",
-    "build:remix": "remix vite:build --sourcemapClient --sourcemapServer",
+    "build:remix": "remix vite:build",
		 "build:server": "tsx ./other/build-server.ts",
		 "predev": "npm run build:icons --silent",
		 "dev": "node ./server/dev-server.js",
@@ -40,125 +44,123 @@
		 "/server-build"
	 ],
	 "dependencies": {
-    "@conform-to/react": "^1.0.4",
-    "@conform-to/zod": "^1.0.4",
-    "@epic-web/cachified": "^5.1.2",
-    "@epic-web/client-hints": "^1.3.0",
+    "@conform-to/react": "^1.1.5",
+    "@conform-to/zod": "^1.1.5",
+    "@epic-web/cachified": "^5.2.0",
+    "@epic-web/client-hints": "^1.3.2",
		 "@epic-web/invariant": "^1.0.0",
-    "@epic-web/remember": "^1.0.2",
+    "@epic-web/remember": "^1.1.0",
		 "@epic-web/totp": "^1.1.2",
-    "@nasa-gcn/remix-seo": "^2.0.0",
+    "@nasa-gcn/remix-seo": "^2.0.1",
		 "@paralleldrive/cuid2": "^2.2.2",
-    "@prisma/client": "^5.11.0",
-    "@radix-ui/react-checkbox": "^1.0.4",
-    "@radix-ui/react-dropdown-menu": "^2.0.6",
-    "@radix-ui/react-label": "^2.0.2",
-    "@radix-ui/react-slot": "^1.0.2",
-    "@radix-ui/react-toast": "^1.1.5",
-    "@radix-ui/react-tooltip": "^1.0.7",
-    "@react-email/components": "0.0.15",
-    "@remix-run/express": "2.8.1",
-    "@remix-run/node": "2.8.1",
-    "@remix-run/react": "2.8.1",
-    "@remix-run/server-runtime": "2.8.1",
-    "@sentry/profiling-node": "^7.107.0",
-    "@sentry/remix": "^7.107.0",
-    "address": "^2.0.2",
+    "@prisma/client": "^5.17.0",
+    "@radix-ui/react-checkbox": "^1.1.1",
+    "@radix-ui/react-dropdown-menu": "^2.1.1",
+    "@radix-ui/react-label": "^2.1.0",
+    "@radix-ui/react-slot": "^1.1.0",
+    "@radix-ui/react-toast": "^1.2.1",
+    "@radix-ui/react-tooltip": "^1.1.2",
+    "@react-email/components": "0.0.21",
+    "@remix-run/express": "2.10.3",
+    "@remix-run/node": "2.10.3",
+    "@remix-run/react": "2.10.3",
+    "@sentry/profiling-node": "^8.18.0",
+    "@sentry/remix": "^8.18.0",
+    "address": "^2.0.3",
		 "bcryptjs": "^2.4.3",
-    "better-sqlite3": "^9.4.3",
+    "better-sqlite3": "^11.1.2",
		 "chalk": "^5.3.0",
		 "class-variance-authority": "^0.7.0",
		 "close-with-grace": "^1.3.0",
-    "clsx": "^2.1.0",
+    "clsx": "^2.1.1",
		 "compression": "^1.7.4",
		 "cookie": "^0.6.0",
		 "cross-env": "^7.0.3",
		 "crypto-js": "^4.2.0",
		 "date-fns": "^3.6.0",
		 "dotenv": "^16.4.5",
-    "eslint-plugin-remix-react-routes": "^1.0.5",
-    "execa": "^8.0.1",
-    "express": "^4.18.3",
-    "express-rate-limit": "^7.2.0",
-    "get-port": "^7.0.0",
-    "glob": "^10.3.10",
+    "execa": "^9.3.0",
+    "express": "^4.19.2",
+    "express-rate-limit": "^7.3.1",
+    "get-port": "^7.1.0",
+    "glob": "^11.0.0",
		 "helmet": "^7.1.0",
+    "input-otp": "^1.2.4",
		 "intl-parse-accept-language": "^1.0.0",
-    "isbot": "^5.1.2",
+    "isbot": "^5.1.13",
		 "litefs-js": "^1.1.2",
-    "lru-cache": "^10.2.0",
+    "lru-cache": "^11.0.0",
		 "morgan": "^1.10.0",
-    "prisma": "^5.11.0",
+    "prisma": "^5.17.0",
		 "qrcode": "^1.5.3",
-    "react": "^18.2.0",
-    "react-dom": "^18.2.0",
-    "remix-auth": "^3.6.0",
-    "remix-auth-form": "^1.4.0",
+    "react": "^18.3.1",
+    "react-dom": "^18.3.1",
+    "remix-auth": "^3.7.0",
		 "remix-auth-github": "^1.7.0",
-    "remix-utils": "^7.5.0",
+    "remix-utils": "^7.6.0",
		 "set-cookie-parser": "^2.6.0",
-    "sonner": "^1.4.3",
+    "sonner": "^1.5.0",
		 "source-map-support": "^0.5.21",
		 "spin-delay": "^2.0.0",
-    "tailwind-merge": "^2.2.2",
-    "tailwindcss": "^3.4.1",
+    "tailwind-merge": "^2.4.0",
+    "tailwindcss": "^3.4.6",
		 "tailwindcss-animate": "^1.0.7",
-    "tailwindcss-radix": "^2.8.0",
-    "zod": "^3.22.4"
+    "tailwindcss-radix": "^3.0.3",
+    "zod": "^3.23.8"
	 },
	 "devDependencies": {
+    "@epic-web/config": "^1.12.0",
		 "@faker-js/faker": "^8.4.1",
-    "@playwright/test": "^1.42.1",
-    "@remix-run/dev": "2.8.1",
-    "@remix-run/eslint-config": "2.8.1",
-    "@remix-run/serve": "2.8.1",
-    "@remix-run/testing": "2.8.1",
-    "@sentry/vite-plugin": "^2.16.0",
-    "@sly-cli/sly": "^1.10.0",
-    "@testing-library/jest-dom": "^6.4.2",
-    "@testing-library/react": "^14.2.1",
+    "@playwright/test": "^1.45.2",
+    "@remix-run/dev": "2.10.3",
+    "@remix-run/testing": "2.10.3",
+    "@sentry/vite-plugin": "^2.21.1",
+    "@sly-cli/sly": "^1.13.0",
+    "@testing-library/dom": "^10.3.2",
+    "@testing-library/jest-dom": "^6.4.6",
+    "@testing-library/react": "^16.0.0",
		 "@testing-library/user-event": "^14.5.2",
		 "@total-typescript/ts-reset": "^0.5.1",
		 "@types/bcryptjs": "^2.4.6",
-    "@types/better-sqlite3": "^7.6.9",
+    "@types/better-sqlite3": "^7.6.11",
		 "@types/compression": "^1.7.5",
		 "@types/cookie": "^0.6.0",
-    "@types/eslint": "^8.56.6",
+    "@types/eslint": "^8.56.10",
		 "@types/express": "^4.17.21",
		 "@types/fs-extra": "^11.0.4",
		 "@types/glob": "^8.1.0",
		 "@types/morgan": "^1.9.9",
-    "@types/node": "^20.11.30",
+    "@types/node": "^20.14.11",
		 "@types/qrcode": "^1.5.5",
-    "@types/react": "^18.2.67",
-    "@types/react-dom": "^18.2.22",
-    "@types/set-cookie-parser": "^2.4.7",
+    "@types/react": "^18.3.3",
+    "@types/react-dom": "^18.3.0",
+    "@types/set-cookie-parser": "^2.4.10",
		 "@types/source-map-support": "^0.5.10",
-    "@vitejs/plugin-react": "^4.2.1",
-    "@vitest/coverage-v8": "^1.4.0",
-    "autoprefixer": "^10.4.18",
+    "@vitejs/plugin-react": "^4.3.1",
+    "@vitest/coverage-v8": "^2.0.3",
+    "autoprefixer": "^10.4.19",
		 "enforce-unique": "^1.3.0",
-    "esbuild": "^0.20.2",
-    "eslint": "^8.57.0",
-    "eslint-config-prettier": "^9.1.0",
+    "esbuild": "^0.23.0",
+    "eslint": "^9.7.0",
		 "fs-extra": "^11.2.0",
-    "jsdom": "^24.0.0",
-    "msw": "2.2.8",
-    "node-html-parser": "^6.1.12",
+    "jsdom": "^24.1.0",
+    "msw": "2.3.1",
+    "node-html-parser": "^6.1.13",
		 "npm-run-all": "^4.1.5",
-    "prettier": "^3.2.5",
-    "prettier-plugin-sql": "^0.18.0",
-    "prettier-plugin-tailwindcss": "^0.5.12",
-    "remix-flat-routes": "^0.6.4",
-    "tsx": "^4.7.1",
-    "typescript": "^5.4.2",
-    "vite": "^5.1.6",
-    "vitest": "^1.4.0"
+    "prettier": "^3.3.3",
+    "prettier-plugin-sql": "^0.18.1",
+    "prettier-plugin-tailwindcss": "^0.6.5",
+    "remix-flat-routes": "^0.6.5",
+    "tsx": "^4.16.2",
+    "typescript": "^5.5.3",
+    "vite": "^5.3.4",
+    "vitest": "^2.0.3"
	 },
	 "engines": {
		 "node": "20"
	 },
	 "prisma": {
		 "seed": "tsx prisma/seed.ts"
-  }
+  },
+  "prettier": "@epic-web/config/prettier"
}`)

  const targetFileContent = `
{
	"name": "exercises__sep__01.create__sep__01.solution.nested-routing",
	"private": true,
	"sideEffects": false,
	"type": "module",
	"imports": {
		"#*": "./*"
	},
	"scripts": {
		"build": "run-s build:*",
		"build:icons": "tsx ./other/build-icons.ts",
		"build:remix": "remix vite:build --sourcemapClient",
		"build:server": "tsx ./other/build-server.ts",
		"predev": "npm run build:icons --silent",
		"dev": "node ./server/dev-server.js",
		"prisma:studio": "prisma studio",
		"format": "prettier --write .",
		"lint": "eslint .",
		"setup": "npm run build && prisma generate && prisma migrate deploy",
		"start": "cross-env NODE_ENV=production node .",
		"start:mocks": "cross-env NODE_ENV=production MOCKS=true tsx .",
		"typecheck": "tsc",
		"validate": "run-p lint typecheck"
	},
	"eslintIgnore": [
		"/node_modules",
		"/build",
		"/public/build",
		"/server-build"
	],
	"dependencies": {
		"@conform-to/react": "^1.0.2",
		"@conform-to/zod": "^1.0.2",
		"@epic-web/cachified": "^5.1.2",
		"@epic-web/client-hints": "^1.3.0",
		"@epic-web/invariant": "^1.0.0",
		"@epic-web/remember": "^1.0.2",
		"@epic-web/totp": "^1.1.2",
		"@kentcdodds/workshop-utils": "3.14.1",
		"@nasa-gcn/remix-seo": "^2.0.0",
		"@paralleldrive/cuid2": "^2.2.2",
		"@prisma/client": "^5.10.2",
		"@radix-ui/react-checkbox": "^1.0.4",
		"@radix-ui/react-dropdown-menu": "^2.0.6",
		"@radix-ui/react-label": "^2.0.2",
		"@radix-ui/react-slot": "^1.0.2",
		"@radix-ui/react-toast": "^1.1.5",
		"@radix-ui/react-tooltip": "^1.0.7",
		"@react-email/components": "0.0.15",
		"@remix-run/express": "2.8.1",
		"@remix-run/node": "2.8.1",
		"@remix-run/react": "2.8.1",
		"@remix-run/server-runtime": "2.8.1",
		"@sentry/profiling-node": "^7.105.0",
		"@sentry/remix": "^7.105.0",
		"address": "^2.0.2",
		"bcryptjs": "^2.4.3",
		"better-sqlite3": "^9.4.3",
		"chalk": "^5.3.0",
		"class-variance-authority": "^0.7.0",
		"close-with-grace": "^1.3.0",
		"clsx": "^2.1.0",
		"compression": "^1.7.4",
		"cookie": "^0.6.0",
		"cross-env": "^7.0.3",
		"crypto-js": "^4.2.0",
		"date-fns": "^3.3.1",
		"dotenv": "^16.4.5",
		"eslint-plugin-remix-react-routes": "^1.0.5",
		"execa": "^8.0.1",
		"express": "^4.18.3",
		"express-rate-limit": "^7.2.0",
		"get-port": "^7.0.0",
		"glob": "^10.3.10",
		"helmet": "^7.1.0",
		"intl-parse-accept-language": "^1.0.0",
		"isbot": "^5.1.1",
		"litefs-js": "^1.1.2",
		"lru-cache": "^10.2.0",
		"morgan": "^1.10.0",
		"prisma": "^5.10.2",
		"qrcode": "^1.5.3",
		"react": "^18.2.0",
		"react-dom": "^18.2.0",
		"remix-auth": "^3.6.0",
		"remix-auth-form": "^1.4.0",
		"remix-auth-github": "^1.6.0",
		"remix-utils": "^7.5.0",
		"set-cookie-parser": "^2.6.0",
		"sonner": "^1.4.3",
		"source-map-support": "^0.5.21",
		"spin-delay": "^1.2.0",
		"tailwind-merge": "^2.2.1",
		"tailwindcss": "^3.4.1",
		"tailwindcss-animate": "^1.0.7",
		"tailwindcss-radix": "^2.8.0",
		"zod": "^3.22.4"
	},
	"devDependencies": {
		"@faker-js/faker": "^8.4.1",
		"@remix-run/dev": "2.8.1",
		"@remix-run/eslint-config": "2.8.1",
		"@remix-run/serve": "2.8.1",
		"@remix-run/testing": "2.8.1",
		"@sly-cli/sly": "^1.10.0",
		"@total-typescript/ts-reset": "^0.5.1",
		"@types/bcryptjs": "^2.4.6",
		"@types/better-sqlite3": "^7.6.9",
		"@types/compression": "^1.7.5",
		"@types/cookie": "^0.6.0",
		"@types/eslint": "^8.56.5",
		"@types/express": "^4.17.21",
		"@types/fs-extra": "^11.0.4",
		"@types/glob": "^8.1.0",
		"@types/morgan": "^1.9.9",
		"@types/node": "^20.11.24",
		"@types/qrcode": "^1.5.5",
		"@types/react": "^18.2.63",
		"@types/react-dom": "^18.2.20",
		"@types/set-cookie-parser": "^2.4.7",
		"@types/source-map-support": "^0.5.10",
		"@vitejs/plugin-react": "^4.2.1",
		"autoprefixer": "^10.4.18",
		"enforce-unique": "^1.3.0",
		"esbuild": "^0.20.1",
		"eslint": "^8.57.0",
		"eslint-config-prettier": "^9.1.0",
		"fs-extra": "^11.2.0",
		"msw": "2.2.2",
		"node-html-parser": "^6.1.12",
		"npm-run-all": "^4.1.5",
		"prettier": "^3.2.5",
		"prettier-plugin-sql": "^0.18.0",
		"prettier-plugin-tailwindcss": "^0.5.11",
		"remix-flat-routes": "^0.6.4",
		"tsx": "^4.7.1",
		"typescript": "^5.4.5",
		"vite": "^5.1.5"
	},
	"engines": {
		"node": "20"
	},
	"epic-stack": true
}
`

  expect(correctJsonPatch(patchText, targetFileContent)).toMatchInlineSnapshot(`
		--- a/file
		+++ b/file
		@@ -7,5 +7,6 @@
		-    "#*": "./*"
		+    "#app/*": "./app/*",
		+    "#tests/*": "./tests/*"
			 },
			 "scripts": {
				 "build": "run-s build:*",
				 "build:icons": "tsx ./other/build-icons.ts",
		@@ -13,1 +13,1 @@
		-    "build:remix": "remix vite:build --sourcemapClient",
		+    "build:remix": "remix vite:build",
		@@ -32,1 +36,1 @@
		-    "@conform-to/react": "^1.0.2",
		+    "@conform-to/react": "^1.1.5",
		@@ -33,1 +37,1 @@
		-    "@conform-to/zod": "^1.0.2",
		+    "@conform-to/zod": "^1.1.5",
		@@ -34,1 +38,1 @@
		-    "@epic-web/cachified": "^5.1.2",
		+    "@epic-web/cachified": "^5.2.0",
		@@ -35,1 +39,1 @@
		-    "@epic-web/client-hints": "^1.3.0",
		+    "@epic-web/client-hints": "^1.3.2",
		@@ -37,1 +41,1 @@
		-    "@epic-web/remember": "^1.0.2",
		+    "@epic-web/remember": "^1.1.0",
		@@ -40,1 +44,1 @@
		-    "@nasa-gcn/remix-seo": "^2.0.0",
		+    "@nasa-gcn/remix-seo": "^2.0.1",
		@@ -42,1 +46,1 @@
		-    "@prisma/client": "^5.10.2",
		+    "@prisma/client": "^5.17.0",
		@@ -43,1 +47,1 @@
		-    "@radix-ui/react-checkbox": "^1.0.4",
		+    "@radix-ui/react-checkbox": "^1.1.1",
		@@ -44,1 +48,1 @@
		-    "@radix-ui/react-dropdown-menu": "^2.0.6",
		+    "@radix-ui/react-dropdown-menu": "^2.1.1",
		@@ -45,1 +49,1 @@
		-    "@radix-ui/react-label": "^2.0.2",
		+    "@radix-ui/react-label": "^2.1.0",
		@@ -46,1 +50,1 @@
		-    "@radix-ui/react-slot": "^1.0.2",
		+    "@radix-ui/react-slot": "^1.1.0",
		@@ -47,1 +51,1 @@
		-    "@radix-ui/react-toast": "^1.1.5",
		+    "@radix-ui/react-toast": "^1.2.1",
		@@ -48,1 +52,1 @@
		-    "@radix-ui/react-tooltip": "^1.0.7",
		+    "@radix-ui/react-tooltip": "^1.1.2",
		@@ -49,1 +53,1 @@
		-    "@react-email/components": "0.0.15",
		+    "@react-email/components": "0.0.21",
		@@ -50,1 +54,1 @@
		-    "@remix-run/express": "2.8.1",
		+    "@remix-run/express": "2.10.3",
		@@ -51,1 +55,1 @@
		-    "@remix-run/node": "2.8.1",
		+    "@remix-run/node": "2.10.3",
		@@ -52,1 +56,1 @@
		-    "@remix-run/react": "2.8.1",
		+    "@remix-run/react": "2.10.3",
		@@ -54,1 +58,1 @@
		-    "@sentry/profiling-node": "^7.105.0",
		+    "@sentry/profiling-node": "^8.18.0",
		@@ -55,1 +59,1 @@
		-    "@sentry/remix": "^7.105.0",
		+    "@sentry/remix": "^8.18.0",
		@@ -56,1 +60,1 @@
		-    "address": "^2.0.2",
		+    "address": "^2.0.3",
		@@ -58,1 +62,1 @@
		-    "better-sqlite3": "^9.4.3",
		+    "better-sqlite3": "^11.1.2",
		@@ -62,1 +66,1 @@
		-    "clsx": "^2.1.0",
		+    "clsx": "^2.1.1",
		@@ -70,1 +74,1 @@
		-    "execa": "^8.0.1",
		+    "execa": "^9.3.0",
		@@ -71,1 +75,1 @@
		-    "express": "^4.18.3",
		+    "express": "^4.19.2",
		@@ -72,1 +76,1 @@
		-    "express-rate-limit": "^7.2.0",
		+    "express-rate-limit": "^7.3.1",
		@@ -73,1 +77,1 @@
		-    "get-port": "^7.0.0",
		+    "get-port": "^7.1.0",
		@@ -74,1 +78,1 @@
		-    "glob": "^10.3.10",
		+    "glob": "^11.0.0",
		@@ -75,2 +79,3 @@
				 "helmet": "^7.1.0",
		+    "input-otp": "^1.2.4",
				 "intl-parse-accept-language": "^1.0.0",
		@@ -77,1 +81,1 @@
		-    "isbot": "^5.1.1",
		+    "isbot": "^5.1.13",
		@@ -79,1 +83,1 @@
		-    "lru-cache": "^10.2.0",
		+    "lru-cache": "^11.0.0",
		@@ -81,1 +85,1 @@
		-    "prisma": "^5.10.2",
		+    "prisma": "^5.17.0",
		@@ -83,1 +87,1 @@
		-    "react": "^18.2.0",
		+    "react": "^18.3.1",
		@@ -84,1 +88,1 @@
		-    "react-dom": "^18.2.0",
		+    "react-dom": "^18.3.1",
		@@ -85,1 +89,1 @@
		-    "remix-auth": "^3.6.0",
		+    "remix-auth": "^3.7.0",
		@@ -88,1 +92,1 @@
		-    "remix-utils": "^7.5.0",
		+    "remix-utils": "^7.6.0",
		@@ -90,1 +94,1 @@
		-    "sonner": "^1.4.3",
		+    "sonner": "^1.5.0",
		@@ -93,1 +97,1 @@
		-    "tailwind-merge": "^2.2.1",
		+    "tailwind-merge": "^2.4.0",
		@@ -94,1 +98,1 @@
		-    "tailwindcss": "^3.4.1",
		+    "tailwindcss": "^3.4.6",
		@@ -96,1 +100,1 @@
		-    "tailwindcss-radix": "^2.8.0",
		+    "tailwindcss-radix": "^3.0.3",
		@@ -97,1 +101,1 @@
		-    "zod": "^3.22.4"
		+    "zod": "^3.23.8"
		@@ -99,2 +103,3 @@
			 "devDependencies": {
		+    "@epic-web/config": "^1.12.0",
				 "@faker-js/faker": "^8.4.1",
		@@ -101,1 +105,1 @@
		-    "@remix-run/dev": "2.8.1",
		+    "@remix-run/dev": "2.10.3",
		@@ -104,1 +108,1 @@
		-    "@remix-run/testing": "2.8.1",
		+    "@remix-run/testing": "2.10.3",
		@@ -105,1 +109,1 @@
		-    "@sly-cli/sly": "^1.10.0",
		+    "@sly-cli/sly": "^1.13.0",
		@@ -106,3 +110,4 @@
		+    "@testing-library/dom": "^10.3.2",
				 "@testing-library/user-event": "^14.5.2",
				 "@total-typescript/ts-reset": "^0.5.1",
				 "@types/bcryptjs": "^2.4.6",
		@@ -108,1 +112,1 @@
		-    "@types/better-sqlite3": "^7.6.9",
		+    "@types/better-sqlite3": "^7.6.11",
		@@ -111,1 +115,1 @@
		-    "@types/eslint": "^8.56.5",
		+    "@types/eslint": "^8.56.10",
		@@ -116,1 +120,1 @@
		-    "@types/node": "^20.11.24",
		+    "@types/node": "^20.14.11",
		@@ -118,1 +122,1 @@
		-    "@types/react": "^18.2.63",
		+    "@types/react": "^18.3.3",
		@@ -119,1 +123,1 @@
		-    "@types/react-dom": "^18.2.20",
		+    "@types/react-dom": "^18.3.0",
		@@ -120,1 +124,1 @@
		-    "@types/set-cookie-parser": "^2.4.7",
		+    "@types/set-cookie-parser": "^2.4.10",
		@@ -122,1 +126,1 @@
		-    "@vitejs/plugin-react": "^4.2.1",
		+    "@vitejs/plugin-react": "^4.3.1",
		@@ -123,1 +127,1 @@
		-    "autoprefixer": "^10.4.18",
		+    "autoprefixer": "^10.4.19",
		@@ -125,1 +129,1 @@
		-    "esbuild": "^0.20.1",
		+    "esbuild": "^0.23.0",
		@@ -126,1 +130,1 @@
		-    "eslint": "^8.57.0",
		+    "eslint": "^9.7.0",
		@@ -129,1 +133,1 @@
		-    "msw": "2.2.2",
		+    "msw": "2.3.1",
		@@ -130,1 +134,1 @@
		-    "node-html-parser": "^6.1.12",
		+    "node-html-parser": "^6.1.13",
		@@ -132,1 +136,1 @@
		-    "prettier": "^3.2.5",
		+    "prettier": "^3.3.3",
		@@ -133,1 +137,1 @@
		-    "prettier-plugin-sql": "^0.18.0",
		+    "prettier-plugin-sql": "^0.18.1",
		@@ -134,1 +138,1 @@
		-    "prettier-plugin-tailwindcss": "^0.5.11",
		+    "prettier-plugin-tailwindcss": "^0.6.5",
		@@ -135,1 +139,1 @@
		-    "remix-flat-routes": "^0.6.4",
		+    "remix-flat-routes": "^0.6.5",
		@@ -136,1 +140,1 @@
		-    "tsx": "^4.7.1",
		+    "tsx": "^4.16.2",
		@@ -137,1 +141,1 @@
		-    "typescript": "^5.4.5",
		+    "typescript": "^5.5.3",
		@@ -138,1 +142,1 @@
		-    "vite": "^5.1.5"
		+    "vite": "^5.3.4",
		@@ -143,1 +143,4 @@
		-  "epic-stack": true
		+  "epic-stack": {
		+    "head": "5e8df6fa4392107f978906e1a04fa00705f37dde",
		+    "date": "2024-08-12T05:40:24Z"
		+  },
	`)
})

test("elides values when the only difference is a caret", () => {
  const patchText = `--- a/package.json
+++ b/package.json
@@ -2,4 +2,8 @@
 	"private": true,
 	"sideEffects": false,
 	"type": "module",
+	"epic-stack": {
+		"head": "5e8df6fa4392107f978906e1a04fa00705f37dde",
+		"date": "2024-08-12T05:40:24Z"
+	},
 	"imports": {
@@ -13,1 +13,1 @@
-		"build:remix": "remix vite:build --sourcemapClient",
+		"build:remix": "remix vite:build",
@@ -32,1 +37,1 @@
-		"@conform-to/react": "^1.0.2",
+		"@conform-to/react": "^1.1.5",
@@ -33,1 +38,1 @@
-		"@conform-to/zod": "^1.0.2",
+		"@conform-to/zod": "^1.1.5",
@@ -34,1 +39,1 @@
-		"@epic-web/cachified": "^5.1.2",
+		"@epic-web/cachified": "^5.2.0",
@@ -35,1 +40,1 @@
-		"@epic-web/client-hints": "^1.3.0",
+		"@epic-web/client-hints": "^1.3.2",
@@ -37,1 +42,1 @@
-		"@epic-web/remember": "^1.0.2",
+		"@epic-web/remember": "^1.1.0",
@@ -40,1 +45,1 @@
-		"@nasa-gcn/remix-seo": "^2.0.0",
+		"@nasa-gcn/remix-seo": "^2.0.1",
@@ -42,1 +47,1 @@
-		"@prisma/client": "^5.10.2",
+		"@prisma/client": "^5.17.0",
@@ -43,1 +48,1 @@
-		"@radix-ui/react-checkbox": "^1.0.4",
+		"@radix-ui/react-checkbox": "^1.1.1",
@@ -44,1 +49,1 @@
-		"@radix-ui/react-dropdown-menu": "^2.0.6",
+		"@radix-ui/react-dropdown-menu": "^2.1.1",
@@ -45,1 +50,1 @@
-		"@radix-ui/react-label": "^2.0.2",
+		"@radix-ui/react-label": "^2.1.0",
@@ -46,1 +51,1 @@
-		"@radix-ui/react-slot": "^1.0.2",
+		"@radix-ui/react-slot": "^1.1.0",
@@ -47,1 +52,1 @@
-		"@radix-ui/react-toast": "^1.1.5",
+		"@radix-ui/react-toast": "^1.2.1",
@@ -48,1 +53,1 @@
-		"@radix-ui/react-tooltip": "^1.0.7",
+		"@radix-ui/react-tooltip": "^1.1.2",
@@ -49,1 +54,1 @@
-		"@react-email/components": "0.0.15",
+		"@react-email/components": "0.0.21",
@@ -50,1 +55,1 @@
-		"@remix-run/express": "2.8.1",
+		"@remix-run/express": "2.10.3",
@@ -51,1 +56,1 @@
-		"@remix-run/node": "2.8.1",
+		"@remix-run/node": "2.10.3",
@@ -52,1 +57,1 @@
-		"@remix-run/react": "2.8.1",
+		"@remix-run/react": "2.10.3",
@@ -54,1 +59,1 @@
-		"@sentry/profiling-node": "^7.105.0",
+		"@sentry/profiling-node": "^8.18.0",
@@ -55,1 +60,1 @@
-		"@sentry/remix": "^7.105.0",
+		"@sentry/remix": "^8.18.0",
@@ -56,1 +61,1 @@
-		"address": "^2.0.2",
+		"address": "^2.0.3",
@@ -58,1 +63,1 @@
-		"better-sqlite3": "^9.4.3",
+		"better-sqlite3": "^11.1.2",
@@ -62,1 +67,1 @@
-		"clsx": "^2.1.0",
+		"clsx": "^2.1.1",
@@ -70,1 +75,1 @@
-		"execa": "^8.0.1",
+		"execa": "^9.3.0",
@@ -71,1 +76,1 @@
-		"express": "^4.18.3",
+		"express": "^4.19.2",
@@ -72,1 +77,1 @@
-		"express-rate-limit": "^7.2.0",
+		"express-rate-limit": "^7.3.1",
@@ -73,1 +78,1 @@
-		"get-port": "^7.0.0",
+		"get-port": "^7.1.0",
@@ -74,1 +79,1 @@
-		"glob": "^10.3.10",
+		"glob": "^11.0.0",
@@ -75,2 +80,3 @@
 		"helmet": "^7.1.0",
+		"input-otp": "^1.2.4",
 		"intl-parse-accept-language": "^1.0.0",
@@ -77,1 +82,1 @@
-		"isbot": "^5.1.1",
+		"isbot": "^5.1.13",
@@ -79,1 +84,1 @@
-		"lru-cache": "^10.2.0",
+		"lru-cache": "^11.0.0",
@@ -81,1 +86,1 @@
-		"prisma": "^5.10.2",
+		"prisma": "^5.17.2",
@@ -83,1 +88,1 @@
-		"react": "^18.2.0",
+		"react": "^18.3.1",
@@ -84,1 +89,1 @@
-		"react-dom": "^18.2.0",
+		"react-dom": "^18.3.1",
@@ -85,1 +90,1 @@
-		"remix-auth": "^3.6.0",
+		"remix-auth": "^3.7.0",
@@ -88,1 +93,1 @@
-		"remix-utils": "^7.5.0",
+		"remix-utils": "^7.6.0",
@@ -90,1 +95,1 @@
-		"sonner": "^1.4.3",
+		"sonner": "^1.5.0",
@@ -93,1 +98,1 @@
-		"tailwind-merge": "^2.2.1",
+		"tailwind-merge": "^2.4.0",
@@ -94,1 +99,1 @@
-		"tailwindcss": "^3.4.1",
+		"tailwindcss": "^3.4.6",
@@ -96,1 +101,1 @@
-		"tailwindcss-radix": "^2.8.0",
+		"tailwindcss-radix": "^3.0.3",
@@ -97,1 +102,1 @@
-		"zod": "^3.22.4"
+		"zod": "^3.23.8"
@@ -98,3 +103,4 @@
 	},
 	"devDependencies": {
+		"@epic-web/config": "^1.12.0",
 		"@faker-js/faker": "^8.4.1",
@@ -101,1 +106,1 @@
-		"@remix-run/dev": "2.8.1",
+		"@remix-run/dev": "2.10.3",
@@ -102,1 +107,1 @@
-		"@remix-run/eslint-config": "2.8.1",
+		"@remix-run/eslint-config": "2.10.3",
@@ -103,1 +108,1 @@
-		"@remix-run/serve": "2.8.1",
+		"@remix-run/serve": "2.10.3",
@@ -104,1 +109,1 @@
-		"@remix-run/testing": "2.8.1",
+		"@remix-run/testing": "2.10.3",
@@ -105,1 +110,1 @@
-		"@sly-cli/sly": "^1.10.0",
+		"@sly-cli/sly": "file:../sly/cli",
@@ -106,2 +111,3 @@
+		"@testing-library/dom": "^10.3.2",
 		"@total-typescript/ts-reset": "^0.5.1",
 		"@types/bcryptjs": "^2.4.6",
@@ -108,1 +113,1 @@
-		"@types/better-sqlite3": "^7.6.9",
+		"@types/better-sqlite3": "^7.6.11",
@@ -111,1 +116,1 @@
-		"@types/eslint": "^8.56.5",
+		"@types/eslint": "^8.56.10",
@@ -116,1 +121,1 @@
-		"@types/node": "^20.11.24",
+		"@types/node": "^20.14.11",
@@ -118,1 +123,1 @@
-		"@types/react": "^18.2.63",
+		"@types/react": "^18.3.3",
@@ -119,1 +124,1 @@
-		"@types/react-dom": "^18.2.20",
+		"@types/react-dom": "^18.3.0",
@@ -123,1 +128,1 @@
-		"autoprefixer": "^10.4.18",
+		"autoprefixer": "^10.4.19",
@@ -125,1 +130,1 @@
-		"esbuild": "^0.20.1",
+		"esbuild": "^0.23.0",
@@ -126,1 +131,1 @@
-		"eslint": "^8.57.0",
+		"eslint": "^9.7.0",
@@ -129,1 +134,1 @@
-		"msw": "2.2.2",
+		"msw": "2.3.1",
@@ -130,1 +135,1 @@
-		"node-html-parser": "^6.1.12",
+		"node-html-parser": "^6.1.13",
@@ -132,1 +137,1 @@
-		"prettier": "^3.2.5",
+		"prettier": "^3.3.3",
@@ -133,1 +138,1 @@
-		"prettier-plugin-sql": "^0.18.0",
+		"prettier-plugin-sql": "^0.18.1",
@@ -134,1 +139,1 @@
-		"prettier-plugin-tailwindcss": "^0.5.11",
+		"prettier-plugin-tailwindcss": "^0.6.5",
@@ -135,1 +140,1 @@
-		"remix-flat-routes": "^0.6.4",
+		"remix-flat-routes": "^0.6.5",
@@ -136,1 +141,1 @@
-		"tsx": "^4.7.1",
+		"tsx": "^4.16.2",
@@ -137,1 +142,1 @@
-		"typescript": "^5.4.5",
+		"typescript": "^5.5.3",
@@ -138,1 +143,1 @@
-		"vite": "^5.1.5"
+		"vite": "^5.3.4"
`
  const targetFileContent = `{
	"name": "exercises__sep__01.create__sep__01.solution.nested-routing",
	"private": true,
	"sideEffects": false,
	"type": "module",
	"imports": {
		"#app/*": "./app/*",
		"#tests/*": "./tests/*"
	},
	"scripts": {
		"build": "run-s build:*",
		"build:icons": "tsx ./other/build-icons.ts",
		"build:remix": "remix vite:build --sourcemapClient",
		"build:server": "tsx ./other/build-server.ts",
		"predev": "npm run build:icons --silent",
		"dev": "node ./server/dev-server.js",
		"prisma:studio": "prisma studio",
		"format": "prettier --write .",
		"lint": "eslint .",
		"setup": "npm run build && prisma generate && prisma migrate deploy",
		"start": "cross-env NODE_ENV=production node .",
		"start:mocks": "cross-env NODE_ENV=production MOCKS=true tsx .",
		"typecheck": "tsc",
		"validate": "run-p lint typecheck"
	},
	"eslintIgnore": [
		"/node_modules",
		"/build",
		"/public/build",
		"/server-build"
	],
	"dependencies": {
		"@conform-to/react": "1.1.5",
		"@conform-to/zod": "1.1.5",
		"@epic-web/cachified": "5.2.0",
		"@epic-web/client-hints": "1.3.3",
		"@epic-web/config": "1.12.0",
		"@epic-web/invariant": "^1.0.0",
		"@epic-web/remember": "1.1.0",
		"@epic-web/totp": "^1.1.2",
		"@kentcdodds/workshop-utils": "3.14.1",
		"@nasa-gcn/remix-seo": "2.0.1",
		"@paralleldrive/cuid2": "^2.2.2",
		"@prisma/client": "5.18.0",
		"@radix-ui/react-checkbox": "1.1.1",
		"@radix-ui/react-dropdown-menu": "2.1.1",
		"@radix-ui/react-label": "2.1.0",
		"@radix-ui/react-slot": "1.1.0",
		"@radix-ui/react-toast": "1.2.1",
		"@radix-ui/react-tooltip": "1.1.2",
		"@react-email/components": "0.0.21",
		"@remix-run/express": "2.10.3",
		"@remix-run/node": "2.10.3",
		"@remix-run/react": "2.10.3",
		"@remix-run/server-runtime": "2.8.1",
		"@sentry/profiling-node": "8.25.0",
		"@sentry/remix": "8.25.0",
		"@testing-library/dom": "10.4.0",
		"address": "2.0.3",
		"bcryptjs": "^2.4.3",
		"better-sqlite3": "^9.4.3",
		"chalk": "^5.3.0",
		"class-variance-authority": "^0.7.0",
		"close-with-grace": "^1.3.0",
		"clsx": "2.1.1",
		"compression": "^1.7.4",
		"cookie": "^0.6.0",
		"cross-env": "^7.0.3",
		"crypto-js": "^4.2.0",
		"date-fns": "^3.3.1",
		"dotenv": "^16.4.5",
		"eslint-plugin-remix-react-routes": "^1.0.5",
		"execa": "9.3.0",
		"express": "4.19.2",
		"express-rate-limit": "7.4.0",
		"get-port": "7.1.0",
		"glob": "11.0.0",
		"helmet": "^7.1.0",
		"input-otp": "1.2.4",
		"intl-parse-accept-language": "^1.0.0",
		"isbot": "5.1.14",
		"litefs-js": "^1.1.2",
		"lru-cache": "11.0.0",
		"morgan": "^1.10.0",
		"prisma": "5.18.0",
		"qrcode": "^1.5.3",
		"react": "18.3.1",
		"react-dom": "18.3.1",
		"remix-auth": "3.7.0",
		"remix-auth-form": "^1.4.0",
		"remix-auth-github": "^1.6.0",
		"remix-utils": "7.6.0",
		"set-cookie-parser": "^2.6.0",
		"sonner": "1.5.0",
		"source-map-support": "^0.5.21",
		"spin-delay": "^1.2.0",
		"tailwind-merge": "2.5.2",
		"tailwindcss": "3.4.10",
		"tailwindcss-animate": "^1.0.7",
		"tailwindcss-radix": "3.0.4",
		"zod": "3.23.8"
	},
	"devDependencies": {
		"@faker-js/faker": "^8.4.1",
		"@remix-run/dev": "2.10.3",
		"@remix-run/eslint-config": "2.10.3",
		"@remix-run/serve": "2.10.3",
		"@remix-run/testing": "2.10.3",
		"@sly-cli/sly": "^1.10.0",
		"@total-typescript/ts-reset": "^0.5.1",
		"@types/bcryptjs": "^2.4.6",
		"@types/better-sqlite3": "7.6.11",
		"@types/compression": "^1.7.5",
		"@types/cookie": "^0.6.0",
		"@types/eslint": "8.56.11",
		"@types/express": "^4.17.21",
		"@types/fs-extra": "^11.0.4",
		"@types/glob": "^8.1.0",
		"@types/morgan": "^1.9.9",
		"@types/node": "20.14.15",
		"@types/qrcode": "^1.5.5",
		"@types/react": "18.3.3",
		"@types/react-dom": "18.3.0",
		"@types/set-cookie-parser": "^2.4.7",
		"@types/source-map-support": "^0.5.10",
		"@vitejs/plugin-react": "^4.2.1",
		"autoprefixer": "10.4.20",
		"enforce-unique": "^1.3.0",
		"esbuild": "0.23.0",
		"eslint": "9.9.0",
		"eslint-config-prettier": "^9.1.0",
		"fs-extra": "^11.2.0",
		"msw": "2.3.1",
		"node-html-parser": "6.1.13",
		"npm-run-all": "^4.1.5",
		"prettier": "3.3.3",
		"prettier-plugin-sql": "0.18.1",
		"prettier-plugin-tailwindcss": "0.6.6",
		"remix-flat-routes": "0.6.5",
		"tsx": "4.17.0",
		"typescript": "5.5.4",
		"vite": "5.4.0"
	},
	"engines": {
		"node": "20"
	},
	"epic-stack": true
}
`

  expect(correctJsonPatch(patchText, targetFileContent)).toMatchInlineSnapshot(`
		--- a/package.json
		+++ b/package.json
		@@ -4,2 +4,6 @@
		 	"type": "module",
		+	"epic-stack": {
		+		"head": "5e8df6fa4392107f978906e1a04fa00705f37dde",
		+		"date": "2024-08-12T05:40:24Z"
		+	},
		 	"imports": {
		@@ -12,1 +12,1 @@
		-		"build:remix": "remix vite:build --sourcemapClient",
		+		"build:remix": "remix vite:build",
		@@ -35,1 +40,1 @@
		-		"@epic-web/client-hints": "1.3.3",
		+		"@epic-web/client-hints": "^1.3.2",
		@@ -43,1 +48,1 @@
		-		"@prisma/client": "5.18.0",
		+		"@prisma/client": "^5.17.0",
		@@ -55,1 +60,1 @@
		-		"@sentry/profiling-node": "8.25.0",
		+		"@sentry/profiling-node": "^8.18.0",
		@@ -56,1 +61,1 @@
		-		"@sentry/remix": "8.25.0",
		+		"@sentry/remix": "^8.18.0",
		@@ -57,2 +62,3 @@
		+		"@testing-library/dom": "^10.3.2",
		 		"@total-typescript/ts-reset": "^0.5.1",
		 		"@types/bcryptjs": "^2.4.6",
		@@ -60,1 +65,1 @@
		-		"better-sqlite3": "^9.4.3",
		+		"better-sqlite3": "^11.1.2",
		@@ -74,1 +79,1 @@
		-		"express-rate-limit": "7.4.0",
		+		"express-rate-limit": "^7.3.1",
		@@ -80,1 +85,1 @@
		-		"isbot": "5.1.14",
		+		"isbot": "^5.1.13",
		@@ -84,1 +89,1 @@
		-		"prisma": "5.18.0",
		+		"prisma": "^5.17.2",
		@@ -96,1 +101,1 @@
		-		"tailwind-merge": "2.5.2",
		+		"tailwind-merge": "^2.4.0",
		@@ -97,1 +102,1 @@
		-		"tailwindcss": "3.4.10",
		+		"tailwindcss": "^3.4.6",
		@@ -99,1 +104,1 @@
		-		"tailwindcss-radix": "3.0.4",
		+		"tailwindcss-radix": "^3.0.3",
		@@ -108,1 +113,1 @@
		-		"@sly-cli/sly": "^1.10.0",
		+		"@sly-cli/sly": "file:../sly/cli",
		@@ -114,1 +119,1 @@
		-		"@types/eslint": "8.56.11",
		+		"@types/eslint": "^8.56.10",
		@@ -119,1 +124,1 @@
		-		"@types/node": "20.14.15",
		+		"@types/node": "^20.14.11",
		@@ -126,1 +131,1 @@
		-		"autoprefixer": "10.4.20",
		+		"autoprefixer": "^10.4.19",
		@@ -129,1 +134,1 @@
		-		"eslint": "9.9.0",
		+		"eslint": "^9.7.0",
		@@ -137,1 +142,1 @@
		-		"prettier-plugin-tailwindcss": "0.6.6",
		+		"prettier-plugin-tailwindcss": "^0.6.5",
		@@ -139,1 +144,1 @@
		-		"tsx": "4.17.0",
		+		"tsx": "^4.16.2",
		@@ -140,1 +145,1 @@
		-		"typescript": "5.5.4",
		+		"typescript": "^5.5.3",
		@@ -141,1 +146,1 @@
		-		"vite": "5.4.0"
		+		"vite": "^5.3.4"
	`)
})

test("does not drop removes", () => {
  const patchText = `diff --git a/package.json b/package.json
index d2b698d..eda808d 100644
--- a/package.json
+++ b/package.json
@@ -3,13 +3,18 @@
	 "private": true,
	 "sideEffects": false,
	 "type": "module",
+  "epic-stack": {
+    "head": "5e8df6fa4392107f978906e1a04fa00705f37dde",
+    "date": "2024-08-12T05:40:24Z"
+  },
	 "imports": {
-    "#*": "./*"
+    "#app/*": "./app/*",
+    "#tests/*": "./tests/*"
	 },
	 "scripts": {
		 "build": "run-s build:*",
		 "build:icons": "tsx ./other/build-icons.ts",
-    "build:remix": "remix vite:build --sourcemapClient",
+    "build:remix": "remix vite:build",
		 "build:server": "tsx ./other/build-server.ts",
		 "predev": "npm run build:icons --silent",
		 "dev": "node ./server/dev-server.js",
 }`

  const targetFileContent = `{
	"name": "exercises__sep__01.create__sep__02.solution.item-form",
	"private": true,
	"sideEffects": false,
	"type": "module",
	"epic-stack": true,
	"imports": {
		"#*": "./*"
	},
	"scripts": {
		"build": "run-s build:*",
		"build:icons": "tsx ./other/build-icons.ts",
		"build:remix": "remix vite:build --sourcemapClient",
		"build:server": "tsx ./other/build-server.ts",
		"predev": "npm run build:icons --silent",
		"dev": "node ./server/dev-server.js",
		"prisma:studio": "prisma studio",
		"format": "prettier --write .",
		"lint": "eslint .",
		"setup": "npm run build && prisma generate && prisma migrate deploy",
		"start": "cross-env NODE_ENV=production node .",
		"start:mocks": "cross-env NODE_ENV=production MOCKS=true tsx .",
		"typecheck": "tsc",
		"validate": "run-p lint typecheck"
	},`

  expect(correctJsonPatch(patchText, targetFileContent)).toMatchInlineSnapshot(`
		--- a/package.json
		+++ b/package.json
		@@ -4,2 +4,6 @@
			 "type": "module",
		+  "epic-stack": {
		+    "head": "5e8df6fa4392107f978906e1a04fa00705f37dde",
		+    "date": "2024-08-12T05:40:24Z"
		+  },
			 "imports": {
		@@ -6,6 +6,7 @@
			 "imports": {
		-    "#*": "./*"
		+    "#app/*": "./app/*",
		+    "#tests/*": "./tests/*"
			 },
			 "scripts": {
				 "build": "run-s build:*",
				 "build:icons": "tsx ./other/build-icons.ts",
		@@ -13,1 +13,1 @@
		-    "build:remix": "remix vite:build --sourcemapClient",
		+    "build:remix": "remix vite:build",
	`)
})

test("pairs symbols between matching keys", () => {
  const patchText = `diff --git a/components.json b/components.json
index 0ed0c38..4897a3b 100644
--- a/components.json
+++ b/components.json
@@ -1,15 +1,15 @@
 {
-  "$schema": "https://ui.shadcn.com/schema.json",
-  "style": "default",
-  "rsc": false,
-  "tailwind": {
-    "config": "tailwind.config.ts",
-    "css": "app/styles/tailwind.css",
-    "baseColor": "slate",
-    "cssVariables": true
-  },
-  "aliases": {
-    "components": "#app/components",
-    "utils": "#app/utils/misc.tsx"
-  }
+	"$schema": "schema.json",
+	"style": "default",
+	"rsc": false,
+	"tailwind": {
+		"config": "tailwind.config.ts",
+		"css": "app/styles/tailwind.css",
+		"baseColor": "slate",
+		"cssVariables": true
+	},
+	"aliases": {
+		"components": "#app/components",
+		"utils": "#app/utils/misc.tsx"
+	}
 }`

  const targetFileContent = `{
	"$schema": "https://ui.shadcn.com/schema.json",
	"style": "default",
	"rsc": false,
	"tailwind": {
		"config": "tailwind.config.ts",
		"css": "app/styles/tailwind.css",
		"baseColor": "slate",
		"cssVariables": true
	},
	"aliases": {
		"components": "#app/components",
		"utils": "#app/utils/misc.tsx"
	}
}
`

  expect(correctJsonPatch(patchText, targetFileContent)).toMatchInlineSnapshot(`
    --- a/components.json
    +++ b/components.json
    @@ -1,1 +1,1 @@
    -	"$schema": "https://ui.shadcn.com/schema.json",
    +	"$schema": "schema.json",
  `)
})
