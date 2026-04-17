import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;

const sharedOptions = {
  sourcemap: true,
  target: 'es2022',
  platform: 'browser',
  esbuildOptions(options: { define?: Record<string, string> }) {
    options.legalComments = 'none';
    options.define = {
      ...options.define,
      __VERSION__: JSON.stringify(version),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    };
    options.treeShaking = true;
    options.minifyIdentifiers = true;
    options.minifySyntax = true;
    options.minifyWhitespace = true;
  },
};

export default defineConfig([
  {
    ...sharedOptions,
    entry: {
      react: 'src/react/index.ts',
      vue: 'src/vue/index.ts',
      angular: 'src/angular/index.ts',
    },
    format: ['esm', 'cjs'],
    external: ['react', 'react-dom', 'vue', '@angular/core'],
    dts: true,
    clean: false,
    splitting: false,
    minify: true,
    outDir: 'dist',
    banner: { js: '"use client";' },
  },
  {
    ...sharedOptions,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs', 'iife'],
    external: ['buffer', 'node:buffer', 'crypto', 'node:crypto'],
    dts: true,
    clean: false,
    splitting: false,
    treeshake: { preset: 'smallest', moduleSideEffects: false },
    minify: true,
    outDir: 'dist',
    globalName: 'TryMellon',
    onSuccess: 'echo "Build completed successfully"',
  },
  {
    ...sharedOptions,
    entry: { index: 'src/web3/index.ts' },
    outDir: 'dist/web3',
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
    splitting: false,
    treeshake: { preset: 'smallest', moduleSideEffects: false },
    minify: true,
  },
  {
    ...sharedOptions,
    entry: { index: 'src/ui/index.ts' },
    outDir: 'dist/ui',
    format: ['esm'],
    dts: true,
    clean: false,
    splitting: false,
    minify: true,
  },
]);
