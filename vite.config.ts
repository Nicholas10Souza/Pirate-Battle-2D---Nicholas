import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'copy-assets-on-build',
            closeBundle() {
                if (fs.existsSync('public/assets')) {
                    fs.cpSync('public/assets', 'dist/assets', { recursive: true });
                }
            },
        },
    ],
    server: {
        port: 5173,
        open: true,
    },
});