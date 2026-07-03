import './style.css'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import Experience from './world/Experience.jsx'
import { KeyboardControls } from '@react-three/drei'
import { Leva } from 'leva'
import Loader from './loader/Loader.jsx'
import IntroTitle from './loader/IntroTitle.jsx'
import Links from './ui/Links.jsx'
import ControlsIcons from './ui/ControlsIcons.jsx'
import Joystick from './ui/Joystick.jsx'
import InteractionPrompt from './ui/InteractionPrompt.jsx'
import Tutorial from './ui/Tutorial.jsx'
import UIPreview from './ui/UIPreview.jsx'
import LoaderDebugOverlay from './ui/LoaderDebugOverlay.jsx'
import GameDirector from './game/GameDirector.jsx'
import Dialogue from './game/Dialogue.jsx'
import FinaleDialogue from './game/FinaleDialogue.jsx'
import SongGame from './game/SongGame.jsx'
import Credits from './game/Credits.jsx'
import { applySoundJourneyCssVariables } from './config/soundJourneyPalette.js'
import { preloadCicadas } from './game/ambientSounds.js'

applySoundJourneyCssVariables()

// iOS Safari ignores user-scalable=no — its proprietary gesture events are the reliable way to stop
// pinch-zoom mid-game (double-tap zoom is already killed by touch-action: none in style.css).
// No-ops on browsers that don't fire gesture* events.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (event) => event.preventDefault(), { passive: false })
}

// CRITICAL audio only: the base cicada ambient, kicked off at page load and counted on the loading bar
// (registered with THREE's loading manager) so the scene is never silent at the start. Everything else
// (music, game one-shots, other ambient) loads in the BACKGROUND once the bar completes — see Loader —
// so it doesn't hold up GO, but starts early enough to be ready before it's needed.
preloadCicadas()

// The Leva debug panel only shows when the URL hash is #debug (e.g. ...?/#debug). On the plain page
// it's hidden. The controls still register + drive the scene; only the panel UI is hidden.
const isDebug = typeof window !== 'undefined' && window.location.hash === '#debug'

const root = ReactDOM.createRoot(document.querySelector('#root'))

root.render(
    <>
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
            <UIPreview />
        </KeyboardControls>
        <GameDirector />
        <Loader />
        <IntroTitle />
        <LoaderDebugOverlay />
        <Dialogue />
        <FinaleDialogue />
        <Credits />
        <Links />
    </>
)
