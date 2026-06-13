import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import CompanionCreature from './CompanionCreature.jsx'
import TargetArrow from './TargetArrow.jsx'
import { sampleTrail } from './utils/companionTrail.js'
import { getGroundY } from './utils/groundHeight.js'

const SEARCH_MIN_RADIUS = 10
const SEARCH_MAX_RADIUS = 18
const INTERACT_RADIUS = 2.3
const ABANDON_RADIUS = 30
const FOLLOW_SPACING = 1.35
const FOLLOW_DAMP = 10
const HEADING_DAMP = 9

function dampAngle(current, target, lambda, delta) {
    const delta2 = Math.atan2(Math.sin(target - current), Math.cos(target - current))
    return current + delta2 * (1 - Math.exp(-lambda * delta))
}

// Pick a spawn point within the search ring that is currently off-screen, so the
// player has to use the arrow to find it. Falls back to the last candidate.
const spawnProbe = new THREE.Vector3()
function findHiddenSpawn(player, camera) {
    let fallback = null
    for (let attempt = 0; attempt < 14; attempt++) {
        const angle = Math.random() * Math.PI * 2
        const distance = SEARCH_MIN_RADIUS + Math.random() * (SEARCH_MAX_RADIUS - SEARCH_MIN_RADIUS)
        const x = player.x + Math.cos(angle) * distance
        const z = player.z + Math.sin(angle) * distance
        spawnProbe.set(x, getGroundY(x, z) + 0.5, z).project(camera)
        const onScreen = spawnProbe.x >= -1 && spawnProbe.x <= 1 && spawnProbe.y >= -1 && spawnProbe.y <= 1 && spawnProbe.z <= 1
        if (!onScreen) return { x, z }
        fallback = { x, z }
    }
    return fallback
}

function TargetCreature({ target }) {
    const groupRef = useRef(null)

    useFrame((state) => {
        if (!groupRef.current) return
        const bob = Math.abs(Math.sin(state.clock.elapsedTime * 2.5)) * 0.12
        groupRef.current.position.set(target.x, getGroundY(target.x, target.z) + bob, target.z)

        const player = useStore.getState().ballPosition
        groupRef.current.rotation.y = Math.atan2(player.x - target.x, player.z - target.z)
    })

    return (
        <group ref={groupRef}>
            <CompanionCreature definition={target} />
        </group>
    )
}

function Follower({ definition, index }) {
    const groupRef = useRef(null)
    const positionRef = useRef(new THREE.Vector3())
    const previousRef = useRef(new THREE.Vector3())
    const headingRef = useRef(0)
    const initializedRef = useRef(false)
    const sample = useMemo(() => ({}), [])

    useFrame((state, delta) => {
        const group = groupRef.current
        if (!group) return

        const safeDelta = Math.min(delta, 0.1)
        const distanceBehind = FOLLOW_SPACING * (index + 1)
        const result = sampleTrail(distanceBehind, sample)
        if (!result) {
            group.visible = false
            return
        }
        group.visible = true

        const position = positionRef.current
        if (!initializedRef.current) {
            // Start where the friend was met, then slide into the follow line.
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
        const bob = Math.sin(state.clock.elapsedTime * 10 + index) * Math.min(0.12, speed * 0.03)

        group.position.set(position.x, position.y + bob, position.z)

        if (result.headingX !== 0 || result.headingZ !== 0) {
            const targetHeading = Math.atan2(result.headingX, result.headingZ)
            headingRef.current = dampAngle(headingRef.current, targetHeading, HEADING_DAMP, safeDelta)
        }
        group.rotation.y = headingRef.current
    })

    return (
        <group ref={groupRef}>
            <CompanionCreature definition={definition} />
        </group>
    )
}

export default function Companions() {
    const phase = usePhases((state) => state.phase)
    const target = useCompanions((state) => state.target)
    const found = useCompanions((state) => state.found)
    const [subscribeKeys] = useKeyboardControls()

    // Reset the party whenever we leave the gameplay phase.
    useEffect(() => {
        if (phase !== PHASES.start) useCompanions.getState().reset()
    }, [phase])

    // Interact via keyboard; "start over" via the reset key during gameplay.
    useEffect(() => {
        const unsubscribeInteract = subscribeKeys(
            (state) => state.interact,
            (pressed) => {
                if (pressed && usePhases.getState().phase === PHASES.start) useCompanions.getState().interact()
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

    useFrame((state) => {
        if (usePhases.getState().phase !== PHASES.start) return

        const companions = useCompanions.getState()
        const player = useStore.getState().ballPosition

        if (!companions.target) {
            if (companions.found.length < MAX_PARTY) {
                const spawn = findHiddenSpawn(player, state.camera)
                if (spawn) companions.spawnTarget(spawn.x, spawn.z)
            }
            return
        }

        const dx = player.x - companions.target.x
        const dz = player.z - companions.target.z
        const distance = Math.hypot(dx, dz)

        if (distance > ABANDON_RADIUS) {
            const spawn = findHiddenSpawn(player, state.camera)
            if (spawn) companions.relocateTarget(spawn.x, spawn.z)
            return
        }

        companions.setTargetInRange(distance <= INTERACT_RADIUS)
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
