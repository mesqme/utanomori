import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import SheepCreature from './SheepCreature.jsx'
import CompanionNotes from './CompanionNotes.jsx'
import CharacterFeedback from './CharacterFeedback.jsx'
import TargetArrow from './TargetArrow.jsx'
import { sampleTrail } from './utils/companionTrail.js'
import { getGroundY } from './utils/groundHeight.js'
import { getRevealRadius, revealCircle } from './utils/revealCircle.js'
import { getRefScale } from './utils/screenScale.js'
import { setTrampler, clearTrampler, TRAMPLE_SLOT_TARGET, TRAMPLE_SLOT_FOLLOWER } from './utils/trampleField.js'
import { setGroundShadow, clearGroundShadow } from './utils/groundShadowField.js'
import { createCompanionEyeMaterial, updateCompanionEyeMaterial } from '../materials/CompanionEyeMaterial.js'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'
import { resumeAudio } from '../game/songAudio.js'
import paintaryAlpha01Url from '../assets/textures/paintaryAlpha_01.png'

const INTERACT_RADIUS = 2.3
const ABANDON_RADIUS = 30
const FOLLOW_DAMP = 10
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
    // 50% farther than the original 10 / ×1.35 / ×2.1 — a longer walk to each music character.
    const minDistance = Math.max(15, revealRadius * 2.025)
    const maxDistance = Math.max(minDistance + 7.5, revealRadius * 3.15)
    const angle = Math.random() * Math.PI * 2
    const distance = minDistance + Math.random() * (maxDistance - minDistance)
    return { x: player.x + Math.cos(angle) * distance, z: player.z + Math.sin(angle) * distance }
}

// Companion ground shadow strength (the dark blob is drawn in the terrain shader now, see
// groundShadowField — opacity that the old transparent decal used).
const GROUND_SHADOW_STRENGTH = 0.3

