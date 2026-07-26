import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { EffectComposer, SMAA } from '@react-three/postprocessing'

import useStore from '../stores/useStore.jsx'
import usePhases from '../stores/usePhases.jsx'
import { updateNoiseReveal } from '../game/visualReveal.js'
import { themeMask } from '../world/state/themeMask.js'
import SharpenPass from './SharpenPass.js'

// Post chain: scene (no MSAA) → SMAA (final-image AA) → SharpenPass
// (display color grade + the film grain, applied last). The painterly abstraction
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

    useFrame((frameState, delta) => {
        const phase = usePhases.getState().phase
        textureReveal.current = updateNoiseReveal(textureReveal.current, phase, delta)
        const reveal = textureReveal.current

        // Masked theme transition: the outgoing grade + the screen-space mask, so the grade sweeps
        // with the portal/wipe edge instead of snapping across the whole screen at the click.
        const old = themeMask.active ? themeMask.old : null
        sharpenPass.update({
            ...settings,
            ...activeGrade,
            luminanceNoise: (settings.luminanceNoise ?? 0) * reveal,
            chromaNoise: (settings.chromaNoise ?? 0) * reveal,
            oldSaturation: old?.gradeSaturation,
            oldWarmth: old?.gradeWarmth,
            oldBrightness: old?.gradeBrightness,
        })
    })

    if (!settings.enabled) return null

    return (
        <EffectComposer multisampling={0}>
            <SMAA />
            <primitive object={sharpenPass} dispose={null} />
        </EffectComposer>
    )
}
