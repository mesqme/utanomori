import { Perf } from 'r3f-perf'

import Lights from './Lights.jsx'
import MainCharacter from './MainCharacter.jsx'
import Terrain from './Terrain.jsx'
import Controls from './Controls.jsx'
import BackgroundSphere from './BackgroundSphere.jsx'
import useStore from '../stores/useStore.jsx'
import PainterlyPostProcessing from '../postprocessing/PainterlyPostProcessing.jsx'

export default function Experience() {
    const perfVisible = useStore((state) => state.perfVisible)
    const backgroundColor = useStore((state) => state.terrainParameters.backgroundColor)

    return (
        <>
            <color args={[backgroundColor]} attach="background" />

            {perfVisible && <Perf position="top-left" />}

            <Lights />
            <Terrain />
            <MainCharacter />

            <Controls />
            <BackgroundSphere color={backgroundColor} />
            <PainterlyPostProcessing />
        </>
    )
}