function TargetCreature({ target, creatureMaterial }) {
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
        const player = useStore.getState().ballPosition
        const spawn = findHiddenSpawn(player)
        fleeTargetRef.current = spawn
        const timer = setTimeout(() => {
            useCompanions.getState().relocateTarget(spawn.x, spawn.z)
            useSongGame.getState().reset()
        }, FLEE_DURATION * 1000)
        return () => clearTimeout(timer)
    }, [stage])

    useFrame((state, delta) => {
        const group = groupRef.current
        if (!group) return
        const player = useStore.getState().ballPosition

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
            group.position.set(fx, getGroundY(fx, fz), fz)
            group.rotation.y = dampAngle(group.rotation.y, Math.atan2(dirX, dirZ), HEADING_DAMP, dt)
        } else {
            // Stay put facing the player (gameplay, prompt, the game, and the fail ❗ / speech).
            fleeRef.current = 0
            const groundY = getGroundY(target.x, target.z)
            group.position.set(target.x, groundY, target.z)
            group.rotation.y = Math.atan2(player.x - target.x, player.z - target.z)
            setTrampler(TRAMPLE_SLOT_TARGET, target.x, groundY, target.z)
        }

        if (creatureRef.current) {
            const t = state.clock.elapsedTime
            creatureRef.current.position.y = stage === 'success' ? Math.abs(Math.sin(t * 9)) * 0.5 : Math.abs(Math.sin(t * 2.5)) * 0.12
        }

        setGroundShadow(TRAMPLE_SLOT_TARGET, group.position.x, group.position.z, (target.scale ?? 0.5) * 0.62, GROUND_SHADOW_STRENGTH)

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

function Follower({ definition, index, creatureMaterial }) {
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
        const group = groupRef.current
        if (!group) return

        const safeDelta = Math.min(delta, 0.1)

        // Cinematic restart: scatter outward (each in its own fanned direction) off the terrain.
        // Keep fleeing through the brief 'resettling' curtain so they don't snap back to the trail.
        const phaseNow = usePhases.getState().phase
        if (phaseNow === PHASES.restarting || phaseNow === PHASES.resettling) {
            group.visible = true
            let flee = fleeStateRef.current
            if (!flee) {
                const start = positionRef.current
                const hero = useStore.getState().ballPosition
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
            group.position.set(fx, getGroundY(fx, fz), fz)
            group.rotation.y = Math.atan2(flee.dx, flee.dz)
            if (creatureRef.current) creatureRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 9 + index)) * 0.18
            setMoving((current) => (current ? current : true))
            return
        }
        fleeStateRef.current = null

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

        const position = positionRef.current
        if (!initializedRef.current) {
            position.set(definition.x, getGroundY(definition.x, definition.z), definition.z)
            previousRef.current.copy(position)
            initializedRef.current = true
        }

        const blend = 1 - Math.exp(-FOLLOW_DAMP * safeDelta)
        position.x += (result.x - position.x) * blend
        position.y += (result.y - position.y) * blend
        position.z += (result.z - position.z) * blend

        const speed = position.distanceTo(previousRef.current) / safeDelta
        previousRef.current.copy(position)
        const movingNow = speed > MOVE_THRESHOLD
        setMoving((current) => (current === movingNow ? current : movingNow))

        // Group sits on the ground; jump arc + bob live on the inner creature so the
        // shadow stays planted and the trampler reports the ground position.
        const groundY = getGroundY(position.x, position.z)
        group.position.set(position.x, groundY, position.z)

        if (creatureRef.current) {
            const jump = Math.max(0, position.y - groundY)
            const bob = Math.sin(state.clock.elapsedTime * 10 + index) * Math.min(0.12, speed * 0.03)
            creatureRef.current.position.y = jump + bob
        }

        if (result.headingX !== 0 || result.headingZ !== 0) {
            const targetHeading = Math.atan2(result.headingX, result.headingZ)
            headingRef.current = dampAngle(headingRef.current, targetHeading, HEADING_DAMP, safeDelta)
        }
        group.rotation.y = headingRef.current

        setTrampler(slot, position.x, groundY, position.z)
        setGroundShadow(slot, position.x, position.z, (definition.scale ?? 0.5) * 0.62, GROUND_SHADOW_STRENGTH)

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

    const painterlyTexture = useTexture(paintaryAlpha01Url)
    useMemo(() => {
        painterlyTexture.wrapS = THREE.RepeatWrapping
        painterlyTexture.wrapT = THREE.RepeatWrapping
        painterlyTexture.colorSpace = THREE.NoColorSpace
        painterlyTexture.needsUpdate = true
    }, [painterlyTexture])

    // Shared stylized material for every creature — sphere body with shader-drawn
    // eyes, painterly stylization, and the reveal-circle / paintery fade.
    const creatureMaterial = useMemo(() => createCompanionEyeMaterial(painterlyTexture), [painterlyTexture])

    useEffect(() => {
        return () => {
            creatureMaterial.dispose()
        }
    }, [creatureMaterial])

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

    useFrame((rootState) => {
        const store = useStore.getState()
        updateCompanionEyeMaterial(creatureMaterial, {
            refScale: getRefScale(rootState),
            time: rootState.clock.elapsedTime,
            circleCenterX: revealCircle.centerX,
            circleCenterZ: revealCircle.centerZ,
            radiusFactor: revealCircle.radiusFactor,
            chunkSize: revealCircle.chunkSize,
            fadeOffset: store.objectParameters.fadeOffset,
            backgroundColor: store.backgroundParameters.backgroundColor,
            fadeMode: store.borderParameters.fadeMode,
            pixelSize: store.ditheringParameters.pixelSize,
            painterlyEnabled: store.objectParameters.painterlyEnabled,
            paintery: {
                size: store.borderParameters.painterySize,
                screenBlend: store.borderParameters.painteryScreenBlend,
                drift: store.borderParameters.painteryDrift,
                layer2Scale: store.borderParameters.painteryLayer2Scale,
                bleed: store.borderParameters.painteryBleed,
            },
        })

        if (usePhases.getState().phase !== PHASES.start) return

        const companions = useCompanions.getState()
        const gameActive = useSongGame.getState().active

        // While the song game runs, the target is pinned — skip spawn/abandon/range.
        if (gameActive) return

        const player = store.ballPosition

        if (!companions.target) {
            if (companions.found.length < MAX_PARTY) {
                const spawn = findHiddenSpawn(player)
                companions.spawnTarget(spawn.x, spawn.z)
            }
            return
        }

        const distance = Math.hypot(player.x - companions.target.x, player.z - companions.target.z)

        if (distance > ABANDON_RADIUS) {
            const spawn = findHiddenSpawn(player)
            companions.relocateTarget(spawn.x, spawn.z)
            return
        }

        const interactRadius = useStore.getState().songGameParameters?.interactRadius ?? INTERACT_RADIUS
        companions.setTargetInRange(distance <= interactRadius)
    })

    return (
        <>
            {target && <TargetCreature key={target.key} target={target} creatureMaterial={creatureMaterial} />}
            {found.map((member, index) => (
                <Follower key={member.key} definition={member} index={index} creatureMaterial={creatureMaterial} />
            ))}
            <TargetArrow />
        </>
    )
}
