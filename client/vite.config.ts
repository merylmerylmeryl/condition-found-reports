import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vue()],
    server: {
      // The browser only talks to the Vite origin; /api is proxied to Express.
      // Same-origin in dev means no CORS config on the server at all.
      proxy: { '/api': env.API_PROXY_TARGET ?? 'http://localhost:3000' },
    },
  };
});
