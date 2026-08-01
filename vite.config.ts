import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Subway Surfer 3D',
        short_name: 'Surfer',
        theme_color: '#ffffff',
      }
    })
  ],
  server: {
    host: true,
    port: 5174,
    strictPort: true
  }
});
