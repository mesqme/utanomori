import { lazy, Suspense } from 'react'
import { DefaultLoadingManager } from 'three'

import Lights from './Lights.jsx'
import MainCharacter from './MainCharacter.jsx'
import LanternGlow from './LanternGlow.jsx'
import Terrain from './Terrain.jsx'
import Controls from './Controls.jsx'
import BackgroundSphere from './BackgroundSphere.jsx'
import Companions from './Companions.jsx'
import MusicStones from './MusicStones.jsx'
import MusicController from './MusicController.jsx'
import AmbientController from './AmbientController.jsx'
import CameraProjection from './CameraProjection.jsx'
import useStore from '../stores/useStore.jsx'
import PainterlyPostProcessing from '../postprocessing/PainterlyPostProcessing.jsx'

// The perf monitor is debug-only (#debug → Debug.General.perfMonitor, default off), so it is
// loaded on first toggle instead of riding in the main bundle for every player.
//
// It must also be kept away from the loading manager: r3f-perf ships its own bundled copy of
// drei's useProgress, whose module body plain-ASSIGNS DefaultLoadingManager.onStart/onProgress/
// onLoad — evaluating it late would clobber the Loader's progress chain (see App.jsx, where that
// exact mechanism once froze the bar). Snapshotting the handlers across the import keeps the
// chain intact no matter when the monitor is switched on.
const Perf = lazy(async () => {
    const saved = {
        onStart: DefaultLoadingManager.onStart,
        onProgress: DefaultLoadingManager.onProgress,
        onLoad: DefaultLoadingManager.onLoad,
        onError: DefaultLoadingManager.onError,
    }
    try {
        const { Perf: PerfMonitor } = await import('r3f-perf')
        return { default: PerfMonitor }
    } catch {
        // A debug overlay that fails to download must never take the scene with it: Suspense
        // catches promises, not rejections, so an uncaught one would unmount the whole Canvas.
        return { default: () => null }
    } finally {
        // finally, so a throw inside r3f-perf's module body can't leave the manager clobbered.
        Object.assign(DefaultLoadingManager, saved)
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

            <Controls />
            <BackgroundSphere />
            <PainterlyPostProcessing />
        </>
    )
}
