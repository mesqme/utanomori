import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls, useTexture } from '@react-three/drei'
import { forwardRef, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import { sharedNoise2D } from './utils/worldNoise.js'
import { getNearestRoadPoint, sampleRoadDirection } from './utils/roadField.js'
import { createObjectFieldSampler } from './utils/objectField.js'
import { recordTrail, resetTrail } from './utils/companionTrail.js'
import { setTrampler, clearTrampler, TRAMPLE_SLOT_MAIN } from './utils/trampleField.js'
import { seeThrough } from './utils/seeThrough.js'
import {
    claimCharacterSeeThroughSlot,
    releaseCharacterSeeThroughSlot,
    writeCharacterSeeThrough,
    clearCharacterSeeThrough,
} from './utils/characterSeeThrough.js'
import { cameraRig } from '../game/cameraRig.js'
import { updatePhaseTextureReveal } from '../game/visualReveal.js'
import { CAMERA_TOP_SHOT } from '../game/gameConfig.js'
import mainCharacterUrl from '../assets/models/mainCharacter.glb'
import { PAINTERY_TEXTURE_IDS, PAINTERY_TEXTURE_URL_LIST } from '../config/painteryTextures.js'
import { mainCharacterMaterialDefaults, mainCharacterMaterialSlots } from '../config/mainCharacterMaterials.js'
import { createCharacterStylizedMaterial, updateCharacterStylizedMaterial } from '../materials/CharacterStylizedMaterial.js'
import { setGroundShadow, clearGroundShadow } from './utils/groundShadowField.js'
import CharacterEyes from './CharacterEyes.jsx'
import { characterHead } from './utils/characterHead.js'

const CHARACTER_CENTER_HEIGHT = 0.0
const CHARACTER_MODEL_BASE_Y_OFFSET = -CHARACTER_CENTER_HEIGHT
const CHARACTER_TURN_SPEED = 12.0
const CAMERA_POSITION_OFFSET = new THREE.Vector3(0, 10, 12)
const CAMERA_TARGET_OFFSET = new THREE.Vector3(0, 0.25, 0)
const CAMERA_LERP_SPEED = 5.0
const CHARACTER_INITIAL_XZ = new THREE.Vector2(0, 0)
const WALK_SPEED = 4.0
const RUN_SPEED = 5.5
const ACCELERATION = 24.0
const DECELERATION = 18.0
const JUMP_VELOCITY = 4.2
const GRAVITY = 13.0
const GROUND_EPSILON = 0.02
const HERO_COLLISION_RADIUS = 0.35 // hero body radius for pushing out of solid stones
const CREDITS_TRACK_GAIN = 1.2 // how firmly the credits runner steers back onto the lane centre
const CREDITS_SPEED_SCALE = 0.65 // credits run at half the normal walk/run speed
const SHADOW_GROUND_OFFSET = 0.025
const SHADOW_MIN_SCALE = 0.45
const SHADOW_MAX_SCALE = 1.25
const SHADOW_MIN_OPACITY = 0.08
const SHADOW_MAX_OPACITY = 0.42
const EMPTY_INPUT = {} // stand-in for keys/controls while the hero is frozen (song game)

const SEE_THROUGH_CENTER_Y = 0.85 // hole centred near the hero's mid-height
const _stWorld = new THREE.Vector3()
const _stEdge = new THREE.Vector3()
const _stRight = new THREE.Vector3()

function getLoaderDebugTarget() {
    const { targetX, targetZ } = useStore.getState().loaderDebugParameters
    return { x: targetX, z: targetZ }
}

function getLoaderCameraHeight() {
    return useStore.getState().loaderDebugParameters.cameraHeight ?? CAMERA_TOP_SHOT.height
}

function getTopCameraPosition(target, y = 0) {
    const cameraHeight = getLoaderCameraHeight()
    return new THREE.Vector3(
        target.x + Math.sin(CAMERA_TOP_SHOT.angle) * CAMERA_TOP_SHOT.distance,
        y + cameraHeight,
        target.z + Math.cos(CAMERA_TOP_SHOT.angle) * CAMERA_TOP_SHOT.distance
    )
}

function getTopCameraTarget(target, y = 0) {
    return new THREE.Vector3(target.x, y + CAMERA_TOP_SHOT.targetYOffset, target.z)
}

function dampAngle(current, target, lambda, delta) {
    const angleDelta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
    return current + angleDelta * (1 - Math.exp(-lambda * delta))
}

export default function MainCharacter() {
    const characterParameters = useStore((state) => state.characterParameters)
    const cameraParameters = useStore((state) => state.cameraParameters)
    const loaderDebugParameters = useStore((state) => state.loaderDebugParameters)
    const setBallPosition = useStore((state) => state.setBallPosition)
    const setSmoothedCircleCenter = useStore((state) => state.setSmoothedCircleCenter)
    const phase = usePhases((state) => state.phase)
    const setPhase = usePhases((state) => state.setPhase)

    const [smoothedCameraPosition] = useState(() => getTopCameraPosition(getLoaderDebugTarget()))
    const [smoothedCameraTarget] = useState(() => getTopCameraTarget(getLoaderDebugTarget()))
    const [smoothedCircleCenter] = useState(() => new THREE.Vector3(0, 0, 0))

    const [subscribeKeys, getKeys] = useKeyboardControls()

    const modelRef = useRef(null)
    const scaleAnimationRef = useRef(null)
    const positionRef = useRef(new THREE.Vector3())
    const velocityRef = useRef(new THREE.Vector3())
    const moveInputRef = useRef(new THREE.Vector3())
    const visualPositionRef = useRef(new THREE.Vector3())
    const cameraPositionRef = useRef(new THREE.Vector3())
    const cameraTargetRef = useRef(new THREE.Vector3())
    const wasJumpPressedRef = useRef(false)
    const isGroundedRef = useRef(true)
    const colliderRef = useRef({ objParams: null, roadParams: null, sampler: null })
    const seeThroughSlotRef = useRef(-1) // hero's slot in the shared character see-through buffer (grass + props)
    const contrastRevealRef = useRef(0) // painterly contrast fades 0→1 before the game (same clock as the grain)
    const [isMoving, setIsMoving] = useState(false)

    // The hero shares the character see-through buffer with the sheep, so the GRASS (and props) in
    // front of him clear the same way. Claim a fixed slot for the lifetime of the component.
    useEffect(() => {
        seeThroughSlotRef.current = claimCharacterSeeThroughSlot()
        return () => {
            releaseCharacterSeeThroughSlot(seeThroughSlotRef.current)
            seeThroughSlotRef.current = -1
        }
    }, [])


    const getGroundY = useCallback((x, z) => {
        const terrainParameters = useStore.getState().terrainParameters
        return sharedNoise2D(x * terrainParameters.scale, z * terrainParameters.scale) * terrainParameters.amplitude
    }, [])

    const setModelTransform = useCallback(() => {
        if (!modelRef.current) return

        const modelYOffset = CHARACTER_MODEL_BASE_Y_OFFSET + useStore.getState().characterParameters.modelYOffset
        const position = positionRef.current
        modelRef.current.position.set(position.x, position.y + modelYOffset, position.z)
    }, [])

    const resetPosition = useCallback(() => {
        const roadParameters = useStore.getState().roadParameters
        const roadSpawn = getNearestRoadPoint(CHARACTER_INITIAL_XZ.x, CHARACTER_INITIAL_XZ.y, roadParameters)
        const x = roadSpawn?.x ?? CHARACTER_INITIAL_XZ.x
        const z = roadSpawn?.z ?? CHARACTER_INITIAL_XZ.y
        const y = getGroundY(x, z) + CHARACTER_CENTER_HEIGHT

        positionRef.current.set(x, y, z)
        velocityRef.current.set(0, 0, 0)
        isGroundedRef.current = true
        setModelTransform()

        setBallPosition(positionRef.current)
        smoothedCircleCenter.copy(positionRef.current)
        resetTrail(positionRef.current)
    }, [getGroundY, setBallPosition, setModelTransform, smoothedCircleCenter])

    const handleReset = useCallback(() => {
        resetPosition()

        if (scaleAnimationRef.current) {
            scaleAnimationRef.current.kill()
            scaleAnimationRef.current = null
        }

        if (modelRef.current) {
            modelRef.current.scale.set(0, 0, 0)
            scaleAnimationRef.current = gsap.to(modelRef.current.scale, {
                x: characterParameters.modelScale,
                y: characterParameters.modelScale,
                z: characterParameters.modelScale,
                duration: 0.8,
                ease: 'elastic.out(1, 0.5)',
                onComplete: () => {
                    scaleAnimationRef.current = null
                },
            })
        }
    }, [characterParameters.modelScale, resetPosition])

    useEffect(() => {
        resetPosition()
    }, [resetPosition])

    useEffect(() => {
        if (!modelRef.current || scaleAnimationRef.current) return
        modelRef.current.scale.setScalar(characterParameters.modelScale)
    }, [characterParameters.modelScale])

    useEffect(() => {
        const unsubscribeReset = subscribeKeys(
            (state) => state.reset,
            (value) => {
                if (!value) return
                const currentPhase = usePhases.getState().phase
                if (currentPhase === PHASES.warmup) {
                    setPhase(PHASES.intro)
                    return
                }
                if (currentPhase === PHASES.start) {
                    handleReset()
                }
            }
        )

        return unsubscribeReset
    }, [subscribeKeys, setPhase, handleReset])

    useEffect(() => {
        // Keep the hero where he is during credits (he runs on) AND through the restart teardown +
        // curtain (he glides to a stop in place; the snap to origin happens at warmup, hidden behind
        // the loading cover); reset only for the true menu phases.
        if (
            phase !== PHASES.start &&
            phase !== PHASES.credits &&
            phase !== PHASES.restarting &&
            phase !== PHASES.resettling
        ) {
            resetPosition()
        }
    }, [phase, resetPosition])

    useEffect(() => {
        return () => {
            if (scaleAnimationRef.current) {
                scaleAnimationRef.current.kill()
                scaleAnimationRef.current = null
            }
            clearGroundShadow(TRAMPLE_SLOT_MAIN)
        }
    }, [])

    useFrame((state, delta) => {
        const safeDelta = Math.min(delta, 0.1)

        // Painterly contrast reveals 0→full during the INTRO camera travel (same clock as the
        // texture/stars/glow reveal) — so before GO the hero's contrast is 0 and the brush "develops"
        // in as the camera flies down, instead of fading in while we're still on the loading screen.
        contrastRevealRef.current = updatePhaseTextureReveal(contrastRevealRef.current, phase, safeDelta)
        const targetContrast = useStore.getState().characterMaterialParameters.painterlyContrast
        const fadedContrast = targetContrast * contrastRevealRef.current
        const stylizedMaterials = characterHead.materials
        for (let i = 0; i < stylizedMaterials.length; i++) {
            const u = stylizedMaterials[i].uniforms
            if (u && u.uPainterlyContrast) u.uPainterlyContrast.value = fadedContrast
        }

        const position = positionRef.current
        const velocity = velocityRef.current
        const moveInput = moveInputRef.current

        if (phase === PHASES.start) {
            // The song mini-game freezes the hero in place.
            const frozen = useSongGame.getState().active
            const keys = frozen ? EMPTY_INPUT : getKeys()
            const controls = frozen ? EMPTY_INPUT : useStore.getState().controls
            const jumpPressed = Boolean(keys.jump || controls.jump)
            const maxSpeed = keys.run ? RUN_SPEED : WALK_SPEED

            moveInput.set(0, 0, 0)
            if (keys.forward || controls.forward) moveInput.z -= 1
            if (keys.backward || controls.backward) moveInput.z += 1
            if (keys.leftward || controls.leftward) moveInput.x -= 1
            if (keys.rightward || controls.rightward) moveInput.x += 1

            if (moveInput.lengthSq() > 0) {
                moveInput.normalize().multiplyScalar(maxSpeed)
                velocity.x = THREE.MathUtils.damp(velocity.x, moveInput.x, ACCELERATION, safeDelta)
                velocity.z = THREE.MathUtils.damp(velocity.z, moveInput.z, ACCELERATION, safeDelta)
            } else {
                velocity.x = THREE.MathUtils.damp(velocity.x, 0, DECELERATION, safeDelta)
                velocity.z = THREE.MathUtils.damp(velocity.z, 0, DECELERATION, safeDelta)
            }

            if (jumpPressed && !wasJumpPressedRef.current && isGroundedRef.current) {
                velocity.y = JUMP_VELOCITY
                isGroundedRef.current = false
            }
            wasJumpPressedRef.current = jumpPressed
        } else if (phase === PHASES.credits) {
            // Credits: the hero heads to the nearest road and then runs ALONG it, party trailing.
            // Follow the road's LOCAL tangent (the meander's exact derivative) so turns aren't
            // cut, plus a steer back toward the lane centre to stay on it / approach it. Lanes
            // run +Z; the hero runs -Z, so the forward tangent is negated.
            const road = useStore.getState().roadParameters
            let steered = false
            if (road?.enabled) {
                const onRoad = getNearestRoadPoint(position.x, position.z, road)
                if (onRoad) {
                    const dir = sampleRoadDirection(position.x, position.z, road) // tangent, +Z
                    const error = onRoad.x - position.x // cross-track offset to the lane centre
                    const mx = -dir.x + error * CREDITS_TRACK_GAIN
                    const mz = -dir.z
                    const len = Math.hypot(mx, mz) || 1
                    const speed = (onRoad.distance > road.width * 0.6 ? WALK_SPEED : RUN_SPEED) * CREDITS_SPEED_SCALE
                    moveInput.set((mx / len) * speed, 0, (mz / len) * speed)
                    steered = true
                }
            }
            if (!steered) moveInput.set(0, 0, -1).multiplyScalar(RUN_SPEED * CREDITS_SPEED_SCALE) // no road → straight on
            velocity.x = THREE.MathUtils.damp(velocity.x, moveInput.x, ACCELERATION, safeDelta)
            velocity.z = THREE.MathUtils.damp(velocity.z, moveInput.z, ACCELERATION, safeDelta)
            wasJumpPressedRef.current = false
        } else if (phase === PHASES.restarting) {
            // Cinematic restart: glide to a stop in place as the camera lifts away.
            velocity.x = THREE.MathUtils.damp(velocity.x, 0, DECELERATION, safeDelta)
            velocity.z = THREE.MathUtils.damp(velocity.z, 0, DECELERATION, safeDelta)
            wasJumpPressedRef.current = false
        } else {
            velocity.set(0, 0, 0)
            wasJumpPressedRef.current = false
        }

        position.x += velocity.x * safeDelta
        position.z += velocity.z * safeDelta

        // Solid stones: push the hero out of any stone he walked into (gameplay only).
        if (phase === PHASES.start) {
            const objState = useStore.getState()
            if (objState.objectParameters.enabled) {
                const collider = colliderRef.current
                if (collider.objParams !== objState.objectParameters || collider.roadParams !== objState.roadParameters) {
                    collider.objParams = objState.objectParameters
                    collider.roadParams = objState.roadParameters
                    collider.sampler = createObjectFieldSampler(objState.objectParameters, objState.roadParameters)
                }
                const corrected = collider.sampler.collideCircle(position.x, position.z, HERO_COLLISION_RADIUS)
                if (corrected) {
                    position.x = corrected.x
                    position.z = corrected.z
                }
            }
        }

        const groundY = getGroundY(position.x, position.z)
        const groundedY = groundY + CHARACTER_CENTER_HEIGHT

        if (phase === PHASES.start && !isGroundedRef.current) {
            velocity.y -= GRAVITY * safeDelta
            position.y += velocity.y * safeDelta
        }

        if (position.y <= groundedY + GROUND_EPSILON || isGroundedRef.current) {
            position.y = groundedY
            velocity.y = 0
            isGroundedRef.current = true
        }

        const movingNow = (phase === PHASES.start || phase === PHASES.credits) && (Math.abs(velocity.x) > 0.05 || Math.abs(velocity.z) > 0.05)
        setIsMoving((current) => (current === movingNow ? current : movingNow))

        if (modelRef.current) {
            const modelYOffset = CHARACTER_MODEL_BASE_Y_OFFSET + characterParameters.modelYOffset
            modelRef.current.position.set(position.x, position.y + modelYOffset, position.z)

            if (!scaleAnimationRef.current) {
                modelRef.current.scale.setScalar(characterParameters.modelScale)
            }

            if (movingNow) {
                const targetRotationY = Math.atan2(velocity.x, velocity.z) + characterParameters.rotationOffset
                modelRef.current.rotation.y = dampAngle(modelRef.current.rotation.y, targetRotationY, CHARACTER_TURN_SPEED, safeDelta)
            } else if (phase === PHASES.start && useSongGame.getState().active) {
                // In a conversation / mini-game: turn to face the music character we're talking to,
                // so the hero is never left standing with his back to them.
                const companion = useSongGame.getState().companion
                if (companion) {
                    const faceAngle = Math.atan2(companion.x - position.x, companion.z - position.z) + characterParameters.rotationOffset
                    modelRef.current.rotation.y = dampAngle(modelRef.current.rotation.y, faceAngle, CHARACTER_TURN_SPEED, safeDelta)
                }
            } else if (phase === PHASES.restarting) {
                // Smoothly turn back to the initial menu facing as he settles.
                const menuFacing = Math.atan2(0, 1) + characterParameters.rotationOffset
                modelRef.current.rotation.y = dampAngle(modelRef.current.rotation.y, menuFacing, CHARACTER_TURN_SPEED, safeDelta)
            } else if (phase !== PHASES.start) {
                // Fixed orientation for the WHOLE menu + intro, turned 180° to face +Z (toward
                // the camera / orbit landing). It's the SAME value in warmup and intro, so it
                // never flips at GO — no offset of the off-centre model. The 360° orbit lands
                // face-on at the dialogue.
                modelRef.current.rotation.y = Math.atan2(0, 1) + characterParameters.rotationOffset
            }
        }

        const visualPosition = visualPositionRef.current
        visualPosition.copy(position)

        {
            // Hero ground shadow → drawn in the terrain shader (groundShadowField), not a decal mesh.
            const distanceFromGround = Math.max(0, visualPosition.y - groundedY)
            const distanceFactor = THREE.MathUtils.clamp(distanceFromGround / 1.6, 0, 1)
            const shadowScale = THREE.MathUtils.lerp(SHADOW_MIN_SCALE, SHADOW_MAX_SCALE, distanceFactor)
            const shadowOpacity = THREE.MathUtils.lerp(SHADOW_MAX_OPACITY, SHADOW_MIN_OPACITY, distanceFactor)
            setGroundShadow(TRAMPLE_SLOT_MAIN, visualPosition.x, visualPosition.z, shadowScale, shadowOpacity)
        }

        setBallPosition(visualPosition)

        if (phase === PHASES.intro || phase === PHASES.start || phase === PHASES.credits) {
            recordTrail(visualPosition)
            setTrampler(TRAMPLE_SLOT_MAIN, visualPosition.x, groundY, visualPosition.z)
        } else {
            clearTrampler(TRAMPLE_SLOT_MAIN)
        }

        const cameraPosition = cameraPositionRef.current
        const cameraTarget = cameraTargetRef.current

        let cameraLerpSpeed = CAMERA_LERP_SPEED
        if (loaderDebugParameters.enabled) {
            const targetX = loaderDebugParameters.targetX
            const targetZ = loaderDebugParameters.targetZ

            cameraPosition.set(
                targetX + Math.sin(CAMERA_TOP_SHOT.angle) * CAMERA_TOP_SHOT.distance,
                visualPosition.y + loaderDebugParameters.cameraHeight,
                targetZ + Math.cos(CAMERA_TOP_SHOT.angle) * CAMERA_TOP_SHOT.distance
            )
            cameraTarget.set(targetX, visualPosition.y + CAMERA_TOP_SHOT.targetYOffset, targetZ)
            cameraLerpSpeed = 30
        } else if (cameraParameters.debugOrbit) {
            cameraPosition.set(
                visualPosition.x + Math.sin(cameraParameters.debugOrbitAngle) * cameraParameters.debugOrbitDistance,
                visualPosition.y + cameraParameters.debugOrbitHeight,
                visualPosition.z + Math.cos(cameraParameters.debugOrbitAngle) * cameraParameters.debugOrbitDistance
            )

            cameraTarget.set(visualPosition.x, visualPosition.y + cameraParameters.debugTargetYOffset, visualPosition.z)
        } else if (cameraRig.mode === 'orbit') {
            // Game-cycle shot (loading top view / intro travel).
            const useLoaderTarget = phase === PHASES.loading || phase === PHASES.warmup || phase === PHASES.intro
            const targetX = useLoaderTarget ? loaderDebugParameters.targetX : cameraRig.centerX ?? visualPosition.x
            const targetZ = useLoaderTarget ? loaderDebugParameters.targetZ : cameraRig.centerZ ?? visualPosition.z

            cameraPosition.set(
                targetX + Math.sin(cameraRig.angle) * cameraRig.distance,
                visualPosition.y + cameraRig.height,
                targetZ + Math.cos(cameraRig.angle) * cameraRig.distance
            )
            cameraTarget.set(targetX, visualPosition.y + cameraRig.targetYOffset, targetZ)
            cameraLerpSpeed = cameraRig.lerpSpeed
        } else {
            cameraPosition.copy(visualPosition)
            cameraPosition.add(CAMERA_POSITION_OFFSET)

            cameraTarget.copy(visualPosition)
            cameraTarget.add(CAMERA_TARGET_OFFSET)
            cameraLerpSpeed = cameraRig.lerpSpeed
        }

        const lerpFactor = Math.min(1, cameraLerpSpeed * safeDelta)
        smoothedCameraPosition.lerp(cameraPosition, lerpFactor)
        smoothedCameraTarget.lerp(cameraTarget, lerpFactor)
        smoothedCircleCenter.lerp(visualPosition, lerpFactor)

        state.camera.position.copy(smoothedCameraPosition)
        state.camera.lookAt(smoothedCameraTarget)

        // See-through hole: project the hero to framebuffer pixels so occluders in
        // front of him can fade away. Refresh the camera matrices first - R3F only
        // updates them at render time, i.e. after this callback.
        state.camera.updateMatrixWorld()
        state.camera.matrixWorldInverse.copy(state.camera.matrixWorld).invert()

        const seeThroughDpr = state.viewport.dpr
        const bufferW = state.size.width * seeThroughDpr
        const bufferH = state.size.height * seeThroughDpr

        _stWorld.set(visualPosition.x, visualPosition.y + SEE_THROUGH_CENTER_Y, visualPosition.z)
        seeThrough.cameraDist = state.camera.position.distanceTo(_stWorld)
        _stRight.setFromMatrixColumn(state.camera.matrixWorld, 0) // camera right (world)
        _stEdge.copy(_stWorld).addScaledVector(_stRight, seeThrough.worldRadius)

        _stWorld.project(state.camera)
        _stEdge.project(state.camera)

        const stCenterX = (_stWorld.x * 0.5 + 0.5) * bufferW
        const stCenterY = (_stWorld.y * 0.5 + 0.5) * bufferH
        seeThrough.centerX = stCenterX
        seeThrough.centerY = stCenterY
        seeThrough.radiusPx = Math.hypot((_stEdge.x * 0.5 + 0.5) * bufferW - stCenterX, (_stEdge.y * 0.5 + 0.5) * bufferH - stCenterY)
        seeThrough.active = seeThrough.enabled && _stWorld.z > -1 && _stWorld.z < 1 && (phase === PHASES.intro || phase === PHASES.start || phase === PHASES.credits)

        // Mirror the hero's hole into the shared character buffer so the GRASS clears in front of him
        // too (the grass reads only this buffer, not the single hero disc). Same projection as above.
        if (seeThrough.active) {
            writeCharacterSeeThrough(seeThroughSlotRef.current, seeThrough.centerX, seeThrough.centerY, seeThrough.radiusPx, seeThrough.cameraDist)
        } else {
            clearCharacterSeeThrough(seeThroughSlotRef.current)
        }

        setSmoothedCircleCenter(smoothedCircleCenter)
    })

    return (
        <>
            <CharacterModel ref={modelRef} moving={isMoving} />
        </>
    )
}

const CharacterModel = forwardRef(function CharacterModel({ moving }, ref) {
    const characterParameters = useStore((state) => state.characterParameters)
    const characterMaterialParameters = useStore((state) => state.characterMaterialParameters)
    const setLanternPosition = useStore((state) => state.setLanternPosition)
    const setLanternFirePosition = useStore((state) => state.setLanternFirePosition)
    const setLanternGlowPosition = useStore((state) => state.setLanternGlowPosition)
    const animationRootRef = useRef(null)
    const mixerRef = useRef(null)
    const actionsRef = useRef({ idle: null, run: null })
    const stylizedMaterialsRef = useRef(new Map())
    const movingRef = useRef(false)
    const runBlendRef = useRef(0)
    const lanternWorldPositionRef = useRef(new THREE.Vector3())
    const lanternFireOffsetRef = useRef(new THREE.Vector3())
    const lanternGlowOffsetRef = useRef(new THREE.Vector3())
    const lanternFlameAxisRef = useRef(new THREE.Vector3())
    const { nodes, animations } = useGLTF(mainCharacterUrl)
    const painterlyTextures = useTexture(PAINTERY_TEXTURE_URL_LIST)
    const painterlyTexturesById = useMemo(() => {
        return Object.fromEntries(
            painterlyTextures.map((texture, index) => {
                texture.wrapS = THREE.RepeatWrapping
                texture.wrapT = THREE.RepeatWrapping
                texture.colorSpace = THREE.NoColorSpace
                texture.minFilter = THREE.LinearMipmapLinearFilter
                texture.magFilter = THREE.LinearFilter
                texture.needsUpdate = true
                return [PAINTERY_TEXTURE_IDS[index], texture]
            })
        )
    }, [painterlyTextures])
    const selectedPainterlyTexture = painterlyTexturesById[characterMaterialParameters.painterlyTexture] ?? painterlyTexturesById.paintaryAlpha
    const materialSlotsByMeshName = useMemo(() => {
        return mainCharacterMaterialSlots.reduce((slots, slot) => {
            slots[slot.meshName] = slot
            return slots
        }, {})
    }, [])

    useEffect(() => {
        if (!animationRootRef.current) return

        const getStylizedMaterial = (object, sourceMaterial, materialIndex = 0) => {
            const materialKey = `${object.uuid}:${materialIndex}`
            const slot = materialSlotsByMeshName[object.name]
            const stylizedSettings = useStore.getState().characterMaterialParameters
            const materialSettings = stylizedSettings.materials[slot?.materialId] ?? mainCharacterMaterialDefaults[slot?.materialId]
            const painterlyTexture = painterlyTexturesById[stylizedSettings.painterlyTexture] ?? painterlyTexturesById.paintaryAlpha

            if (!stylizedMaterialsRef.current.has(materialKey)) {
                stylizedMaterialsRef.current.set(materialKey, createCharacterStylizedMaterial(sourceMaterial, materialSettings, stylizedSettings, painterlyTexture))
            }

            return stylizedMaterialsRef.current.get(materialKey)
        }

        animationRootRef.current.traverse((object) => {
            if (!object.isMesh && !object.isSkinnedMesh) return

            object.material = Array.isArray(object.material)
                ? object.material.map((material, index) => getStylizedMaterial(object, material, index))
                : getStylizedMaterial(object, object.material)

            // The head mesh's material hosts the in-shader (uv1) eyes. The mesh is named `head_1`
            // (drei suffixes the mesh node), NOT `head` (that's the bone) — match the prefix.
            if (object.name.startsWith('head')) {
                characterHead.material = Array.isArray(object.material) ? object.material[0] : object.material
            }
        })

        // Share every stylized material for the painterly-contrast reveal (per-frame, in the useFrame).
        characterHead.materials = Array.from(stylizedMaterialsRef.current.values())

        return () => {
            stylizedMaterialsRef.current.forEach((material) => material.dispose())
            stylizedMaterialsRef.current.clear()
            characterHead.material = null
            characterHead.materials = []
        }
    }, [materialSlotsByMeshName, nodes, painterlyTexturesById])

    useEffect(() => {
        if (!animationRootRef.current) return

        animationRootRef.current.traverse((object) => {
            if (!object.isMesh && !object.isSkinnedMesh) return

            const slot = materialSlotsByMeshName[object.name]
            const materialSettings = characterMaterialParameters.materials[slot?.materialId] ?? mainCharacterMaterialDefaults[slot?.materialId]
            if (!materialSettings) return

            const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
            objectMaterials.forEach((material) => {
                if (!material?.uniforms?.uBaseColor) return
                updateCharacterStylizedMaterial(material, materialSettings, characterMaterialParameters, selectedPainterlyTexture)
            })
        })
    }, [characterMaterialParameters, materialSlotsByMeshName, selectedPainterlyTexture])

    useEffect(() => {
        if (!animationRootRef.current) return

        const mixer = new THREE.AnimationMixer(animationRootRef.current)
        const idleClip = THREE.AnimationClip.findByName(animations, 'mc_Idle')
        const runClip = THREE.AnimationClip.findByName(animations, 'mc_Run')

        if (!idleClip) {
            console.warn('MainCharacter: missing animation clip mc_Idle')
        }
        if (!runClip) {
            console.warn('MainCharacter: missing animation clip mc_Run')
        }

        const idle = idleClip ? mixer.clipAction(idleClip) : null
        const run = runClip ? mixer.clipAction(runClip) : null

        if (idle) {
            idle.setLoop(THREE.LoopRepeat, Infinity)
            idle.clampWhenFinished = false
            idle.enabled = true
            idle.setEffectiveWeight(1)
            idle.setEffectiveTimeScale(characterParameters.idleTimeScale)
            idle.reset().play()
        }

        if (run) {
            run.setLoop(THREE.LoopRepeat, Infinity)
            run.clampWhenFinished = false
            run.enabled = true
            run.setEffectiveTimeScale(characterParameters.runTimeScale)
            run.setEffectiveWeight(0)
            run.reset().play()
        }

        mixerRef.current = mixer
        actionsRef.current = { idle, run }

        return () => {
            mixer.stopAllAction()
            // animationRootRef may already be detached (null) on unmount — uncacheRoot(null)
            // would read null.uuid and throw, so guard it.
            if (animationRootRef.current) mixer.uncacheRoot(animationRootRef.current)
            mixerRef.current = null
            actionsRef.current = { idle: null, run: null }
        }
    }, [animations])

    useEffect(() => {
        actionsRef.current.idle?.setEffectiveTimeScale(characterParameters.idleTimeScale)
        actionsRef.current.run?.setEffectiveTimeScale(characterParameters.runTimeScale)
    }, [characterParameters.idleTimeScale, characterParameters.runTimeScale])

    useEffect(() => {
        movingRef.current = moving
    }, [moving])

    useFrame((_, delta) => {
        const { idle, run } = actionsRef.current
        const targetBlend = movingRef.current ? 1 : 0
        const blendSpeed = movingRef.current ? characterParameters.runBlendInSpeed : characterParameters.runBlendOutSpeed
        runBlendRef.current = THREE.MathUtils.damp(runBlendRef.current, targetBlend, blendSpeed, Math.min(delta, 0.1))

        if (idle) {
            idle.enabled = true
            idle.setEffectiveWeight(1 - runBlendRef.current)
        }

        if (run) {
            run.enabled = true
            run.setEffectiveWeight(runBlendRef.current)
        }

        mixerRef.current?.update(delta)

        if (nodes.lantern_1) {
            nodes.lantern_1.getWorldPosition(lanternWorldPositionRef.current)
            setLanternPosition(lanternWorldPositionRef.current)
            const fp = useStore.getState().lanternFireParameters
            // Fire: anchored to the dedicated `flame` bone (the lantern's geometric bottom-centre,
            // parented to the lantern bone) so it tracks the lantern exactly as it swings — no manual
            // offset needed. Falls back to the old lantern_1 + offset only if the bone is missing.
            if (nodes.flame) {
                nodes.flame.getWorldPosition(lanternFireOffsetRef.current)
                // Nudge the flame along the lantern→flame bone axis (head of lantern bone → head of
                // flame bone) so it rides a bit higher up that line without leaving it. + = toward
                // the lantern bone head (up the lantern); − = down toward/past the flame bone.
                const boneOffset = fp.fireBoneOffset ?? 0
                if (boneOffset !== 0 && nodes.flame.parent) {
                    nodes.flame.parent.getWorldPosition(lanternFlameAxisRef.current) // lantern bone head
                    lanternFlameAxisRef.current.sub(lanternFireOffsetRef.current) // → flame→lantern (up the bone)
                    if (lanternFlameAxisRef.current.lengthSq() > 1e-8) {
                        lanternFlameAxisRef.current.normalize()
                        lanternFireOffsetRef.current.addScaledVector(lanternFlameAxisRef.current, boneOffset)
                    }
                }
            } else {
                lanternFireOffsetRef.current.set(fp.fireOffsetX, fp.fireOffsetY, fp.fireOffsetZ)
                nodes.lantern_1.localToWorld(lanternFireOffsetRef.current)
            }
            setLanternFirePosition(lanternFireOffsetRef.current)
            // Glow: still a local offset on the lantern (a soft halo around the lantern body).
            lanternGlowOffsetRef.current.set(fp.glowOffsetX, fp.glowOffsetY, fp.glowOffsetZ)
            nodes.lantern_1.localToWorld(lanternGlowOffsetRef.current)
            setLanternGlowPosition(lanternGlowOffsetRef.current)
        }
    })

    return (
        <group ref={ref} dispose={null}>
            <group ref={animationRootRef}>
                <group name="Scene">
                    <group name="mainCharacterRig">
                        <primitive object={nodes.root} />
                    </group>
                </group>
            </group>
            <CharacterEyes />
        </group>
    )
})

useGLTF.preload(mainCharacterUrl)
