import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import CompanionCreature from './CompanionCreature.jsx'
import TargetIndicator from './TargetIndicator.jsx'
import { sampleTrail } from './utils/companionTrail.js'
import { getGroundY } from './utils/groundHeight.js'
import { setTrampler, clearTrampler, TRAMPLE_SLOT_TARGET, TRAMPLE_SLOT_FOLLOWER } from './utils/trampleField.js'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'

const SEARCH_MIN_RADIUS = 10
const SEARCH_MAX_RADIUS = 18
const INTERACT_RADIUS = 2.3
const ABANDON_RADIUS = 30
const FOLLOW_SPACING = 1.5
const FOLLOW_DAMP = 10
const HEADING_DAMP = 9

function dampAngle(current, target, lambda, delta) {
    const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current))
    return current + difference * (1 - Math.exp(-lambda * delta))
}

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

function CompanionShadow({ geometry, material, radius }) {
    return <mesh geometry={geometry} material={material} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} scale={radius} renderOrder={1} />
}

function TargetCreature({ target, shadowGeometry, shadowMaterial }) {
    const groupRef = useRef(null)
    const creatureRef = useRef(null)

    useEffect(() => () => clearTrampler(TRAMPLE_SLOT_TARGET), [])

    useFrame((state) => {
        if (!groupRef.current) return
        const groundY = getGroundY(target.x, target.z)
        groupRef.current.position.set(target.x, groundY, target.z)

        const player = useStore.getState().ballPosition
        groupRef.current.rotation.y = Math.atan2(player.x - target.x, player.z - target.z)

        if (creatureRef.current) {
            creatureRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 2.5)) * 0.12
        }

        setTrampler(TRAMPLE_SLOT_TARGET, target.x, groundY, target.z)
    })

    return (
        <group ref={groupRef}>
            <CompanionShadow geometry={shadowGeometry} material={shadowMaterial} radius={(target.scale ?? 0.5) * 0.62} />
            <group ref={creatureRef}>
                <CompanionCreature definition={target} />
            </group>
        </group>
    )
}

function Follower({ definition, index, shadowGeometry, shadowMaterial }) {
    const groupRef = useRef(null)
    const creatureRef = useRef(null)
    const positionRef = useRef(new THREE.Vector3())
    const previousRef = useRef(new THREE.Vector3())
    const headingRef = useRef(0)
    const initializedRef = useRef(false)
    const sample = useMemo(() => ({}), [])
    const slot = TRAMPLE_SLOT_FOLLOWER + index

    useEffect(() => () => clearTrampler(slot), [slot])

    useFrame((state, delta) => {
        const group = groupRef.current
        if (!group) return

        const safeDelta = Math.min(delta, 0.1)
        const result = sampleTrail(FOLLOW_SPACING * (index + 1), sample)
        if (!result) {
            group.visible = false
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
    })

    return (
        <group ref={groupRef}>
            <CompanionShadow geometry={shadowGeometry} material={shadowMaterial} radius={(definition.scale ?? 0.5) * 0.62} />
            <group ref={creatureRef}>
                <CompanionCreature definition={definition} />
            </group>
        </group>
    )
}

export default function Companions() {
    const phase = usePhases((state) => state.phase)
    const target = useCompanions((state) => state.target)
    const found = useCompanions((state) => state.found)
    const [subscribeKeys] = useKeyboardControls()

    const shadowGeometry = useMemo(() => new THREE.CircleGeometry(1, 24), [])
    const shadowMaterial = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(soundJourneyPalette.loaderBackground),
                transparent: true,
                opacity: 0.3,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2,
            }),
        []
    )

    useEffect(() => {
        return () => {
            shadowGeometry.dispose()
            shadowMaterial.dispose()
        }
    }, [shadowGeometry, shadowMaterial])

    useEffect(() => {
        if (phase !== PHASES.start) useCompanions.getState().reset()
    }, [phase])

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

        const distance = Math.hypot(player.x - companions.target.x, player.z - companions.target.z)

        if (distance > ABANDON_RADIUS) {
            const spawn = findHiddenSpawn(player, state.camera)
            if (spawn) companions.relocateTarget(spawn.x, spawn.z)
            return
        }

        companions.setTargetInRange(distance <= INTERACT_RADIUS)
    })

    return (
        <>
            {target && <TargetCreature key={target.key} target={target} shadowGeometry={shadowGeometry} shadowMaterial={shadowMaterial} />}
            {found.map((member, index) => (
                <Follower key={member.key} definition={member} index={index} shadowGeometry={shadowGeometry} shadowMaterial={shadowMaterial} />
            ))}
            <TargetIndicator />
        </>
    )
}
