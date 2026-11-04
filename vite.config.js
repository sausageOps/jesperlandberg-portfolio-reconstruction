import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Carter's CSS (src/carter/) is ported in Carter's own units, where 1rem is the
// browser default of 16px. Jesper's root font-size is fluid (styles.css), so
// rem values in declarations under src/carter/ are compiled to px. Media-query
// params keep rem: they resolve against the initial 16px in both projects. No
// file outside src/carter/ is touched.
const carterDir = fileURLToPath(new URL('./src/carter/', import.meta.url));
const carterRemToPx = {
  postcssPlugin: 'carter-rem-to-px',
  Declaration(decl) {
    const file = decl.source?.input?.file?.split('?')[0];
    if (!file?.startsWith(carterDir) || !decl.value.includes('rem')) return;
    decl.value = decl.value.replace(
      /url\([^)]*\)|(-?(?:\d+\.\d*|\.\d+|\d+))rem\b/g,
      (match, value) => (value === undefined ? match : `${+(parseFloat(value) * 16).toFixed(4)}px`),
    );
  },
};

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [carterRemToPx],
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
