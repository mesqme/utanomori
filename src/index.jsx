import './style.css'
import { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'

import Loader from './loader/Loader.jsx'
import { applySoundJourneyCssVariables } from './config/soundJourneyPalette.js'

// ENTRY CHUNK — kept deliberately tiny (react + the Loader + the light stores; NO three.js): the
// loading screen must appear within moments of the HTML, not after the multi-MB 3D bundle. The rest
// of the app (Canvas/three/drei/UI/audio — see App.jsx) loads lazily behind it; a ShellBridge in
// that chunk feeds the Loader real asset progress once it arrives. Before ANY JS runs, the static
// pre-loader in index.html shows the same screen — the Loader fades it out when progress starts.
const App = lazy(() => import('./App.jsx'))

applySoundJourneyCssVariables()

// iOS Safari ignores user-scalable=no — its proprietary gesture events are the reliable way to stop
// pinch-zoom mid-game (double-tap zoom is already killed by touch-action: none in style.css).
// No-ops on browsers that don't fire gesture* events.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (event) => event.preventDefault(), { passive: false })
}

const root = ReactDOM.createRoot(document.querySelector('#root'))

root.render(
    <>
        <Suspense fallback={null}>
            <App />
        </Suspense>
        <Loader />
    </>
)
