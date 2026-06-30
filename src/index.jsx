import './style.css'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import Experience from './world/Experience.jsx'
import { KeyboardControls } from '@react-three/drei'
import { Leva } from 'leva'
import Loader from './loader/Loader.jsx'
import Links from './ui/Links.jsx'
import ControlsIcons from './ui/ControlsIcons.jsx'
import InteractionPrompt from './ui/InteractionPrompt.jsx'
import UIPreview from './ui/UIPreview.jsx'
import LoaderDebugOverlay from './ui/LoaderDebugOverlay.jsx'
import GameDirector from './game/GameDirector.jsx'
import Dialogue from './game/Dialogue.jsx'
import SongGame from './game/SongGame.jsx'
import Credits from './game/Credits.jsx'
import { applySoundJourneyCssVariables } from './config/soundJourneyPalette.js'

applySoundJourneyCssVariables()

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
            <Leva collapsed theme={{ sizes: { rootWidth: '400px', controlWidth: '150px' } }} />
            <ControlsIcons />
            <InteractionPrompt />
            <SongGame />
            <UIPreview />
        </KeyboardControls>
        <GameDirector />
        <Loader />
        <LoaderDebugOverlay />
        <Dialogue />
        <Credits />
        <Links />
    </>
)
