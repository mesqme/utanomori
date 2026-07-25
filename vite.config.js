import react from '@vitejs/plugin-react'
import restart from 'vite-plugin-restart'
import glsl from 'vite-plugin-glsl'

export default {
    root: 'src/',
    publicDir: '../public/',
    // ONE copy of three, always. The lazy entry split (index → lazy App.jsx) made the dev
    // optimizer link two three instances (the loaders reported progress to one
    // DefaultLoadingManager while drei's useProgress listened on another → the loading bar froze
    // at 0). dedupe + optimizing the whole 3D set up front keeps dev linkage consistent with the
    // production build (which is a single rollup graph and was never affected).
    resolve: {
        dedupe: ['three'],
    },
    optimizeDeps: {
        entries: ['index.html', 'App.jsx'],
        include: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing', 'leva', 'gsap', 'zustand', 'r3f-perf'],
    },
    plugins: [
        restart({ restart: ['../public/**'] }),
        react(),
        glsl({
            include: ['**/*.glsl'],
        }),
    ],
    base: '/utanomori/', // served at mesq.me/utanomori/ — all asset URLs are prefixed with this
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
