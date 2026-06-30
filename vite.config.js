import react from '@vitejs/plugin-react'
import restart from 'vite-plugin-restart'
import glsl from 'vite-plugin-glsl'

export default {
    root: 'src/',
    publicDir: '../public/',
    plugins: [
        restart({ restart: ['../public/**'] }),
        react(),
        glsl({
            include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
        }),
    ],
    base: '/sound-journey/',
    assetsInclude: ['**/*.glb', '**/*.gltf'],
    server: {
        host: true, // Open to local network and display URL
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env), // Open if it's not a CodeSandbox
    },
    build: {
        outDir: '../dist', // Output in the dist/ folder
        emptyOutDir: true, // Empty the folder first
        sourcemap: false, // No sourcemap in the public build (~8.8MB lighter). Set back to true to debug prod errors in devtools.
    },
}
