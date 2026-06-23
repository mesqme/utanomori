import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'

import useStore from '../stores/useStore.jsx'
import usePhases from '../stores/usePhases.jsx'
import { createBackgroundMaterial, updateBackgroundMaterial } from '../materials/BackgroundMaterial.js'
import { getWorldLockScale } from './utils/screenScale.js'
import { screenPainteryUniforms, updateScreenPaintery } from './utils/screenPaintery.js'
import { updatePhaseTextureReveal } from '../game/visualReveal.js'
import watercolorBasicUrl from '../assets/textures/watercolorBasicLarge.png'

export default function BackgroundSphere() {
    const meshRef = useRef()
    const rotationAngle = useRef(0)
    const textureReveal = useRef(0)
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

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

        // Drift the screen-space paintery with the camera — shared by every paintery overlay
        // (background + terrain/grass/props), so they all pan together and stay DPR/resize stable.
        updateScreenPaintery(rootState, params.textureYawParallax ?? 0, params.texturePitchParallax ?? 0)

        updateBackgroundMaterial(material, {
            refScale: getWorldLockScale(rootState),
            texturePan: screenPainteryUniforms.uTexturePan.value,
            resolution: screenPainteryUniforms.uPainteryResolution.value,
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
