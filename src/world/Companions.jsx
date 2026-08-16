import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import SheepCreature from './SheepCreature.jsx'
import CompanionNotes from './CompanionNotes.jsx'
import CharacterFeedback from './CharacterFeedback.jsx'
import TargetArrow from './TargetArrow.jsx'
import { sampleTrail } from './state/companionTrail.js'
import { getRevealRadius } from './state/revealCircle.js'
import { setTrampler, clearTrampler, TRAMPLE_SLOT_TARGET, TRAMPLE_SLOT_FOLLOWER } from './state/trampleField.js'
import { setGroundShadow, clearGroundShadow } from './state/groundShadowField.js'
import { resumeAudio } from '../audio/songAudio.js'
import { playMumble } from '../audio/ambientSounds.js'
import useTutorial from '../stores/useTutorial.jsx'

const INTERACT_RADIUS = 2.3
const ABANDON_RADIUS = 30
const FOLLOW_DAMP = 10
const FOLLOW_MAX_SPEED = 7.5 // cap on a follower's catch-up speed (u/s) — a freshly-collected sheep
// RUNS to its slot instead of snapping across the scene. Kept above the hero's RUN_SPEED (5.5) so
// followers never lag during normal running; only the big just-joined gap is throttled.
const HEADING_DAMP = 9
const CELEBRATE_DURATION = 2.5 // happy hop before joining the party
const FLEE_DURATION = 1.4 // running away before relocating after a failed song
const FLEE_SPEED = 9
const MOVE_THRESHOLD = 0.5 // follower speed (u/s) above which the sheep plays its run animation
const RESTART_FLEE_SPEED = 6.5 // companions scatter off-terrain during the cinematic restart (gentle)

function dampAngle(current, target, lambda, delta) {
    const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current))
    return current + difference * (1 - Math.exp(-lambda * delta))
}

// Spawn the friend beyond the visible (non-faded) circle, so the next one is never
// sitting next to the one you just collected — you follow the arrow out to find it.
function findHiddenSpawn(player) {
    const revealRadius = getRevealRadius()
    // HAZARD if the reveal circle is ever widened. Nothing here keeps the spawn inside
    // ABANDON_RADIUS, and the abandon branch below relocates anything past that ring — every
    // frame, at 60 Hz, each one allocating a new target object and re-rendering the whole spirit
    // subtree. It reads as a frame-rate drop with no obvious cause.
    //
    // Correct today, but only just: the shipped radiusFactor 1 gives a max of 28.35 against a ring
    // of 30, so it clears by 1.65 units. Above ~1.06 it starts intermittently; above ~1.65 it is
    // permanent. If you widen the circle, wrap both distances below in
    // Math.min(ABANDON_RADIUS - 1, ...) — at radiusFactor 1 that comes out identical.
    // 50% farther than the original 10 / ×1.35 / ×2.1 — a longer walk to each music character.
    const minDistance = Math.max(15, revealRadius * 2.025)
    const maxDistance = Math.max(minDistance + 7.5, revealRadius * 3.15)
    const angle = Math.random() * Math.PI * 2
    const distance = minDistance + Math.random() * (maxDistance - minDistance)
    return { x: player.x + Math.cos(angle) * distance, z: player.z + Math.sin(angle) * distance }
}

// Companion ground shadow strength — the dark blob is drawn in the terrain shader (see
// groundShadowField), not a decal mesh.
const GROUND_SHADOW_STRENGTH = 0.3

