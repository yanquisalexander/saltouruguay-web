// @ts-check
import { defineConfig, envField } from 'astro/config';
// @ts-ignore
/* import rollupPluginNodeBuiltins from 'rollup-plugin-node-builtins';
 */
import vercel from '@astrojs/vercel';
import preact from '@astrojs/preact';

import auth from 'auth-astro';
import migrateDatabaseIntegration from "./src/hooks/migrateDatabase";

import sitemap from '@astrojs/sitemap';
import { SITEMAP_EXCLUDED_PATHS } from "./src/config";
import notifyNewVersion from "./src/hooks/notifyNewVersion";

import tailwindcss from '@tailwindcss/vite';

const buildHash = new Date().getTime().toString(36);

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    preact({
      compat: true
    }),
    auth({ injectEndpoints: true, }),
    migrateDatabaseIntegration(),
    notifyNewVersion(),
    sitemap({
      filter: (page) => !SITEMAP_EXCLUDED_PATHS.includes(page)
    })
  ],
  devToolbar: {
    enabled: false
  },
  trailingSlash: 'never',

  site: "https://saltouruguayserver.com/",
  env: {
    schema: {
      TWITCH_CLIENT_ID: envField.string({ context: 'server', access: 'public' }),
      TWITCH_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' }),
      PUSHER_APP_ID: envField.string({ context: "client", access: 'public' }),
      PUSHER_APP_KEY: envField.string({ context: 'client', access: 'public' }),
      PUSHER_APP_SECRET: envField.string({ context: 'server', access: 'secret' }),
      PUSHER_APP_CLUSTER: envField.string({ context: 'client', access: 'public' }),
      CRON_SECRET: envField.string({ context: 'server', access: 'public' }),
      DISCORD_LOGS_WEBHOOK_TOKEN: envField.string({ context: 'server', access: 'public' }),
      SUS_OAUTH_ACCESS_TOKEN_EXPIRY: envField.number({ context: 'server', access: 'public', default: 3600 }),
      SUS_OAUTH_REFRESH_TOKEN_EXPIRY: envField.number({ context: 'server', access: 'public', default: 2592000 }),
      SUS_OAUTH_AUTH_CODE_EXPIRY: envField.number({ context: 'server', access: 'public', default: 600 }),
      SUS_OAUTH_SERVICE_TOKEN_EXPIRY: envField.number({ context: 'server', access: 'public', default: 3600 }),
    },
  },
  server: {

  },
  security: {
    /* 
      TODO: Only allow some origins
    */
    checkOrigin: false
  },
  vite: {
    server: {
      cors: true,
      allowedHosts: true
    },
    resolve: {
      alias: {
        react: 'preact/compat',
        'react-dom/test-utils': 'preact/test-utils',
        'react-dom': 'preact/compat',
        'react/jsx-runtime': 'preact/jsx-runtime',
      },
    },
    define: {
      __BUILD_HASH__: JSON.stringify(buildHash),
    },
    optimizeDeps: {
      exclude: ['edge-tts', 'motion/react']
    },

    plugins: [tailwindcss()],
  }
});