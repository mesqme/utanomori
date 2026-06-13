import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls, useTexture } from '@react-three/drei'
import { forwardRef, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { sharedNoise2D } from './utils/worldNoise.js'
import { recordTrail, resetTrail } from './utils/companionTrail.js'
import { setTrampler, clearTrampler, TRAMPLE_SLOT_MAIN } from './utils/trampleField.js'
import mainCharacterUrl from '../assets/models/mainCharacter.glb'
import paintaryAlpha01Url from '../assets/textures/paintaryAlpha_01.png'
import paintaryAlpha02Url from '../assets/textures/paintaryAlpha_02.png'
import paintaryAlpha03Url from '../assets/textures/paintaryAlpha_03.png'
import paintaryAlpha04Url from '../assets/textures/paintaryAlpha_04.png'
import { mainCharacterMaterialDefaults, mainCharacterMaterialSlots } from '../config/mainCharacterMaterials.js'
import { createCharacterStylizedMaterial, updateCharacterStylizedMaterial } from '../materials/CharacterStylizedMaterial.js'
import { createGroundShadowMaterial, updateGroundShadowMaterial } from '../materials/GroundShadowMaterial.js'

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
const SHADOW_GROUND_OFFSET = 0.025
const SHADOW_MIN_SCALE = 0.45
const SHADOW_MAX_SCALE = 1.25
const SHADOW_MIN_OPACITY = 0.08
const SHADOW_MAX_OPACITY = 0.42
const PAINTERLY_TEXTURE_IDS = ['paintaryAlpha_01', 'paintaryAlpha_02', 'paintaryAlpha_03', 'paintaryAlpha_04']
const PAINTERLY_TEXTURE_URLS = [paintaryAlpha01Url, paintaryAlpha02Url, paintaryAlpha03Url, paintaryAlpha04Url]

function dampAngle(current, target, lambda, delta) {
    const angleDelta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
    return current + angleDelta * (1 - Math.exp(-lambda * delta))
}

export default function MainCharacter() {
    const characterParameters = useStore((state) => state.characterParameters)
    const cameraParameters = useStore((state) => state.cameraParameters)
    const setBallPosition = useStore((state) => state.setBallPosition)
    const setSmoothedCircleCenter = useStore((state) => state.setSmoothedCircleCenter)
    const phase = usePhases((state) => state.phase)
    const setPhase = usePhases((state) => state.setPhase)

    const [smoothedCameraPosition] = useState(() => new THREE.Vector3(0, 14, 12))
    const [smoothedCameraTarget] = useState(() => new THREE.Vector3(0, 0.25, 0))
    const [smoothedCircleCenter] = useState(() => new THREE.Vector3(0, 0, 0))

    const [subscribeKeys, getKeys] = useKeyboardControls()

    const shadowRef = useRef(null)
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
    const [isMoving, setIsMoving] = useState(false)

    const shadowGeometry = useMemo(() => new THREE.CircleGeometry(1, 32), [])

    const shadowMaterial = useMemo(() => createGroundShadowMaterial({ color: '#050312', opacity: SHADOW_MAX_OPACITY }), [])

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
        const x = CHARACTER_INITIAL_XZ.x
        const z = CHARACTER_INITIAL_XZ.y
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
                    setPhase(PHASES.start)
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
        if (phase !== PHASES.start) {
            resetPosition()
        }
    }, [phase, resetPosition])

    useEffect(() => {
        return () => {
            if (scaleAnimationRef.current) {
                scaleAnimationRef.current.kill()
                scaleAnimationRef.current = null
            }
            shadowGeometry.dispose()
            shadowMaterial.dispose()
        }
    }, [shadowGeometry, shadowMaterial])

    useFrame((state, delta) => {
        const safeDelta = Math.min(delta, 0.1)
        const position = positionRef.current
        const velocity = velocityRef.current
        const moveInput = moveInputRef.current

        if (phase === PHASES.start) {
            const keys = getKeys()
            const controls = useStore.getState().controls
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
        } else {
            velocity.set(0, 0, 0)
            wasJumpPressedRef.current = false
        }

        position.x += velocity.x * safeDelta
        position.z += velocity.z * safeDelta

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

        const movingNow = phase === PHASES.start && (Math.abs(velocity.x) > 0.05 || Math.abs(velocity.z) > 0.05)
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
            }
        }

        const visualPosition = visualPositionRef.current
        visualPosition.copy(position)

        if (shadowRef.current) {
            const distanceFromGround = Math.max(0, visualPosition.y - groundedY)
            const distanceFactor = THREE.MathUtils.clamp(distanceFromGround / 1.6, 0, 1)
            const shadowScale = THREE.MathUtils.lerp(SHADOW_MIN_SCALE, SHADOW_MAX_SCALE, distanceFactor)
            const shadowOpacity = THREE.MathUtils.lerp(SHADOW_MAX_OPACITY, SHADOW_MIN_OPACITY, distanceFactor)

            shadowRef.current.position.set(visualPosition.x, groundY + SHADOW_GROUND_OFFSET, visualPosition.z)
            shadowRef.current.scale.set(shadowScale, shadowScale, 1)
            shadowRef.current.material.opacity = shadowOpacity
            updateGroundShadowMaterial(shadowMaterial)
        }

        setBallPosition(visualPosition)

        if (phase === PHASES.start) {
            recordTrail(visualPosition)
            setTrampler(TRAMPLE_SLOT_MAIN, visualPosition.x, groundY, visualPosition.z)
        } else {
            clearTrampler(TRAMPLE_SLOT_MAIN)
        }

        const cameraPosition = cameraPositionRef.current
        const cameraTarget = cameraTargetRef.current

        if (cameraParameters.debugOrbit) {
            cameraPosition.set(
                visualPosition.x + Math.sin(cameraParameters.debugOrbitAngle) * cameraParameters.debugOrbitDistance,
                visualPosition.y + cameraParameters.debugOrbitHeight,
                visualPosition.z + Math.cos(cameraParameters.debugOrbitAngle) * cameraParameters.debugOrbitDistance
            )

            cameraTarget.set(visualPosition.x, visualPosition.y + cameraParameters.debugTargetYOffset, visualPosition.z)
        } else {
            cameraPosition.copy(visualPosition)
            cameraPosition.add(CAMERA_POSITION_OFFSET)

            cameraTarget.copy(visualPosition)
            cameraTarget.add(CAMERA_TARGET_OFFSET)
        }

        const lerpFactor = Math.min(1, CAMERA_LERP_SPEED * safeDelta)
        smoothedCameraPosition.lerp(cameraPosition, lerpFactor)
        smoothedCameraTarget.lerp(cameraTarget, lerpFactor)
        smoothedCircleCenter.lerp(visualPosition, lerpFactor)

        state.camera.position.copy(smoothedCameraPosition)
        state.camera.lookAt(smoothedCameraTarget)
        setSmoothedCircleCenter(smoothedCircleCenter)
    })

    return (
        <>
            <CharacterModel ref={modelRef} moving={isMoving} />
            <mesh ref={shadowRef} geometry={shadowGeometry} material={shadowMaterial} rotation-x={-Math.PI / 2} renderOrder={2} />
        </>
    )
}