function TargetCreature({ target }) {
    const groupRef = useRef(null)
    const creatureRef = useRef(null)
    const fleeRef = useRef(0)
    const fleeTargetRef = useRef(null) // the new spawn it runs toward when it flees
    const placedRef = useRef(0) // hidden until positioned + the reveal-fade settles (no spawn-snap flash)
    const stage = useSongGame((state) => state.stage)

    useEffect(
        () => () => {
            clearTrampler(TRAMPLE_SLOT_TARGET)
            clearGroundShadow(TRAMPLE_SLOT_TARGET)
        },
        []
    )

    // Won the song → a happy hop, then join the party. Its backing track keeps playing softly
    // behind the hero (handled by the MusicController) once collected.
    useEffect(() => {
        if (stage !== 'success') return
        // The freed spirit gives a happy mumble the moment the song is won.
        playMumble(useStore.getState().ambientSoundParameters?.mumbleVolume ?? 0.9)
        const timer = setTimeout(() => {
            useCompanions.getState().collectTarget()
            useSongGame.getState().reset()
        }, CELEBRATE_DURATION * 1000)
        return () => clearTimeout(timer)
    }, [stage, target])

    // Failed the song → it stands its ground through the ❗ moment + its grumpy speech, and only
    // bolts once you click OK (stage 'flee'). We pick its new hidden spawn UP FRONT so it can turn
    // and run toward where it'll reappear (fading out via the reveal circle), then relocate there.
    useEffect(() => {
        if (stage !== 'flee') {
            fleeTargetRef.current = null
            return undefined
        }
        const player = useStore.getState().heroPosition
        const spawn = findHiddenSpawn(player)
        fleeTargetRef.current = spawn
        const timer = setTimeout(() => {
            useCompanions.getState().relocateTarget(spawn.x, spawn.z)
            useSongGame.getState().reset()
        }, FLEE_DURATION * 1000)
        return () => clearTimeout(timer)
    }, [stage])

    useFrame((state, delta) => {
        /**
         * Frame setup
         */
        const group = groupRef.current
        if (!group) return
        const player = useStore.getState().heroPosition

        /**
         * Flee run or stand ground
         */
        if (stage === 'flee') {
            // Turn toward the new spawn and run there (it fades out at the reveal edge en route).
            const dt = Math.min(delta, 0.1)
            fleeRef.current += dt
            const spawn = fleeTargetRef.current
            let dirX = spawn ? spawn.x - target.x : target.x - player.x
            let dirZ = spawn ? spawn.z - target.z : target.z - player.z
            const len = Math.hypot(dirX, dirZ) || 1
            dirX /= len
            dirZ /= len
            const dist = fleeRef.current * FLEE_SPEED
            const fx = target.x + dirX * dist
            const fz = target.z + dirZ * dist
            group.position.set(fx, 0, fz)
            group.rotation.y = dampAngle(group.rotation.y, Math.atan2(dirX, dirZ), HEADING_DAMP, dt)
        } else {
            // Stay put facing the player (gameplay, prompt, the game, and the fail ❗ / speech).
            fleeRef.current = 0
            group.position.set(target.x, 0, target.z)
            group.rotation.y = Math.atan2(player.x - target.x, player.z - target.z)
            setTrampler(TRAMPLE_SLOT_TARGET, target.x, 0, target.z)
        }

        /**
         * Hop and idle bob
         */
        if (creatureRef.current) {
            const t = state.clock.elapsedTime
            creatureRef.current.position.y = stage === 'success' ? Math.abs(Math.sin(t * 9)) * 0.5 : Math.abs(Math.sin(t * 2.5)) * 0.12
        }

        /**
         * Ground shadow
         */
        setGroundShadow(TRAMPLE_SLOT_TARGET, group.position.x, group.position.z, (target.scale ?? 0.5) * 0.62, GROUND_SHADOW_STRENGTH)

        /**
         * Reveal gate
         */
        // Stay hidden until it's been positioned AND the SheepCreature's reveal-fade has been
        // computed from that real position (one frame behind, since the child runs first) — avoids
        // the one-frame flash of the companion snapping to its spawn when gameplay starts.
        if (placedRef.current < 2) {
            placedRef.current += 1
            group.visible = placedRef.current >= 2
        }
    })

    return (
        <group ref={groupRef}>
            <group ref={creatureRef}>
                <SheepCreature definition={target} moving={stage === 'flee'} />
            </group>
            <CompanionNotes headY={(target.scale ?? 0.5) + 0.6} isTarget music={target.music} />
            <CharacterFeedback headY={(target.scale ?? 0.5) + 1.1} />
        </group>
    )
}

