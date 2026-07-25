import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { mulberry32 } from './utils/randomUtils.js'
import { createGrassPatchSampler } from './utils/grassPatchField.js'
import { createRoadSampler } from './utils/roadField.js'
import { createObjectFieldSampler } from './utils/objectField.js'

export default function Grass({ size, chunkX, chunkZ, chunkIndexX, chunkIndexZ, grassMaterial }) {
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
        // NOTE: the tint COLOURS (and grassParameters.colorBase) are deliberately not here — the
        // bake stores only each blade's tint FAMILY + tone; the colours are shader uniforms, so
        // recolouring the grass (day/night themes, Leva drags) never rebuilds the field.
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
        objectParameters.mushroomSize,
        objectParameters.grassFadeDistance,
        objectParameters.grassLean,
        objectParameters.mushroomGrassRadius,
        objectParameters.mushroomGrassFade,
        objectParameters.mushroomGrassLean,
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
        const patchData = new Float32Array(grassParameters.count * 3)
        // Per-blade colour SELECTORS (tint family 0..3 + tone) — the actual colours are uniforms
        // (uGrassBaseColor / uGrassTint*), so recolouring the field never rebuilds these attributes.
        const patchColorData = new Float32Array(grassParameters.count * 2)
        const roadMasks = new Float32Array(grassParameters.count)
        const objectSuppress = new Float32Array(grassParameters.count)
        const objectLean = new Float32Array(grassParameters.count * 2)
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
            patchSampler.sample(worldX, worldZ, patch)
            // Stones / trees: hard no-grass within the safe radius, then a fade band where
            // grass shortens (suppress) and leans away (lean). Roads keep their own mask.
            const objectField = objectSampler.sampleObjectField(worldX, worldZ)
            const roadMask = roadSampler.sampleMask(worldX, worldZ)

            positions[i * 3] = x
            positions[i * 3 + 1] = 0
            positions[i * 3 + 2] = z
            patchCenters[i * 2] = patch.centerX
            patchCenters[i * 2 + 1] = patch.centerZ
            patchData[i * 3] = patch.heightMultiplier
            patchData[i * 3 + 1] = patch.widthMultiplier
            patchData[i * 3 + 2] = patch.leanStrength
            const tone = 0.9 + patch.colorMix * 0.2
            patchColorData[i * 2] = patch.colorFamily // which uGrassTint* this blade blends toward
            patchColorData[i * 2 + 1] = tone
            roadMasks[i] = roadMask
            objectSuppress[i] = objectField.suppress
            objectLean[i * 2] = objectField.leanX
            objectLean[i * 2 + 1] = objectField.leanZ
        }

        grassGeometry.setAttribute('aInstancePosition', new THREE.InstancedBufferAttribute(positions, 3))
        grassGeometry.setAttribute('aPatchCenter', new THREE.InstancedBufferAttribute(patchCenters, 2))
        grassGeometry.setAttribute('aPatchData', new THREE.InstancedBufferAttribute(patchData, 3))
        grassGeometry.setAttribute('aPatchColorData', new THREE.InstancedBufferAttribute(patchColorData, 2))
        grassGeometry.setAttribute('aRoadMask', new THREE.InstancedBufferAttribute(roadMasks, 1))
        grassGeometry.setAttribute('aObjectSuppress', new THREE.InstancedBufferAttribute(objectSuppress, 1))
        grassGeometry.setAttribute('aObjectLean', new THREE.InstancedBufferAttribute(objectLean, 2))

        return grassGeometry
    }, [grassParameters.segmentsCount, grassParameters.count, patchGenerationKey, roadGenerationKey, objectGenerationKey, size, chunkX, chunkZ, chunkIndexX, chunkIndexZ])

    useEffect(() => {
        return () => {
            grassGeometry.dispose()
        }
    }, [grassGeometry])

    return <mesh geometry={grassGeometry} material={grassMaterial} />
}
