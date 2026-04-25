import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors the CRA "baseUrl: src" behavior so absolute imports like
      // `import { Foo } from 'common/...'` keep working.
      common: path.resolve(__dirname, 'src/common'),
      context: path.resolve(__dirname, 'src/context'),
      features: path.resolve(__dirname, 'src/features'),
      types: path.resolve(__dirname, 'src/types'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
  },
});
