import MiduAnimations from '@midudev/tailwind-animations'
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				'brand-gray': '#acb5c7',
			},
			fontFamily: {
				anton: ['Anton', 'sans-serif'],
				rubik: ['Rubik Variable', 'Rubik', 'sans-serif'],
				teko: ['Teko Variable', 'Teko', 'sans-serif'],
			}
		},
	},
	plugins: [
		MiduAnimations,
		typography,
	],
}
