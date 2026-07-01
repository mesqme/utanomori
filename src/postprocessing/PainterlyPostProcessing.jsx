import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Bloom, EffectComposer, SMAA } from '@react-three/postprocessing'

import useStore from '../stores/useStore.jsx'
import usePhases from '../stores/usePhases.jsx'
import { updateNoiseReveal } from '../game/visualReveal.js'
import SharpenPass from './SharpenPass.js'

// Post chain: scene (no MSAA) → optional bloom → SMAA (final-image AA) → SharpenPass
// (optional sharpen + the film grain, applied last). The painterly abstraction now
// lives in the baked paintery texture, so there's no per-frame Kuwahara pass.
export default function PainterlyPostProcessing() {
    const settings = useStore((state) => state.painterlyPostParameters)
    const grade = useStore((state) => state.colorGradeParameters)
    const sharpenPass = useMemo(() => new SharpenPass(settings), [])
    const textureReveal = useRef(0)

    // The active display grade = the selected preset (low = eye-safety look, high = normal display).
    const activeGrade = useMemo(() => {
        const hi = grade.highBrightnessMode
        return {
            saturation: hi ? grade.highSaturation : grade.lowSaturation,
            warmth: hi ? grade.highWarmth : grade.lowWarmth,
            brightness: hi ? grade.highBrightness : grade.lowBrightness,
        }
    }, [grade])

    useEffect(() => {
        sharpenPass.update({ ...settings, ...activeGrade })
    }, [settings, activeGrade, sharpenPass])

    useEffect(() => () => sharpenPass.dispose(), [sharpenPass])

    useFrame((_, delta) => {
        const phase = usePhases.getState().phase
        textureReveal.current = updateNoiseReveal(textureReveal.current, phase, delta)
        const reveal = textureReveal.current

        sharpenPass.update({
            ...settings,
            ...activeGrade,
            luminanceNoise: (settings.luminanceNoise ?? 0) * reveal,
            chromaNoise: (settings.chromaNoise ?? 0) * reveal,
        })
    })

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
