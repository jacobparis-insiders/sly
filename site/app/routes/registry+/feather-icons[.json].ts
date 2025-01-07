// http://localhost:3000/registry/feather-icons.json
// https://sly-cli.fly.dev/registry/feather-icons.json

import { json, type LoaderFunctionArgs } from 'react-router'
import type { z } from 'zod'
import type { Meta, libraryIndexSchema } from '../../schemas.js'
import { getGithubDirectory } from '../../github.server.js'
export const meta = {
	name: 'feather-icons',
	source: 'https://feathericons.com/',
	description: 'Simply beautiful open-source icons.',
	license: 'https://github.com/feathericons/feather/blob/main/LICENSE',
	tags: ['icons'],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
	const icons = await getGithubDirectory({
		owner: 'feathericons',
		repo: 'feather',
		path: 'icons',
		ref: 'main',
	}).then((resources) =>
		resources
			.filter((file) => {
				if (!file.path?.endsWith('.svg')) return false

				return true
			})
			.map((file) => {
				if (!file.path) throw new Error('File path is undefined')

				return {
					name: file.path
						.replace('icons/', '')
						.toLowerCase()
						.replace(/\.svg$/, ''),
				}
			}),
	)

	const resources = icons.sort((a, b) => a.name.localeCompare(b.name))
	return json<z.input<typeof libraryIndexSchema>>({
		version: '1.0.0',
		meta,
		resources,
	})
}
