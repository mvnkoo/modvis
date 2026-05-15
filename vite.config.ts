import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };
const sourceRepo = process.env.VITE_SOURCE_REPO ?? 'https://github.com/mvnkoo/modvis';

export default defineConfig(({ command }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __SOURCE_REPO__: JSON.stringify(sourceRepo),
  },
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors the CRA "baseUrl: src" behavior so absolute imports like
      // `import { Foo } from 'common/...'` keep working.
      common: path.resolve(__dirname, 'src/common'),
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
  esbuild: {
    // Production-Build: console.* + debugger entfernen. Dev bleibt unverändert.
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
}));
