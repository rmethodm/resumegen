import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    build: {
        outDir: '../sidepanel/dist',
        emptyOutDir: true,
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        setupFiles: ['src/test-setup.ts'],
    },
});
