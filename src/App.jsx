import { useEffect } from 'react'
import { DefaultLoadingManager } from 'three'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Leva } from 'leva'

import Experience from './Experience.jsx'
import IntroTitle from './loader/IntroTitle.jsx'
import Links from './ui/Links.jsx'
import ControlsIcons from './ui/ControlsIcons.jsx'
import Joystick from './ui/Joystick.jsx'
import InteractionPrompt from './ui/InteractionPrompt.jsx'
import Tutorial from './ui/Tutorial.jsx'
import LoaderDebugOverlay from './debug/LoaderDebugOverlay.jsx'
import GameDirector from './game/GameDirector.jsx'
import Dialogue from './game/Dialogue.jsx'
import FinaleDialogue from './game/FinaleDialogue.jsx'
import SongGame from './game/SongGame.jsx'
import Credits from './game/Credits.jsx'
import useStore from './stores/useStore.jsx'
import useLoaderShell from './stores/useLoaderShell.jsx'
import { chainManagerHandler } from './loader/loadingManagerChain.js'
import { registerLoaderAudio } from './game/loaderBridge.js'
import { resumeAudio } from './game/songAudio.js'
import { startMusicTracks, preloadMusicTracks } from './game/musicTracks.js'
import { preloadGameSounds } from './game/gameSounds.js'
import { preloadCicadas, preloadAmbientSounds } from './game/ambientSounds.js'

// The LAZY half of the app (see index.jsx): everything except the Loader — the 3D world, all the
// game UI, and the audio engine. Loaded via React.lazy so the ENTRY chunk (the Loader) stays tiny
// and the loading screen appears within moments of the HTML, instead of after this whole bundle.

// Asset-progress mirror for the Loader (entry chunk — it can't import three itself). NOT drei's
// useProgress: both drei and r3f-perf ship their own bundled copy of that hook and each one
// plain-ASSIGNS the manager's handler slots, so ownership comes down to import order (exactly how
// the loading bar silently froze at 0 after the entry split reshuffled the graph — see
// loadingManagerChain.js). Chaining instead means this module body, which runs AFTER every import
// above has evaluated, always ends up outermost and feeds the shell store directly. Attached
// BEFORE the first tracked load below so no event is missed.
chainManagerHandler(DefaultLoadingManager, 'onStart', (item, loaded, total) => {
    useLoaderShell.setState({ ready: true, active: true, progress: total > 0 ? (loaded / total) * 100 : 0 })
})
chainManagerHandler(DefaultLoadingManager, 'onProgress', (item, loaded, total) => {
    useLoaderShell.setState({ ready: true, active: true, progress: total > 0 ? (loaded / total) * 100 : 0 })
})
chainManagerHandler(DefaultLoadingManager, 'onLoad', () => {
    useLoaderShell.setState({ ready: true, active: false, progress: 100 })
})

// Hand the Loader the audio triggers it can't import directly (they'd drag three.js into the entry
// chunk). Registered at module-load, i.e. as soon as this chunk arrives — long before GO exists.
registerLoaderAudio({ resumeAudio, startMusicTracks, preloadMusicTracks, preloadGameSounds, preloadAmbientSounds })

// CRITICAL audio only: the base cicada ambient, kicked off as soon as this chunk loads and counted
// on the loading bar (registered with three's loading manager) so the scene is never silent at the
// start. Everything else (music, game one-shots, other ambient) loads in the BACKGROUND once the
// bar completes — see Loader — so it doesn't hold up GO.
preloadCicadas()

// Mirror the Loader's tunable params (Leva loader-debug/mobile tuning) into the shell store, and
// flip `ready` on mount — the app chunk is up, so the static index.html pre-loader can fade even
// before the first tracked asset event (e.g. everything already cached).
function ShellBridge() {
    const loaderDebugParameters = useStore((state) => state.loaderDebugParameters)
    const mobileUiParameters = useStore((state) => state.mobileUiParameters)
    useEffect(() => {
        useLoaderShell.setState({ ready: true, loaderDebugParameters, mobileUiParameters })
    }, [loaderDebugParameters, mobileUiParameters])
    return null
}

// The Leva debug panel only shows when the URL hash is #debug (e.g. ...?/#debug). On the plain page
// it's hidden. The controls still register + drive the scene; only the panel UI is hidden.
const isDebug = typeof window !== 'undefined' && window.location.hash === '#debug'

export default function App() {
    return (
        <>
            <ShellBridge />
            <KeyboardControls
                map={[
                    { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
                    { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
                    { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
                    { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
                    { name: 'jump', keys: ['Space'] },
                    { name: 'run', keys: ['Shift'] },
                    { name: 'reset', keys: ['Enter'] },
                    { name: 'interact', keys: ['KeyE'] },
                ]}
            >
                <Canvas
                    dpr={[1, 1.25]}
                    gl={{ antialias: false }}
                    camera={{
                        fov: 45,
                        near: 0.1,
                        far: 200,
                        position: [0, 10, 12],
                    }}
                >
                    <Experience />
                </Canvas>
                <Leva hidden={!isDebug} collapsed theme={{ sizes: { rootWidth: '400px', controlWidth: '150px' } }} />
                <ControlsIcons />
                <Joystick />
                <InteractionPrompt />
                <SongGame />
                <Tutorial />
            </KeyboardControls>
            <GameDirector />
            <IntroTitle />
            <LoaderDebugOverlay />
            <Dialogue />
            <FinaleDialogue />
            <Credits />
            <Links />
        </>
    )
}
