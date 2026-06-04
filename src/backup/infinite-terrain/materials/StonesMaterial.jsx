import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import stonesVertexShader from '../shaders/stones/vertex.glsl'
import stonesFragmentShader from '../shaders/stones/fragment.glsl'
import useStore from '../stores/useStore.jsx'

export default function useStonesMaterial({
    chunkSize,
    initialCircleRadius,
    noiseTexture,
}) {
    const stoneColor = useStore((s) => s.stoneParameters.color)
    const borderNoiseStrength = useStore((s) => s.borderParameters.noiseStrength)
    const borderNoiseScale = useStore((s) => s.borderParameters.noiseScale)
    const borderGrassFadeOffset = useStore((s) => s.borderParameters.grassFadeOffset)
    const pixelSize = useStore((s) => s.ditheringParameters.pixelSize)
    const ditherModeValue = useStore((s) => (s.ditheringParameters.ditherMode === 'Bayer' ? 1 : 0))

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uPixelSize: { value: pixelSize },
                uDitherMode: { value: ditherModeValue }, // 0: Diamond, 1: Bayer

                uStoneColor: { value: new THREE.Color(stoneColor) },

                // Border fade (match grass)
                uCircleCenter: { value: new THREE.Vector3() },
                uChunkSize: { value: chunkSize },
                uNoiseTexture: { value: noiseTexture },
                uNoiseStrength: { value: borderNoiseStrength },
                uNoiseScale: { value: borderNoiseScale },
                uCircleRadiusFactor: { value: initialCircleRadius },
                uGrassFadeOffset: { value: borderGrassFadeOffset },
            },
            vertexShader: stonesVertexShader,
            fragmentShader: stonesFragmentShader,
            vertexColors: false,
            side: THREE.FrontSide,
        })
    }, [])

    useEffect(() => {
        const u = material.uniforms
        u.uPixelSize.value = pixelSize
        u.uDitherMode.value = ditherModeValue
        u.uStoneColor.value.set(stoneColor)
        u.uChunkSize.value = chunkSize
        u.uNoiseTexture.value = noiseTexture
        u.uNoiseStrength.value = borderNoiseStrength
        u.uNoiseScale.value = borderNoiseScale
        u.uGrassFadeOffset.value = borderGrassFadeOffset
    }, [
        material,
        stoneColor,
        chunkSize,
        noiseTexture,
        borderNoiseStrength,
        borderNoiseScale,
        borderGrassFadeOffset,
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