function Follower({ definition, index }) {
    const groupRef = useRef(null)
    const creatureRef = useRef(null)
    const positionRef = useRef(new THREE.Vector3())
    const previousRef = useRef(new THREE.Vector3())
    const headingRef = useRef(0)
    const initializedRef = useRef(false)
    const sample = useMemo(() => ({}), [])
    const slot = TRAMPLE_SLOT_FOLLOWER + index
    const fleeStateRef = useRef(null)
    const placedRef = useRef(0) // hidden until positioned + the reveal-fade settles (no spawn-snap flash)
    const [moving, setMoving] = useState(false)

    useEffect(
        () => () => {
            clearTrampler(slot)
            clearGroundShadow(slot)
        },
        [slot]
    )

    useFrame((state, delta) => {
        /**
         * Frame setup
         */
        const group = groupRef.current
        if (!group) return

        const safeDelta = Math.min(delta, 0.1)

        /**
         * Restart scatter
         */
        // Cinematic restart: scatter outward (each in its own fanned direction) off the terrain.
        // Keep fleeing through the brief 'resettling' curtain so they don't snap back to the trail.
        const phaseNow = usePhases.getState().phase
        if (phaseNow === PHASES.restarting || phaseNow === PHASES.resettling) {
            group.visible = true
            let flee = fleeStateRef.current
            if (!flee) {
                const start = positionRef.current
                const hero = useStore.getState().heroPosition
                let dx = start.x - hero.x
                let dz = start.z - hero.z
                let len = Math.hypot(dx, dz)
                if (len < 0.001) {
                    dx = 0
                    dz = -1
                    len = 1
                }
                const angle = Math.atan2(dx / len, dz / len) + (index - (MAX_PARTY - 1) / 2) * 0.9
                flee = { x: start.x, z: start.z, dx: Math.sin(angle), dz: Math.cos(angle), t: 0 }
                fleeStateRef.current = flee
            }
            flee.t += safeDelta
            const dist = flee.t * RESTART_FLEE_SPEED
            const fx = flee.x + flee.dx * dist
            const fz = flee.z + flee.dz * dist
            group.position.set(fx, 0, fz)
            group.rotation.y = Math.atan2(flee.dx, flee.dz)
            if (creatureRef.current) creatureRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 9 + index)) * 0.18
            setMoving((current) => (current ? current : true))
            return
        }
        fleeStateRef.current = null

        /**
         * Follow line sample
         */
        // Follow line: the first companion trails the hero by `followLead`, each next one by an
        // extra `followGap` (both tunable in the Sheep Leva folder).
        const follow = useStore.getState().sheepParameters
        const result = sampleTrail(follow.followLead + index * follow.followGap, sample)
        if (!result) {
            group.visible = false
            setMoving((current) => (current ? false : current))
            return
        }
        group.visible = true

        /**
         * Trail chase and speed cap
         */
        const position = positionRef.current
        if (!initializedRef.current) {
            position.set(definition.x, 0, definition.z)
            previousRef.current.copy(position)
            initializedRef.current = true
        }

        const blend = 1 - Math.exp(-FOLLOW_DAMP * safeDelta)
        let stepX = (result.x - position.x) * blend
        let stepY = (result.y - position.y) * blend
        let stepZ = (result.z - position.z) * blend
        // Cap the horizontal catch-up speed so a freshly-collected sheep RUNS to its slot (its run
        // animation kicks in once speed passes MOVE_THRESHOLD) instead of snapping across the scene /
        // teleporting through props. Normal trailing never reaches the cap (gap stays tiny).
        const maxStep = FOLLOW_MAX_SPEED * safeDelta
        const stepLen = Math.hypot(stepX, stepZ)
        if (stepLen > maxStep) {
            const k = maxStep / stepLen
            stepX *= k
            stepY *= k
            stepZ *= k
        }
        position.x += stepX
        position.y += stepY
        position.z += stepZ

        /**
         * Speed and run animation
         */
        const speed = position.distanceTo(previousRef.current) / safeDelta
        previousRef.current.copy(position)
        const movingNow = speed > MOVE_THRESHOLD
        setMoving((current) => (current === movingNow ? current : movingNow))

        /**
         * Placement, bob and heading
         */
        // Group sits on the ground; jump arc + bob live on the inner creature so the
        // shadow stays planted and the trampler reports the ground position.
        group.position.set(position.x, 0, position.z)

        if (creatureRef.current) {
            const jump = Math.max(0, position.y)
            const bob = Math.sin(state.clock.elapsedTime * 10 + index) * Math.min(0.12, speed * 0.03)
            creatureRef.current.position.y = jump + bob
        }

        if (result.headingX !== 0 || result.headingZ !== 0) {
            const targetHeading = Math.atan2(result.headingX, result.headingZ)
            headingRef.current = dampAngle(headingRef.current, targetHeading, HEADING_DAMP, safeDelta)
        }
        group.rotation.y = headingRef.current

        /**
         * Trample and ground shadow
         */
        setTrampler(slot, position.x, 0, position.z)
        setGroundShadow(slot, position.x, position.z, (definition.scale ?? 0.5) * 0.62, GROUND_SHADOW_STRENGTH)

        /**
         * Reveal gate
         */
        // Hidden until positioned + the reveal-fade settles — avoids the one-frame snap-to-trail flash.
        if (placedRef.current < 2) {
            placedRef.current += 1
            group.visible = placedRef.current >= 2
        }
    })

    return (
        <group ref={groupRef}>
            <group ref={creatureRef}>
                <SheepCreature definition={definition} moving={moving} />
            </group>
            <CompanionNotes headY={(definition.scale ?? 0.5) + 0.6} music={definition.music} />
        </group>
    )
}

