import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'

import useStore from '../stores/useStore.jsx'
import { createBackgroundMaterial, updateBackgroundMaterial } from '../materials/BackgroundMaterial.js'
import { getRefScale } from './utils/screenScale.js'
import paintaryAlpha01Url from '../assets/textures/paintaryAlpha_01.png'

export default function BackgroundSphere({ color }) {
    const meshRef = useRef()
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

    const painteryTexture = useTexture(paintaryAlpha01Url)
    useMemo(() => {
        painteryTexture.wrapS = THREE.RepeatWrapping
        painteryTexture.wrapT = THREE.RepeatWrapping
        painteryTexture.colorSpace = THREE.NoColorSpace
        painteryTexture.needsUpdate = true
    }, [painteryTexture])

    const geometry = useMemo(() => new THREE.SphereGeometry(50, 32, 24), [])
    const material = useMemo(() => createBackgroundMaterial(painteryTexture), [painteryTexture])
    const wireframeMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 'red', side: THREE.BackSide, wireframe: true }), [])

    useEffect(() => {
        return () => {
            geometry.dispose()
            material.dispose()
            wireframeMaterial.dispose()
        }
    }, [geometry, material, wireframeMaterial])

    useFrame((rootState) => {
        const store = useStore.getState()
        meshRef.current.position.copy(store.ballPosition)
        updateBackgroundMaterial(material, {
            refScale: getRefScale(rootState),
            time: rootState.clock.elapsedTime,
            color,
            ...store.backgroundParameters,
        })
    })

    return <mesh ref={meshRef} geometry={geometry} material={backgroundWireframe ? wireframeMaterial : material} />
}
