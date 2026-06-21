import { Perf } from 'r3f-perf'

import Lights from './Lights.jsx'
import MainCharacter from './MainCharacter.jsx'
import Terrain from './Terrain.jsx'
import Controls from './Controls.jsx'
import BackgroundSphere from './BackgroundSphere.jsx'
import Companions from './Companions.jsx'
import MusicStones from './MusicStones.jsx'
import CameraProjection from './CameraProjection.jsx'
import useStore from '../stores/useStore.jsx'
import PainterlyPostProcessing from '../postprocessing/PainterlyPostProcessing.jsx'

export default function Experience() {
    const perfVisible = useStore((state) => state.perfVisible)
    const backgroundColor = useStore((state) => state.backgroundParameters.backgroundColor)

    return (
        <>
            <color args={[backgroundColor]} attach="background" />

            {perfVisible && <Perf position="top-left" />}

            <CameraProjection />
            <Lights />
            <Terrain />
            <MainCharacter />
            <Companions />
            <MusicStones />

            <Controls />
            <BackgroundSphere />
            <PainterlyPostProcessing />
        </>
    )
}
