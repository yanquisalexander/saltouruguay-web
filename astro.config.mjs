// @ts-check
import { defineConfig, envField } from 'astro/config';

import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';

import auth from 'auth-astro';
import migrateDatabaseIntegration from "./src/hooks/migrateDatabase";

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind(), preact({
    compat: true
  }), auth(), migrateDatabaseIntegration(), sitemap()],
  devToolbar: {
    enabled: false
  },
  trailingSlash: 'never',

  site: "https://saltouruguayserver.com/",
  experimental: {
    env: {
      schema: {
        TWITCH_CLIENT_ID: envField.string({ context: 'server', access: 'public' }),
        TWITCH_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' }),
        PUSHER_APP_ID: envField.string({ context: 'server', access: 'public' }),
        PUSHER_APP_KEY: envField.string({ context: 'server', access: 'public' }),
        PUSHER_APP_SECRET: envField.string({ context: 'server', access: 'secret' }),
        PUSHER_APP_CLUSTER: envField.string({ context: 'server', access: 'public' }),
      },
    },
    serverIslands: true,
  }
});