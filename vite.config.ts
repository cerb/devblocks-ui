import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  const aliases = {
    'devblocks-ui/styles': resolve(here, 'styles/index.scss'),
    'devblocks-ui': resolve(here, 'src/index.ts'),
  };

  if (command === 'serve') {
    return {
      root: 'examples',
      resolve: { alias: aliases },
      server: { port: 5173, open: true },
    };
  }

  return {
    build: {
      lib: {
        entry: resolve(here, 'src/index.ts'),
        name: 'DevblocksUI',
        fileName: (format) =>
          format === 'es' ? 'devblocks-ui.esm.js' : 'devblocks-ui.js',
        formats: ['iife', 'es'],
      },
      sourcemap: false,
      cssCodeSplit: false,
      emptyOutDir: false,
    },
  };
});
