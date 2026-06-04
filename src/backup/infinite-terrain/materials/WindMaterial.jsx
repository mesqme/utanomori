import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import windLineVertexShader from '../shaders/wind/vertex.glsl'
import windLineFragmentShader from '../shaders/wind/fragment.glsl'
import useStore from '../stores/useStore.jsx'

export default function useWindMaterial({ chunkSize, initialCircleRadius, noiseTexture }) {
    const borderParameters = useStore((s) => s.borderParameters)
    const ditheringParameters = useStore((s) => s.ditheringParameters)
    const windParameters = useStore((s) => s.windParameters)
    const windLineParameters = useStore((s) => s.windLineParameters)
    const ditherModeValue = ditheringParameters.ditherMode === 'Bayer' ? 1 : 0

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: windLineVertexShader,
            fragmentShader: windLineFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uTimeMultiplier: { value: 0.1 },
                uAlphaMultiplier: { value: 0.5 },
                uStrength: { value: 1.0 },
                uSpeed: { value: 1.0 },
                uLengthMultiplier: { value: 1.0 },
                uRange: { value: 4.0 },
                uCircleCenter: { value: new THREE.Vector3() },
                uTrailPatchSize: { value: chunkSize },
                uCircleRadiusFactor: { value: initialCircleRadius },
                uGroundOffset: { value: borderParameters.groundOffset },
                uGroundFadeOffset: { value: borderParameters.groundFadeOffset },
                uNoiseTexture: { value: noiseTexture },
                uNoiseStrength: { value: borderParameters.noiseStrength },
                uNoiseScale: { value: borderParameters.noiseScale },
                uPixelSize: { value: ditheringParameters.pixelSize },
                uDitherMode: { value: ditherModeValue },
            },
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        })
    }, [])

    useEffect(() => {
        const u = material.uniforms
        u.uTrailPatchSize.value = chunkSize
        u.uGroundOffset.value = borderParameters.groundOffset
        u.uGroundFadeOffset.value = borderParameters.groundFadeOffset
        u.uNoiseTexture.value = noiseTexture
        u.uNoiseStrength.value = borderParameters.noiseStrength
        u.uNoiseScale.value = borderParameters.noiseScale
        u.uTimeMultiplier.value = windLineParameters.timeMultiplier
        u.uAlphaMultiplier.value = windLineParameters.alphaMultiplier
        u.uLengthMultiplier.value = windLineParameters.lengthMultiplier
        u.uStrength.value = windParameters.strength
        u.uSpeed.value = windParameters.speed
        u.uPixelSize.value = ditheringParameters.pixelSize
        u.uDitherMode.value = ditherModeValue
    }, [
        material,
        chunkSize,
        borderParameters.groundOffset,
        borderParameters.groundFadeOffset,
        noiseTexture,
        borderParameters.noiseStrength,
        borderParameters.noiseScale,
        windLineParameters.timeMultiplier,
        windLineParameters.alphaMultiplier,
        windLineParameters.lengthMultiplier,
        windParameters.strength,
        windParameters.speed,
        ditheringParameters.pixelSize,
        ditherModeValue,
    ])

    useEffect(() => {
        return () => {
            material.dispose()
        }
    }, [material])

    return material
}
