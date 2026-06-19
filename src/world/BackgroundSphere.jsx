import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { createBackgroundMaterial, updateBackgroundMaterial } from '../materials/BackgroundMaterial.js'
import { getRefScale } from './utils/screenScale.js'
import { GAMEPLAY_ENTRY_DURATION } from '../game/gameConfig.js'
import watercolorBasicUrl from '../assets/textures/watercolorBasicLarge.png'

export default function BackgroundSphere({ color }) {
    const meshRef = useRef()
    const rotationAngle = useRef(0)
    const colorFade = useRef(0) // texture colour-intensity ramps 0 → 1 once gameplay starts
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
        // Follow the same smoothed point as the terrain centre and camera target, so the
        // sky stays locked to the ground instead of snapping to the raw character position.
        meshRef.current.position.copy(store.smoothedCircleCenter)
        // Optional slow spin around Y carries the stars across the sky.
        if (params.rotationEnabled) rotationAngle.current += (params.rotationSpeed ?? 0) * delta
        meshRef.current.rotation.y = rotationAngle.current

        // Texture colour intensity starts at 0 (loading / warmup / intro dialogue) and
        // fades up to its full value once the dialogue ends and the camera moves into the
        // gameplay position; it then holds (incl. credits) until a fresh cycle resets it.
        const phase = usePhases.getState().phase
        const beforeGameplay = phase === PHASES.loading || phase === PHASES.warmup || phase === PHASES.intro
        colorFade.current = beforeGameplay ? 0 : Math.min(1, colorFade.current + delta / GAMEPLAY_ENTRY_DURATION)

        updateBackgroundMaterial(material, {
            refScale: getRefScale(rootState),
            time: rootState.clock.elapsedTime,
            color,
            ...params,
            colorIntensity: (params.colorIntensity ?? 0.4) * colorFade.current,
        })
    })

    return <mesh ref={meshRef} geometry={geometry} material={backgroundWireframe ? wireframeMaterial : material} />
}
