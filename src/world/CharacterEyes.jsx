import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

import useStore from '../stores/useStore.jsx'
import { characterHead } from './utils/characterHead.js'

// Drives the cartoon eyes that are drawn directly in the head mesh's fragment shader (in the second
// UV set, uv1 — see character/fragment.glsl, gated by uDrawEyes). Nothing renders here: each frame
// it computes the blink + an occasional left/right glance and pushes the shape/colour params into
// the head material's eye uniforms. (The old 3D-quad overlay was removed — head shader only.)
function applyEyeUniforms(u, p, blink, pupilOffsetX) {
    if (!u || !u.uEyeColor) return
    u.uEyeColor.value.set(p.eyeColor)
    u.uPupilColor.value.set(p.pupilColor)
    u.uEyeRadius.value = p.eyeRadius
    u.uEyeSpacing.value = p.eyeSpacing
    u.uEyeOffsetY.value = p.eyeOffsetY
    u.uEyeAspect.value = p.eyeAspect
    u.uEyeNoiseScale.value = p.eyeNoiseScale
    u.uEyeNoiseStrength.value = p.eyeNoiseStrength
    u.uPupilWidth.value = p.pupilWidth
    u.uPupilHeight.value = p.pupilHeight
    u.uPupilOffsetX.value = pupilOffsetX
    u.uPupilOffsetY.value = p.pupilOffsetY
    u.uPupilNoiseScale.value = p.pupilNoiseScale
    u.uPupilNoiseStrength.value = p.pupilNoiseStrength
    u.uEyeEdgeSoftness.value = p.edgeSoftness
    u.uEyeBlink.value = blink
}

export default function CharacterEyes() {
    const blinkTimerRef = useRef(2)
    const blinkPhaseRef = useRef(-1) // -1 = open; 0..1 = blink in progress
    const lookOffsetRef = useRef(0)
    const lookTargetRef = useRef(0)
    const lookTimerRef = useRef(4)
    const lookingRef = useRef(false)

    useFrame((_, delta) => {
        const dt = Math.min(delta, 0.05)
        const p = useStore.getState().characterEyesParameters
        const u = characterHead.material?.uniforms
        if (!u || !u.uDrawEyes) return

        if (!p.enabled) {
            u.uDrawEyes.value = 0
            return
        }

        // --- Blink (vertical lids close + open) ---
        if (blinkPhaseRef.current < 0) {
            blinkTimerRef.current -= dt
            if (blinkTimerRef.current <= 0) blinkPhaseRef.current = 0
        } else {
            blinkPhaseRef.current += dt / Math.max(0.04, p.blinkDuration)
            if (blinkPhaseRef.current >= 1) {
                blinkPhaseRef.current = -1
                blinkTimerRef.current = p.blinkInterval + Math.random() * p.blinkIntervalRandom
            }
        }
        const blink = blinkPhaseRef.current < 0 ? 0 : Math.sin(blinkPhaseRef.current * Math.PI)

        // --- Occasional left/right glance (rarer than a blink) ---
        if (p.pupilLook) {
            lookTimerRef.current -= dt
            if (lookTimerRef.current <= 0) {
                if (lookingRef.current) {
                    lookTargetRef.current = 0
                    lookingRef.current = false
                    lookTimerRef.current = p.pupilLookInterval + Math.random() * p.pupilLookIntervalRandom
                } else {
                    lookTargetRef.current = (Math.random() < 0.5 ? -1 : 1) * p.pupilLookAmount
                    lookingRef.current = true
                    lookTimerRef.current = p.pupilLookHold
                }
            }
        } else {
            lookTargetRef.current = 0
        }
        lookOffsetRef.current += (lookTargetRef.current - lookOffsetRef.current) * (1 - Math.exp(-p.pupilLookSpeed * dt))

        applyEyeUniforms(u, p, blink, p.pupilOffsetX + lookOffsetRef.current)
        u.uDrawEyes.value = p.debugUv1 ? 2 : 1 // 2 = paint the head by its second UV (placement aid)
    })

    return null
}
