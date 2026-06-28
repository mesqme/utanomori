import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { characterHead } from './utils/characterHead.js'
import eyesVertexShader from '../shaders/characterEyes/vertex.glsl'
import eyesFragmentShader from '../shaders/characterEyes/fragment.glsl'

// Procedural cartoon eyes on a small quad parented to the character model group (so they ride the
// hero's position + facing). On top of that they BIND to the `head` bone: a slow running average of
// the head's pose is the "rest", and the live pose minus that average is the bob/tilt added to the
// tuned placement — so the Leva offset/rotation stay meaningful while the eyes follow the head.
// Also drives the blink and an occasional left/right pupil glance.
const HEAD_AVG_RATE = 0.8 // how fast the "rest" average tracks the head (slower than the bob)

const _relMat = new THREE.Matrix4()
const _parentInv = new THREE.Matrix4()
const _relPos = new THREE.Vector3()
const _relQuat = new THREE.Quaternion()
const _relScale = new THREE.Vector3()
const _bobPos = new THREE.Vector3()
const _deltaQuat = new THREE.Quaternion()
const _avgInv = new THREE.Quaternion()
const _basePos = new THREE.Vector3()
const _baseQuat = new THREE.Quaternion()
const _euler = new THREE.Euler()

export default function CharacterEyes() {
    const params = useStore((s) => s.characterEyesParameters)

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: eyesVertexShader,
                fragmentShader: eyesFragmentShader,
                transparent: true,
                depthWrite: false,
                toneMapped: false,
                side: THREE.DoubleSide,
                uniforms: {
                    uEyeColor: { value: new THREE.Color(params.eyeColor) },
                    uPupilColor: { value: new THREE.Color(params.pupilColor) },
                    uEyeRadius: { value: params.eyeRadius },
                    uEyeSpacing: { value: params.eyeSpacing },
                    uEyeOffsetY: { value: params.eyeOffsetY },
                    uEyeAspect: { value: params.eyeAspect },
                    uEyeNoiseScale: { value: params.eyeNoiseScale },
                    uEyeNoiseStrength: { value: params.eyeNoiseStrength },
                    uPupilWidth: { value: params.pupilWidth },
                    uPupilHeight: { value: params.pupilHeight },
                    uPupilOffsetX: { value: params.pupilOffsetX },
                    uPupilOffsetY: { value: params.pupilOffsetY },
                    uPupilNoiseScale: { value: params.pupilNoiseScale },
                    uPupilNoiseStrength: { value: params.pupilNoiseStrength },
                    uEdgeSoftness: { value: params.edgeSoftness },
                    uBlink: { value: 0 },
                },
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    // Sync shape/colour uniforms when the controls change (uPupilOffsetX is driven per-frame below).
    useEffect(() => {
        const u = material.uniforms
        u.uEyeColor.value.set(params.eyeColor)
        u.uPupilColor.value.set(params.pupilColor)
        u.uEyeRadius.value = params.eyeRadius
        u.uEyeSpacing.value = params.eyeSpacing
        u.uEyeOffsetY.value = params.eyeOffsetY
        u.uEyeAspect.value = params.eyeAspect
        u.uEyeNoiseScale.value = params.eyeNoiseScale
        u.uEyeNoiseStrength.value = params.eyeNoiseStrength
        u.uPupilWidth.value = params.pupilWidth
        u.uPupilHeight.value = params.pupilHeight
        u.uPupilOffsetY.value = params.pupilOffsetY
        u.uPupilNoiseScale.value = params.pupilNoiseScale
        u.uPupilNoiseStrength.value = params.pupilNoiseStrength
        u.uEdgeSoftness.value = params.edgeSoftness
    }, [material, params])

    useEffect(() => () => material.dispose(), [material])

    const groupRef = useRef(null)
    const blinkTimerRef = useRef(2)
    const blinkPhaseRef = useRef(-1) // -1 = open; 0..1 = blink in progress
    const lookOffsetRef = useRef(0)
    const lookTargetRef = useRef(0)
    const lookTimerRef = useRef(4)
    const lookingRef = useRef(false)
    const avgPosRef = useRef(new THREE.Vector3())
    const avgQuatRef = useRef(new THREE.Quaternion())
    const avgInitRef = useRef(false)

    useFrame((_, delta) => {
        const dt = Math.min(delta, 0.05)
        const p = useStore.getState().characterEyesParameters
        const group = groupRef.current
        if (!group) return

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
        material.uniforms.uBlink.value = blinkPhaseRef.current < 0 ? 0 : Math.sin(blinkPhaseRef.current * Math.PI)

        // --- Occasional left/right glance: shift the pupil to ±amount, hold, return (rarer than a blink) ---
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
        material.uniforms.uPupilOffsetX.value = p.pupilOffsetX + lookOffsetRef.current

        // --- Base placement (tuned offset/rotation/scale, in the model group's local space) ---
        _basePos.set(p.offsetX, p.offsetY, p.offsetZ)
        _euler.set(p.rotX, p.rotY, p.rotZ)
        _baseQuat.setFromEuler(_euler)

        // --- Head bind: add the head bone's live pose minus its slow average (the bob / tilt) ---
        const bone = characterHead.bone
        const parent = group.parent
        if (p.headFollow && bone && parent && Number.isFinite(parent.matrixWorld.elements[0]) && parent.scale.x > 1e-3) {
            _parentInv.copy(parent.matrixWorld).invert()
            _relMat.multiplyMatrices(_parentInv, bone.matrixWorld) // head pose in the model group's local space
            _relMat.decompose(_relPos, _relQuat, _relScale)
            if (!avgInitRef.current) {
                avgPosRef.current.copy(_relPos)
                avgQuatRef.current.copy(_relQuat)
                avgInitRef.current = true
            } else {
                const k = 1 - Math.exp(-HEAD_AVG_RATE * dt)
                avgPosRef.current.lerp(_relPos, k)
                avgQuatRef.current.slerp(_relQuat, k)
            }
            _bobPos.copy(_relPos).sub(avgPosRef.current).multiplyScalar(p.headFollowStrength)
            _basePos.add(_bobPos)
            _avgInv.copy(avgQuatRef.current).invert()
            _deltaQuat.copy(_relQuat).multiply(_avgInv) // delta = live * inverse(average)
            _baseQuat.premultiply(_deltaQuat)
        } else {
            avgInitRef.current = false
        }

        group.position.copy(_basePos)
        group.quaternion.copy(_baseQuat)
        group.scale.setScalar(p.planeScale)
    })

    return (
        <group ref={groupRef} visible={params.enabled}>
            <mesh material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
        </group>
    )
}
