import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'

import useStore from '../stores/useStore.jsx'
import { createBackgroundMaterial, updateBackgroundMaterial } from '../materials/BackgroundMaterial.js'
import { getRefScale } from './utils/screenScale.js'
import watercolorBasicUrl from '../assets/textures/watercolorBasicLarge.png'

export default function BackgroundSphere({ color }) {
    const meshRef = useRef()
    const rotationAngle = useRef(0)
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
        updateBackgroundMaterial(material, {
            refScale: getRefScale(rootState),
            time: rootState.clock.elapsedTime,
            color,
            ...params,
        })
    })

    return <mesh ref={meshRef} geometry={geometry} material={backgroundWireframe ? wireframeMaterial : material} />
}
