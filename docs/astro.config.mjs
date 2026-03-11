// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://eduardopech.github.io',
	base: '/chess-core/',
	integrations: [
		starlight({
			title: 'chess-core',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/EduardoPech/chess-core' }],
			sidebar: [
				{ label: 'Introduction', slug: '' },
				{ label: 'Getting started', slug: 'guides/getting-started' },
				{ label: "Scholar's Mate example", slug: 'guides/scholars-mate' },
				{
					label: 'Reference',
					items: [
						{ label: 'API', slug: 'reference/api' },
					],
				},
			],
		}),
	],
});