const CharacterModel = forwardRef(function CharacterModel({ moving }, ref) {
    const characterParameters = useStore((state) => state.characterParameters)
    const characterMaterialParameters = useStore((state) => state.characterMaterialParameters)
    const setLanternPosition = useStore((state) => state.setLanternPosition)
    const animationRootRef = useRef(null)
    const mixerRef = useRef(null)
    const actionsRef = useRef({ idle: null, run: null })
    const stylizedMaterialsRef = useRef(new Map())
    const movingRef = useRef(false)
    const runBlendRef = useRef(0)
    const lanternWorldPositionRef = useRef(new THREE.Vector3())
    const { nodes, animations } = useGLTF(mainCharacterUrl)
    const painterlyTextures = useTexture(PAINTERLY_TEXTURE_URLS)
    const painterlyTexturesById = useMemo(() => {
        return Object.fromEntries(
            painterlyTextures.map((texture, index) => {
                texture.wrapS = THREE.RepeatWrapping
                texture.wrapT = THREE.RepeatWrapping
                texture.colorSpace = THREE.NoColorSpace
                texture.minFilter = THREE.LinearMipmapLinearFilter
                texture.magFilter = THREE.LinearFilter
                texture.needsUpdate = true
                return [PAINTERLY_TEXTURE_IDS[index], texture]
            })
        )
    }, [painterlyTextures])
    const selectedPainterlyTexture =
        painterlyTexturesById[characterMaterialParameters.painterlyTexture] ?? painterlyTexturesById.paintaryAlpha_01
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
            const painterlyTexture = painterlyTexturesById[stylizedSettings.painterlyTexture] ?? painterlyTexturesById.paintaryAlpha_01

            if (!stylizedMaterialsRef.current.has(materialKey)) {
                stylizedMaterialsRef.current.set(
                    materialKey,
                    createCharacterStylizedMaterial(sourceMaterial, materialSettings, stylizedSettings, painterlyTexture)
                )
            }

            return stylizedMaterialsRef.current.get(materialKey)
        }

        animationRootRef.current.traverse((object) => {
            if (!object.isMesh && !object.isSkinnedMesh) return

            object.material = Array.isArray(object.material)
                ? object.material.map((material, index) => getStylizedMaterial(object, material, index))
                : getStylizedMaterial(object, object.material)
        })

        return () => {
            stylizedMaterialsRef.current.forEach((material) => material.dispose())
            stylizedMaterialsRef.current.clear()
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
            mixer.uncacheRoot(animationRootRef.current)
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
        </group>
    )
})

useGLTF.preload(mainCharacterUrl)
