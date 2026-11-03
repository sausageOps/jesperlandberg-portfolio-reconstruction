import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /* Pre-declare every bare import the app uses. Without this the dev server discovers
     `react-dom/client` mid-session, re-optimizes dependencies and can serve two
     pre-bundle generations at once — which looks like two copies of React and breaks
     every hook ("Cannot read properties of null (reading 'useState')"). */
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'gsap',
      'gsap/Flip',
      'three',
      'three/addons/loaders/GLTFLoader.js',
      'three/addons/utils/BufferGeometryUtils.js',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
    ],
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
