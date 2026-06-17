import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { youwareVitePlugin } from '@youware/vite-plugin-react';

export default defineConfig({
  plugins: [react(), youwareVitePlugin()],
  server: {
    port: 5173,
    strictPort: true,
  },
});