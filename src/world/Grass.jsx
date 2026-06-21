import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { mulberry32 } from './utils/randomUtils.js'
import { createGrassPatchSampler } from './utils/grassPatchField.js'
import { createRoadSampler } from './utils/roadField.js'
import { createObjectFieldSampler } from './utils/objectField.js'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'

export default function Grass({ size, chunkX, chunkZ, chunkIndexX, chunkIndexZ, noise2D, scale, amplitude, grassMaterial }) {
    const grassParameters = useStore((s) => s.grassParameters)
    const grassPatchParameters = useStore((s) => s.grassPatchParameters)
    const roadParameters = useStore((s) => s.roadParameters)
    const objectParameters = useStore((s) => s.objectParameters)
    const patchGenerationKey = [
        grassPatchParameters.worldSeed,
        grassPatchParameters.spacing,
        grassPatchParameters.jitter,
        grassPatchParameters.domainWarpScale,
        grassPatchParameters.domainWarpStrength,
        grassPatchParameters.patchHeightVariation,
        grassPatchParameters.patchWidthVariation,
        grassPatchParameters.patchColorVariation,
        grassPatchParameters.internalNoiseScale,
        grassPatchParameters.internalHeightVariation,
        grassPatchParameters.internalWidthVariation,
        grassPatchParameters.internalColorVariation,
        grassPatchParameters.internalLeanVariation,
        grassPatchParameters.radialLeanStrength,
        grassPatchParameters.borderWidth,
        grassPatchParameters.borderMinScale,
        grassPatchParameters.tintColorCyan,
        grassPatchParameters.tintColorViolet,
        grassPatchParameters.tintColorYellow,
        grassPatchParameters.tintColorGreen,
    ].join('|')
    const roadGenerationKey = [
        roadParameters.enabled,
        roadParameters.worldSeed,
        roadParameters.laneSpacing,
        roadParameters.nodeSpacing,
        roadParameters.meanderStrength,
        roadParameters.width,
        roadParameters.softness,
    ].join('|')
    const objectGenerationKey = [
        objectParameters.enabled,
        objectParameters.worldSeed,
        objectParameters.cellSize,
        objectParameters.groupJitter,
        objectParameters.density,
        objectParameters.roadClearance,
        objectParameters.groupScale,
        objectParameters.minObjectSpacing,
        objectParameters.treeSize,
        objectParameters.stoneSize,
        objectParameters.grassFadeDistance,
        objectParameters.grassLean,
    ].join('|')

    const grassGeometry = useMemo(() => {
        const vertexNumber = (grassParameters.segmentsCount + 1) * 2
        const indices = []

        for (let i = 0; i < grassParameters.segmentsCount; ++i) {
            const vi = i * 2
            indices[i * 12] = vi
            indices[i * 12 + 1] = vi + 1
            indices[i * 12 + 2] = vi + 2

            indices[i * 12 + 3] = vi + 2
            indices[i * 12 + 4] = vi + 1
            indices[i * 12 + 5] = vi + 3

            const fi = vertexNumber + vi
            indices[i * 12 + 6] = fi + 2
            indices[i * 12 + 7] = fi + 1
            indices[i * 12 + 8] = fi

            indices[i * 12 + 9] = fi + 3
            indices[i * 12 + 10] = fi + 1
            indices[i * 12 + 11] = fi + 2
        }

        const grassGeometry = new THREE.InstancedBufferGeometry()
        grassGeometry.instanceCount = grassParameters.count
        grassGeometry.setIndex(indices)
        grassGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1 + size / 2)

        const positions = new Float32Array(grassParameters.count * 3)
        const patchCenters = new Float32Array(grassParameters.count * 2)
        const patchData = new Float32Array(grassParameters.count * 4)
        const patchColors = new Float32Array(grassParameters.count * 3)
        const patchDebugColors = new Float32Array(grassParameters.count * 3)
        const roadMasks = new Float32Array(grassParameters.count)
        const objectSuppress = new Float32Array(grassParameters.count)
        const objectLean = new Float32Array(grassParameters.count * 2)
        const baseColor = new THREE.Color(grassParameters.colorBase)
        const patchPalette = [
            grassPatchParameters.tintColorCyan,
            grassPatchParameters.tintColorViolet,
            grassPatchParameters.tintColorYellow,
            grassPatchParameters.tintColorGreen,
        ].map((value) => new THREE.Color(value))
        const debugPalette = soundJourneyPalette.grassPatchDebugColors.map((value) => new THREE.Color(value))
        const color = new THREE.Color()
        const debugColor = new THREE.Color()
        const patchSampler = createGrassPatchSampler(grassPatchParameters)
        const roadSampler = createRoadSampler(roadParameters)
        const objectSampler = createObjectFieldSampler(objectParameters, roadParameters)
        const rng = mulberry32((chunkIndexX * 73856093) ^ (chunkIndexZ * 19349663) ^ 0xdecafbad)
        const patch = {}

        for (let i = 0; i < grassParameters.count; i++) {
            const x = (rng() - 0.5) * size
            const z = (rng() - 0.5) * size

            const worldX = x + chunkX
            const worldZ = z + chunkZ
            const y = noise2D ? noise2D(worldX * scale, worldZ * scale) * amplitude : 0
            patchSampler.sample(worldX, worldZ, patch)
            // Stones / trees: hard no-grass within the safe radius, then a fade band where
            // grass shortens (suppress) and leans away (lean). Roads keep their own mask.
            const objectField = objectSampler.sampleObjectField(worldX, worldZ)
            const roadMask = roadSampler.sampleMask(worldX, worldZ)

            positions[i * 3] = x
            positions[i * 3 + 1] = y
            positions[i * 3 + 2] = z
            patchCenters[i * 2] = patch.centerX
            patchCenters[i * 2 + 1] = patch.centerZ
            patchData[i * 4] = patch.heightMultiplier
            patchData[i * 4 + 1] = patch.widthMultiplier
            patchData[i * 4 + 2] = patch.leanStrength
            patchData[i * 4 + 3] = patch.borderScale
            const paletteColor = patchPalette[patch.colorFamily]
            const colorStrength = 0.5 + grassPatchParameters.patchColorVariation * 0.5
            const tone = 0.9 + patch.colorMix * 0.2
            color.copy(baseColor).lerp(paletteColor, colorStrength).multiplyScalar(tone)
            patchColors[i * 3] = color.r
            patchColors[i * 3 + 1] = color.g
            patchColors[i * 3 + 2] = color.b
            debugColor.copy(debugPalette[patch.colorFamily]).multiplyScalar(tone)
            patchDebugColors[i * 3] = debugColor.r
            patchDebugColors[i * 3 + 1] = debugColor.g
            patchDebugColors[i * 3 + 2] = debugColor.b
            roadMasks[i] = roadMask
            objectSuppress[i] = objectField.suppress
            objectLean[i * 2] = objectField.leanX
            objectLean[i * 2 + 1] = objectField.leanZ
        }

        grassGeometry.setAttribute('aInstancePosition', new THREE.InstancedBufferAttribute(positions, 3))
        grassGeometry.setAttribute('aPatchCenter', new THREE.InstancedBufferAttribute(patchCenters, 2))
        grassGeometry.setAttribute('aPatchData', new THREE.InstancedBufferAttribute(patchData, 4))
        grassGeometry.setAttribute('aPatchColor', new THREE.InstancedBufferAttribute(patchColors, 3))
        grassGeometry.setAttribute('aPatchDebugColor', new THREE.InstancedBufferAttribute(patchDebugColors, 3))
        grassGeometry.setAttribute('aRoadMask', new THREE.InstancedBufferAttribute(roadMasks, 1))
        grassGeometry.setAttribute('aObjectSuppress', new THREE.InstancedBufferAttribute(objectSuppress, 1))
        grassGeometry.setAttribute('aObjectLean', new THREE.InstancedBufferAttribute(objectLean, 2))

        return grassGeometry
    }, [grassParameters.segmentsCount, grassParameters.count, grassParameters.colorBase, patchGenerationKey, roadGenerationKey, objectGenerationKey, size, chunkX, chunkZ, chunkIndexX, chunkIndexZ, noise2D, scale, amplitude])

    useEffect(() => {
        return () => {
            grassGeometry.dispose()
        }
    }, [grassGeometry])

    return <mesh geometry={grassGeometry} material={grassMaterial} />
}
