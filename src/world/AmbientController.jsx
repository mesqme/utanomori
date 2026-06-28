import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import {
    preloadAmbientSounds,
    startOwlSequence,
    setOwlPeak,
    setOwlConfig,
    setWindGain,
    setCicadaGain,
    playMumble,
    playSad,
    playFootstep,
} from '../game/ambientSounds.js'

// Drives the ambient layer (wind / cicadas / owls), the per-character one-shots (mumble on a
// conversation, sad on a flee), and the hero footsteps. Nothing renders — a frame hook so it
// shares the world clock. Mirrors MusicController's shape.
export default function AmbientController() {
    const startedRef = useRef(false)
    const prevX = useRef(0)
    const prevZ = useRef(0)
    const hadPosRef = useRef(false)
    const stepTimerRef = useRef(0)
    const stepFootRef = useRef(0)
    const prevStageRef = useRef('idle')
    const prevPhaseRef = useRef(PHASES.loading)

    useFrame((_, delta) => {
        const phase = usePhases.getState().phase
        const inWorld = phase === PHASES.intro || phase === PHASES.start || phase === PHASES.credits

        // Start the engine the first time we enter the world (context is running after GO).
        if (inWorld && !startedRef.current) {
            preloadAmbientSounds()
            startOwlSequence()
            startedRef.current = true
        }

        if (!inWorld) {
            // Loading / warmup / restart curtain → silence the looping layers.
            setWindGain(0)
            setCicadaGain(0)
            setOwlPeak(0)
            prevPhaseRef.current = phase
            prevStageRef.current = useSongGame.getState().active ? useSongGame.getState().stage : 'idle'
            hadPosRef.current = false
            return
        }

        const dt = Math.min(delta, 0.05)
        const store = useStore.getState()
        const p = store.ambientSoundParameters
        const game = useSongGame.getState()

        // A "dialogue" moment = the intro speech OR any time we're in a companion conversation /
        // mini-game (active spans prompt → game → fail/flee). Wind ducks down then.
        const dialogue = phase === PHASES.intro || game.active
        const walking = phase === PHASES.start || phase === PHASES.credits

        setWindGain(dialogue ? p.windDialogueVolume : p.windVolume)
        setCicadaGain(p.cicadaVolume)
        setOwlPeak(p.owlVolume)
        setOwlConfig({ minGap: p.owlGapMin, maxGap: p.owlGapMax, fade: p.owlFade })

        // --- Footsteps: cadence while the hero actually moves on the ground (gameplay + credits). ---
        const pos = store.ballPosition
        let speed = 0
        if (hadPosRef.current) {
            const dx = pos.x - prevX.current
            const dz = pos.z - prevZ.current
            speed = Math.hypot(dx, dz) / Math.max(dt, 1e-3)
        }
        prevX.current = pos.x
        prevZ.current = pos.z
        hadPosRef.current = true

        const moving = walking && !game.active && speed > p.footstepSpeedThreshold && speed < 20 // <20 ignores teleports
        if (moving) {
            stepTimerRef.current -= dt
            if (stepTimerRef.current <= 0) {
                playFootstep(p.footstepGrass ? 'grass' : 'plain', stepFootRef.current, p.footstepVolume)
                stepFootRef.current = (stepFootRef.current + 1) % 2
                stepTimerRef.current = Math.max(0.08, p.footstepInterval)
            }
        } else {
            stepTimerRef.current = 0 // next step fires promptly when movement resumes
        }

        // --- One-shots on state transitions. ---
        const stage = game.active ? game.stage : 'idle'
        // Conversation: every time a companion (music character) asks "are you ready?". The intro
        // dialogue is the hero, not a music character — it plays a sigh from Dialogue.jsx instead.
        if (stage === 'prompt' && prevStageRef.current !== 'prompt') playMumble(p.mumbleVolume)
        // Flee: the character's upset reaction before it bolts after a missed song.
        if (stage === 'failSpeech' && prevStageRef.current !== 'failSpeech') playSad(p.sadVolume)

        prevStageRef.current = stage
        prevPhaseRef.current = phase
    })

    return null
}
