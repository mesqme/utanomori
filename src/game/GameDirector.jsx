import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import { cameraRig } from './cameraRig.js'
import {
    CAMERA_TOP_SHOT,
    CAMERA_FRONT_SHOT,
    CAMERA_FOLLOW_ORBIT,
    INTRO_TRAVEL_DURATION,
    GAMEPLAY_ENTRY_DURATION,
} from './gameConfig.js'

const applyShot = (shot) => {
    cameraRig.angle = shot.angle
    cameraRig.distance = shot.distance
    cameraRig.height = shot.height
    cameraRig.targetYOffset = shot.targetYOffset
}

// Orchestrates the game cycle: drives the camera shot per phase, arcs the intro
// camera top → front, and rolls credits once the party is complete. Pure logic
// (no rendering) — it writes the shared cameraRig and the phase store.
export default function GameDirector() {
    const phase = usePhases((state) => state.phase)
    const debugMode = usePhases((state) => state.debugMode)
    const creditsShown = usePhases((state) => state.creditsShown)
    const found = useCompanions((state) => state.found)
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
            applyShot(CAMERA_TOP_SHOT)
        } else if (phase === PHASES.intro) {
            cameraRig.mode = 'orbit'
            cameraRig.lerpSpeed = 9
            applyShot(CAMERA_TOP_SHOT)
            introTweenRef.current = gsap.to(cameraRig, {
                angle: CAMERA_FRONT_SHOT.angle,
                distance: CAMERA_FRONT_SHOT.distance,
                height: CAMERA_FRONT_SHOT.height,
                targetYOffset: CAMERA_FRONT_SHOT.targetYOffset,
                duration: INTRO_TRAVEL_DURATION,
                ease: 'power2.inOut',
                onComplete: () => {
                    introTweenRef.current = null
                },
            })
        } else if (phase === PHASES.start) {
            if (prevPhaseRef.current === PHASES.intro) {
                // Smooth circular fly-around from the front-facing dialogue shot to the
                // over-the-shoulder gameplay view (rather than lerping through the hero).
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
    }, [phase])

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
