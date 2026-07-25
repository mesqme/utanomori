import { lazy, Suspense } from 'react'
import { DefaultLoadingManager } from 'three'

import Lights from './world/Lights.jsx'
import MainCharacter from './world/MainCharacter.jsx'
import LanternGlow from './world/LanternGlow.jsx'
import Terrain from './world/Terrain.jsx'
import DebugPanel from './debug/DebugPanel.jsx'
import BackgroundSphere from './world/BackgroundSphere.jsx'
import Companions from './world/Companions.jsx'
import MusicStones from './world/MusicStones.jsx'
import MusicController from './world/MusicController.jsx'
import AmbientController from './world/AmbientController.jsx'
import CameraProjection from './world/CameraProjection.jsx'
import useStore from './stores/useStore.jsx'
import PainterlyPostProcessing from './postprocessing/PainterlyPostProcessing.jsx'
import { preserveManagerHandlers } from './loader/loadingManagerChain.js'

// The perf monitor is debug-only (#debug → Debug.General.perfMonitor, default off), so it is
// loaded on first toggle instead of riding in the main bundle for every player.
//
// It must also be kept away from the loading manager: r3f-perf carries its own bundled copy of
// drei's useProgress, whose module body assigns the manager's handler slots — evaluating it late
// would cut the Loader's progress chain out of the singleton (loadingManagerChain.js explains the
// mechanism). Snapshotting across the import keeps the chain intact whenever it is switched on.
const Perf = lazy(async () => {
    const restoreManagerHandlers = preserveManagerHandlers(DefaultLoadingManager)
    try {
        const { Perf: PerfMonitor } = await import('r3f-perf')
        return { default: PerfMonitor }
    } catch {
        // A debug overlay that fails to download must never take the scene with it: Suspense
        // catches promises, not rejections, so an uncaught one would unmount the whole Canvas.
        return { default: () => null }
    } finally {
        // finally, so a throw inside r3f-perf's module body can't leave the chain severed.
        restoreManagerHandlers()
    }
})

export default function Experience() {
    const perfVisible = useStore((state) => state.perfVisible)
    const backgroundColor = useStore((state) => state.backgroundParameters.backgroundColor)

    return (
        <>
            <color args={[backgroundColor]} attach="background" />

            {perfVisible && (
                <Suspense fallback={null}>
                    <Perf position="top-left" />
                </Suspense>
            )}

            <CameraProjection />
            <Lights />
            <Terrain />
            <MainCharacter />
            <LanternGlow />
            <Companions />
            <MusicStones />
            <MusicController />
            <AmbientController />

            <DebugPanel />
            <BackgroundSphere />
            <PainterlyPostProcessing />
        </>
    )
}
