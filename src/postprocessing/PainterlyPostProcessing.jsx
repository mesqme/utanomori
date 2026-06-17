import { useEffect, useMemo } from 'react'
import { Bloom, EffectComposer, SMAA } from '@react-three/postprocessing'

import useStore from '../stores/useStore.jsx'
import SharpenPass from './SharpenPass.js'

// Post chain: scene (no MSAA) → optional bloom → SMAA (final-image AA) → SharpenPass
// (optional sharpen + the film grain, applied last). The painterly abstraction now
// lives in the baked paintery texture, so there's no per-frame Kuwahara pass.
export default function PainterlyPostProcessing() {
    const settings = useStore((state) => state.painterlyPostParameters)
    const sharpenPass = useMemo(() => new SharpenPass(settings), [])

    useEffect(() => {
        sharpenPass.update(settings)
    }, [settings, sharpenPass])

    useEffect(() => () => sharpenPass.dispose(), [sharpenPass])

    if (!settings.enabled) return null

    return (
        <EffectComposer multisampling={0}>
            {settings.bloomEnabled && (
                <Bloom
                    intensity={settings.bloomIntensity}
                    luminanceThreshold={settings.bloomThreshold}
                    luminanceSmoothing={settings.bloomSmoothing}
                    radius={settings.bloomRadius}
                    mipmapBlur
                />
            )}
            <SMAA />
            <primitive object={sharpenPass} dispose={null} />
        </EffectComposer>
    )
}
