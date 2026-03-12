import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    target: 'es2023',
    lib: {
      entry: resolve(projectRoot, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        '@turf/helpers',
        '@turf/length',
        '@turf/meta',
        '@turf/point-to-line-distance',
        '@turf/rhumb-distance',
        'geojson-path-finder',
      ],
    },
  },
});
