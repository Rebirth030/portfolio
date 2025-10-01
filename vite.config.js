// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import restart from 'vite-plugin-restart'
import { transformWithEsbuild } from 'vite'

export default defineConfig({
    root: 'src/',
    publicDir: '../public/',
    plugins: [
        restart({ restart: ['../public/**'] }),
        react(),
        {
            name: 'load+transform-js-files-as-jsx',
            async transform(code, id) {
                if (!id.match(/src\/.*\.js$/)) return null
                return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' })
            },
        },
    ],
    server: {
        host: true,
        preTransformRequests: false, // reduziert doppelte Dev-Requests
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env),
    },
    build: { outDir: '../dist', emptyOutDir: true, sourcemap: true },
    optimizeDeps: {
        esbuildOptions: { target: 'esnext' },
        // Wichtig: Rapier & Wrapper nicht vor-bundeln
        exclude: ['@react-three/rapier', '@dimforge/rapier3d-compat'],
    },
})
