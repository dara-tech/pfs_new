// PSF frontend – Vite config
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function injectFontPreload() {
  return {
    name: 'inject-font-preload',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;

        const links = Object.values(bundle)
          .filter((chunk) => chunk.type === 'asset' && chunk.fileName?.endsWith('.woff2'))
          .map(
            (chunk) =>
              `<link rel="preload" href="/${chunk.fileName}" as="font" type="font/woff2" crossorigin>`
          )
          .join('\n    ');

        if (!links) return html;
        return html.replace('</head>', `    ${links}\n  </head>`);
      },
    },
  };
}

// Only split very large optional deps. Do NOT split react vs react-leaflet into
// separate chunks — that created a circular import (react <-> maps) and broke
// createContext at runtime (blank page).
function manualChunk(id) {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'charts';
  if (id.includes('xlsx')) return 'xlsx';
  return undefined;
}

export default defineConfig({
  build: {
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: manualChunk,
      },
    },
  },
  plugins: [react(), injectFontPreload()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
