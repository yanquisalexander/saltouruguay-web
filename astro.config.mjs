// @ts-check
import { defineConfig, envField } from 'astro/config';

import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';

import auth from 'auth-astro';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind(), preact({
    compat: true
  }), auth()],
  devToolbar: {
    enabled: false
  },
  experimental: {
    serverIslands: true,
    env: {
      schema: {
        TWITCH_CLIENT_ID: envField.string({ context: 'server', access: 'public' }),
        TWITCH_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' }),
      }
    }
  }
});