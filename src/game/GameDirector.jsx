import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import useStore from '../stores/useStore.jsx'
import { cameraRig } from './cameraRig.js'
import {
    CAMERA_TOP_SHOT,
    CAMERA_FRONT_SHOT,
    CAMERA_FOLLOW_ORBIT,
    INTRO_TRAVEL_EASE,
    GAMEPLAY_ENTRY_DURATION,
} from './gameConfig.js'

const applyShot = (shot) => {
    cameraRig.angle = shot.angle
    cameraRig.distance = shot.distance
    cameraRig.height = shot.height
    cameraRig.targetYOffset = shot.targetYOffset
}

// The intro camera travel: from the top "hat" shot, RISE a touch, then a descending 360°
// SPIRAL down to the dialogue framing (rotation + descent together). Fully driven by the
// tunable store params so it can be replayed live ("redo the animation"). Optionally the
// look-at point also spirals in XZ (out and back, Y unchanged).
function runIntroTravel({ introTweenRef, loaderCameraHeight, params, isReplay }) {
    if (introTweenRef.current) {
        introTweenRef.current.kill()
        introTweenRef.current = null
    }
    cameraRig.mode = 'orbit'
    cameraRig.lerpSpeed = 9
    applyShot({ ...CAMERA_TOP_SHOT, height: loaderCameraHeight })

    const startAngle = cameraRig.angle
    const baseHeight = loaderCameraHeight
    const spiralStart = params.riseDuration
    const timeline = gsap.timeline({
        onComplete: () => {
            introTweenRef.current = null
            // A replay restores whatever the current phase expects, so previewing doesn't leave
            // the camera parked at the dialogue shot.
            if (isReplay) {
                const current = usePhases.getState().phase
                if (current === PHASES.start) {
                    cameraRig.mode = 'follow'
                    cameraRig.lerpSpeed = 5
                } else if (current === PHASES.warmup || current === PHASES.loading) {
                    cameraRig.lerpSpeed = 6
                    applyShot({ ...CAMERA_TOP_SHOT, height: loaderCameraHeight })
                }
            }
        },
    })

    // 1) Rise a touch first (anticipation / "go up").
    timeline.to(
        cameraRig,
        { height: baseHeight + params.riseHeight, duration: params.riseDuration, ease: 'power2.out' },
        0
    )
    // 2) Descending 360° spiral — angle sweeps a whole turn while the height drops to the
    //    dialogue shot (rotation + descent together).
    timeline.to(
        cameraRig,
        {
            angle: startAngle + Math.PI * 2,
            height: CAMERA_FRONT_SHOT.height,
            targetYOffset: CAMERA_FRONT_SHOT.targetYOffset,
            duration: params.spiralDuration,
            ease: INTRO_TRAVEL_EASE,
        },
        spiralStart
    )
    // Radius swells outward, then pulls into the character.
    timeline.to(
        cameraRig,
        { distance: params.orbitDistance, duration: params.spiralDuration * 0.5, ease: 'power1.out' },
        spiralStart
    )
    timeline.to(
        cameraRig,
        { distance: CAMERA_FRONT_SHOT.distance, duration: params.spiralDuration * 0.5, ease: 'power2.inOut' },
        spiralStart + params.spiralDuration * 0.5
    )

    introTweenRef.current = timeline
}

// Orchestrates the game cycle: drives the camera shot per phase, runs the intro travel, and
// rolls credits once the party is complete. Pure logic (no rendering) — it writes the shared
// cameraRig and the phase store.
export default function GameDirector() {
    const phase = usePhases((state) => state.phase)
    const debugMode = usePhases((state) => state.debugMode)
    const creditsShown = usePhases((state) => state.creditsShown)
    const found = useCompanions((state) => state.found)
    const loaderCameraHeight = useStore((state) => state.loaderDebugParameters.cameraHeight)
    const introReplayNonce = useStore((state) => state.introReplayNonce)
    const setPhase = usePhases((state) => state.setPhase)
    const setCreditsShown = usePhases((state) => state.setCreditsShown)
    const introTweenRef = useRef(null)
    const prevPhaseRef = useRef(PHASES.loading)

    // Camera choreography per phase.
    useEffect(() => {
        if (introTweenRef.current) {
            introTweenRef.current.kill()
            introTweenRef.current = null
        }

        if (phase === PHASES.loading || phase === PHASES.warmup) {
            cameraRig.mode = 'orbit'
            cameraRig.lerpSpeed = phase === PHASES.warmup ? 6 : 30
            applyShot({ ...CAMERA_TOP_SHOT, height: loaderCameraHeight })
        } else if (phase === PHASES.intro) {
            runIntroTravel({
                introTweenRef,
                loaderCameraHeight,
                params: useStore.getState().introCameraParameters,
                isReplay: false,
            })
        } else if (phase === PHASES.start) {
            cameraRig.targetOffsetX = 0
            cameraRig.targetOffsetZ = 0
            if (prevPhaseRef.current === PHASES.intro) {
                // Dialogue shot already shares the gameplay camera's side, so this is a calm
                // rise/pull-back up to the over-the-shoulder view — no orbit around the hero.
                cameraRig.mode = 'orbit'
                cameraRig.lerpSpeed = 14
                introTweenRef.current = gsap.to(cameraRig, {
                    angle: CAMERA_FOLLOW_ORBIT.angle,
                    distance: CAMERA_FOLLOW_ORBIT.distance,
                    height: CAMERA_FOLLOW_ORBIT.height,
                    targetYOffset: CAMERA_FOLLOW_ORBIT.targetYOffset,
                    duration: GAMEPLAY_ENTRY_DURATION,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        cameraRig.mode = 'follow'
                        cameraRig.lerpSpeed = 5
                        introTweenRef.current = null
                    },
                })
            } else {
                cameraRig.mode = 'follow'
                cameraRig.lerpSpeed = 5
            }
        } else if (phase === PHASES.credits) {
            cameraRig.mode = 'follow'
            cameraRig.lerpSpeed = 2.5
        }

        prevPhaseRef.current = phase

        return () => {
            if (introTweenRef.current) {
                introTweenRef.current.kill()
                introTweenRef.current = null
            }
        }
    }, [phase, loaderCameraHeight])

    // "Redo the animation" (Leva) → replay the intro travel live from the current state.
    useEffect(() => {
        if (introReplayNonce === 0) return
        runIntroTravel({
            introTweenRef,
            loaderCameraHeight: useStore.getState().loaderDebugParameters.cameraHeight,
            params: useStore.getState().introCameraParameters,
            isReplay: true,
        })
    }, [introReplayNonce])

    // Toggling debug mode mid-run jumps to the right place (once assets are loaded).
    useEffect(() => {
        if (usePhases.getState().phase === PHASES.loading) return
        setPhase(debugMode ? PHASES.start : PHASES.warmup)
    }, [debugMode, setPhase])

    // Reset the credits guard when a fresh loop begins.
    useEffect(() => {
        if (phase === PHASES.warmup) setCreditsShown(false)
    }, [phase, setCreditsShown])

    // Party complete during gameplay → roll the credits once (not after "Continue").
    useEffect(() => {
        if (!debugMode && phase === PHASES.start && found.length >= MAX_PARTY && !creditsShown) {
            setCreditsShown(true)
            setPhase(PHASES.credits)
        }
    }, [debugMode, phase, found.length, creditsShown, setPhase, setCreditsShown])

    return null
}
