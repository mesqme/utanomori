import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import terrainVertexShader from '../shaders/terrain/vertex.glsl'
import terrainFragmentShader from '../shaders/terrain/fragment.glsl'
import useStore from '../stores/useStore.jsx'

export default function useTerrainMaterial({
    chunkSize,
    initialCircleRadius,
    noiseTexture,
    groundTexture,
}) {
    const terrainColor = useStore((s) => s.terrainParameters.color)
    const groundTextureScale = useStore((s) => s.terrainParameters.groundTextureScale)
    const groundTextureContrast = useStore((s) => s.terrainParameters.groundTextureContrast)
    const borderNoiseStrength = useStore((s) => s.borderParameters.noiseStrength)
    const borderNoiseScale = useStore((s) => s.borderParameters.noiseScale)
    const borderGroundOffset = useStore((s) => s.borderParameters.groundOffset)
    const borderGroundFadeOffset = useStore((s) => s.borderParameters.groundFadeOffset)
    const pixelSize = useStore((s) => s.ditheringParameters.pixelSize)
    const ditherModeValue = useStore((s) => (s.ditheringParameters.ditherMode === 'Bayer' ? 1 : 0))

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uBaseColor: { value: new THREE.Color(terrainColor) },
                uCircleCenter: { value: new THREE.Vector3() },
                uPatchSize: { value: chunkSize },
                uCircleRadiusFactor: { value: initialCircleRadius },
                uGroundOffset: { value: borderGroundOffset },
                uGroundFadeOffset: { value: borderGroundFadeOffset },
                uNoiseTexture: { value: noiseTexture },
                uNoiseStrength: { value: borderNoiseStrength },
                uNoiseScale: { value: borderNoiseScale },
                uGroundTexture: { value: groundTexture },
                uGroundTextureScale: { value: groundTextureScale },
                uGroundTextureContrast: { value: groundTextureContrast },
                uPixelSize: { value: pixelSize },
                uDitherMode: { value: ditherModeValue }, // 0: Diamond, 1: Bayer
            },
            vertexShader: terrainVertexShader,
            fragmentShader: terrainFragmentShader,
        })
    }, [])

    useEffect(() => {
        const u = material.uniforms
        u.uBaseColor.value.set(terrainColor)
        u.uPatchSize.value = chunkSize
        u.uGroundOffset.value = borderGroundOffset
        u.uGroundFadeOffset.value = borderGroundFadeOffset
        u.uNoiseTexture.value = noiseTexture
        u.uNoiseStrength.value = borderNoiseStrength
        u.uNoiseScale.value = borderNoiseScale
        u.uGroundTexture.value = groundTexture
        u.uGroundTextureScale.value = groundTextureScale
        u.uGroundTextureContrast.value = groundTextureContrast
        u.uPixelSize.value = pixelSize
        u.uDitherMode.value = ditherModeValue
    }, [
        material,
        terrainColor,
        chunkSize,
        borderGroundOffset,
        borderGroundFadeOffset,
        noiseTexture,
        borderNoiseStrength,
        borderNoiseScale,
        groundTexture,
        groundTextureScale,
        groundTextureContrast,
        pixelSize,
        ditherModeValue,
    ])

    useEffect(() => {
        return () => {
            material.dispose()
        }
    }, [material])

    return material
}