export default function Companions() {
    const phase = usePhases((state) => state.phase)
    const target = useCompanions((state) => state.target)
    const found = useCompanions((state) => state.found)
    const [subscribeKeys] = useKeyboardControls()

    // Reset the party only on a fresh loop (warmup/loading) — keep it through the
    // intro and credits so the followers can trail the auto-running hero.
    useEffect(() => {
        if (phase === PHASES.warmup || phase === PHASES.loading) useCompanions.getState().reset()
    }, [phase])

    useEffect(() => {
        const unsubscribeInteract = subscribeKeys(
            (state) => state.interact,
            (pressed) => {
                if (!pressed) return
                if (usePhases.getState().phase !== PHASES.start) return
                if (useSongGame.getState().active) return
                const { target: current, targetInRange } = useCompanions.getState()
                if (current && targetInRange) {
                    resumeAudio()
                    useSongGame.getState().begin(current)
                }
            }
        )
        const unsubscribeReset = subscribeKeys(
            (state) => state.reset,
            (pressed) => {
                if (pressed && usePhases.getState().phase === PHASES.start) useCompanions.getState().reset()
            }
        )
        return () => {
            unsubscribeInteract()
            unsubscribeReset()
        }
    }, [subscribeKeys])

    useFrame(() => {
        /**
         * Phase gate
         */
        const store = useStore.getState()

        // Pre-place the FIRST music character during warmup/intro so its sheep warms up (skeleton
        // clone + shader compile + texture upload) BEFORE gameplay — it spawns ≥15u away and stays
        // faded by the tiny reveal, so there's no spawn hitch/blink the instant gameplay starts.
        // Range / abandon stay gameplay-only.
        const phaseNow = usePhases.getState().phase
        const inStart = phaseNow === PHASES.start
        if (!inStart && phaseNow !== PHASES.warmup && phaseNow !== PHASES.intro) return

        /**
         * Song game guard
         */
        const companions = useCompanions.getState()
        const gameActive = useSongGame.getState().active

        // While the song game runs, the target is pinned — skip spawn/abandon/range.
        if (gameActive) return

        const player = store.heroPosition

        /**
         * Target spawn
         */
        if (!companions.target) {
            if (companions.found.length < MAX_PARTY) {
                const spawn = findHiddenSpawn(player)
                companions.spawnTarget(spawn.x, spawn.z)
            }
            return
        }

        /**
         * Gameplay gate and distance
         */
        // The pre-placed target just sits there faded — abandon / in-range checks are gameplay-only.
        if (!inStart) return

        const distance = Math.hypot(player.x - companions.target.x, player.z - companions.target.z)

        /**
         * Tutorial tip
         */
        // Tutorial: the first time a spirit crosses into the visible circle (fully opaque), explain
        // the mini-game. showSpirit() self-guards, so it fires only once and only when idle.
        if (useStore.getState().gameUiParameters.tutorialEnabled && distance <= getRevealRadius()) {
            useTutorial.getState().showSpirit()
        }

        /**
         * Abandon and relocate
         */
        if (distance > ABANDON_RADIUS) {
            const spawn = findHiddenSpawn(player)
            companions.relocateTarget(spawn.x, spawn.z)
            return
        }

        /**
         * Interact range
         */
        const interactRadius = useStore.getState().songGameParameters?.interactRadius ?? INTERACT_RADIUS
        companions.setTargetInRange(distance <= interactRadius)
    })

    return (
        <>
            {target && <TargetCreature key={target.key} target={target} />}
            {found.map((member, index) => (
                <Follower key={member.key} definition={member} index={index} />
            ))}
            <TargetArrow />
        </>
    )
}
