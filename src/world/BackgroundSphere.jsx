import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'

import useStore from '../stores/useStore.jsx'
import usePhases from '../stores/usePhases.jsx'
import { createBackgroundMaterial, updateBackgroundMaterial } from '../materials/BackgroundMaterial.js'
import { getWorldLockScale } from './utils/screenScale.js'
import { updatePhaseTextureReveal } from '../game/visualReveal.js'
import watercolorBasicUrl from '../assets/textures/watercolorBasicLarge.png'

export default function BackgroundSphere() {
    const meshRef = useRef()
    const rotationAngle = useRef(0)
    const textureReveal = useRef(0)
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

    // Fake camera reaction for the screen-space cloud layer: the stars are sampled in sky
    // direction (so they track the camera), but the cloud texture is screen-pinned. We pan
    // the cloud UV by accumulated camera yaw + pitch so the supernova clouds drift in the
    // same direction as the stars — a parallax-style lag, intentionally not a 1:1 lock.
    const panState = useRef({ prevYaw: null, yawAccum: 0 })
    const cameraForward = useMemo(() => new THREE.Vector3(), [])
    const texturePan = useMemo(() => new THREE.Vector2(), [])
    const resolution = useMemo(() => new THREE.Vector2(), [])

    const watercolorTexture = useTexture(watercolorBasicUrl)
    useMemo(() => {
        watercolorTexture.wrapS = THREE.RepeatWrapping
        watercolorTexture.wrapT = THREE.RepeatWrapping
        watercolorTexture.colorSpace = THREE.NoColorSpace
        watercolorTexture.needsUpdate = true
    }, [watercolorTexture])

    const geometry = useMemo(() => new THREE.SphereGeometry(50, 32, 24), [])
    const material = useMemo(() => createBackgroundMaterial(watercolorTexture), [watercolorTexture])
    const wireframeMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 'red', side: THREE.BackSide, wireframe: true }), [])

    useEffect(() => {
        return () => {
            geometry.dispose()
            material.dispose()
            wireframeMaterial.dispose()
        }
    }, [geometry, material, wireframeMaterial])

    useFrame((rootState, delta) => {
        const store = useStore.getState()
        const params = store.backgroundParameters

        meshRef.current.position.copy(store.smoothedCircleCenter)
        if (params.rotationEnabled) rotationAngle.current += (params.rotationSpeed ?? 0) * delta
        meshRef.current.rotation.y = rotationAngle.current

        const phase = usePhases.getState().phase
        textureReveal.current = updatePhaseTextureReveal(textureReveal.current, phase, delta)
        const textureAmount = textureReveal.current

        // Camera yaw/pitch → screen-space cloud drift. Yaw is unwrapped so a full orbit never
        // snaps at ±180°. textureYawParallax / texturePitchParallax (signed) are the tunable
        // gains: flip a sign to reverse that axis; values below the ~px-per-radian for a 1:1
        // lock (~1375) make the clouds lag the stars so it reads as depth.
        // Gains are CSS px/radian; ×dpr converts to device px (matching gl_FragCoord) so the
        // drift is identical on every display instead of being weaker at higher dpr.
        const dpr = rootState.viewport.dpr
        const yawParallax = (params.textureYawParallax ?? 0) * dpr
        const pitchParallax = (params.texturePitchParallax ?? 0) * dpr
        rootState.camera.getWorldDirection(cameraForward)
        const yaw = Math.atan2(cameraForward.x, cameraForward.z)
        const pitch = Math.asin(Math.min(1, Math.max(-1, cameraForward.y)))
        const ps = panState.current
        if (ps.prevYaw === null) ps.prevYaw = yaw
        let dYaw = yaw - ps.prevYaw
        if (dYaw > Math.PI) dYaw -= Math.PI * 2
        else if (dYaw < -Math.PI) dYaw += Math.PI * 2
        ps.yawAccum += dYaw
        ps.prevYaw = yaw
        texturePan.set(-ps.yawAccum * yawParallax, pitch * pitchParallax)
        rootState.gl.getDrawingBufferSize(resolution)

        updateBackgroundMaterial(material, {
            refScale: getWorldLockScale(rootState),
            texturePan,
            resolution,
            time: rootState.clock.elapsedTime,
            ...params,
            gradientIntensity: (params.gradientIntensity ?? 1) * textureAmount,
            textureBrightness: (params.textureBrightness ?? params.colorIntensity ?? 0.4) * textureAmount,
            textureMixIntensity: params.textureMixIntensity ?? params.colorMixIntensity ?? 0.0,
            starBrightness: (params.starBrightness ?? 1.2) * textureAmount,
        })
    })

    return <mesh ref={meshRef} geometry={geometry} material={backgroundWireframe ? wireframeMaterial : material} />
}
