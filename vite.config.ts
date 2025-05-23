import { defineConfig } from 'vite';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/app.ts'),
            name: 'TelegramBot',
            formats: ['es'],
            fileName: 'app',
        },
        rollupOptions: {
            // External dependencies that shouldn't be bundled
            external: ['axios', 'fastify', 'events'],
        },
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'esbuild',
        sourcemap: true,
        target: 'esnext',
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
});
