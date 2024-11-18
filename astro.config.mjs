// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';

import auth from 'auth-astro';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind(), preact(), auth()],
  devToolbar: {
    enabled: false
  },
  experimental: {
    serverIslands: true
  }
});