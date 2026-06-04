import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

import { generateWindLineInstances } from './utils/windUtils.js'
import { sharedNoise2D } from './utils/worldNoise.js'

export default function WindChunk({
    chunkX,
    chunkZ,
    size,
    baseGeometry,
    windLineParameters,
    windDirection,
    terrainScale,
    terrainAmplitude,
    material,
}) {
    const windLines = useMemo(() => {
        const chunkLines = generateWindLineInstances(chunkX, chunkZ, size, windLineParameters)
        return chunkLines.map((line) => ({
            position: [line.position[0], line.position[1], line.position[2]],
            timeOffset: line.timeOffset ?? 0,
        }))
    }, [chunkX, chunkZ, size, windLineParameters])

    const mergedGeometry = useMemo(() => {
        if (!baseGeometry || windLines.length === 0) {
            return new THREE.BufferGeometry()
        }

        const basePosition = baseGeometry.attributes.position
        const baseUv = baseGeometry.attributes.uv
        const baseIndex = baseGeometry.index
        const basePositionArray = basePosition.array
        const baseUvArray = baseUv.array
        const baseIndexArray = baseIndex?.array
        const baseVertexCount = basePosition.count
        const baseIndexCount = baseIndex ? baseIndex.count : 0

        const totalVertexCount = baseVertexCount * windLines.length
        const totalIndexCount = baseIndex ? baseIndexCount * windLines.length : 0
        const positions = new Float32Array(totalVertexCount * 3)
        const uvs = new Float32Array(totalVertexCount * 2)
        const timeOffsets = new Float32Array(totalVertexCount)
        const indices = baseIndex ? new (totalVertexCount > 65535 ? Uint32Array : Uint16Array)(totalIndexCount) : null

        const angle = -Math.PI / 2 + (windDirection ?? 0)
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const chunkWorldX = chunkX * size
        const chunkWorldZ = chunkZ * size
        const noiseScale = terrainScale
        const noiseAmplitude = terrainAmplitude

        const rotatedBase = new Float32Array(baseVertexCount * 3)
        for (let v = 0; v < baseVertexCount; v++) {
            const baseIndex3 = v * 3
            const x = basePositionArray[baseIndex3]
            const y = basePositionArray[baseIndex3 + 1]
            const z = basePositionArray[baseIndex3 + 2]
            rotatedBase[baseIndex3] = x * cos - z * sin
            rotatedBase[baseIndex3 + 1] = y
            rotatedBase[baseIndex3 + 2] = x * sin + z * cos
        }

        for (let i = 0; i < windLines.length; i++) {
            const [offsetX, offsetY, offsetZ] = windLines[i].position
            const timeOffset = windLines[i].timeOffset
            const vertexOffset = i * baseVertexCount
            const indexOffset = i * baseIndexCount

            for (let v = 0; v < baseVertexCount; v++) {
                const baseIndex3 = v * 3
                const localX = rotatedBase[baseIndex3] + offsetX
                const localY = rotatedBase[baseIndex3 + 1] + offsetY
                const localZ = rotatedBase[baseIndex3 + 2] + offsetZ
                const worldX = localX + chunkWorldX
                const worldZ = localZ + chunkWorldZ
                const yOffset = sharedNoise2D(worldX * noiseScale, worldZ * noiseScale) * noiseAmplitude

                const posIndex = (vertexOffset + v) * 3
                positions[posIndex] = localX
                positions[posIndex + 1] = localY + yOffset
                positions[posIndex + 2] = localZ
            }

            uvs.set(baseUvArray, vertexOffset * 2)
            timeOffsets.fill(timeOffset, vertexOffset, vertexOffset + baseVertexCount)

            if (indices) {
                for (let j = 0; j < baseIndexCount; j++) {
                    indices[indexOffset + j] = baseIndexArray[j] + vertexOffset
                }
            }
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        geometry.setAttribute('aTimeOffset', new THREE.BufferAttribute(timeOffsets, 1))
        if (indices) {
            geometry.setIndex(new THREE.BufferAttribute(indices, 1))
        }
        return geometry
    }, [windLines, baseGeometry, windDirection, terrainScale, terrainAmplitude])

    useEffect(() => {
        return () => {
            mergedGeometry.dispose()
        }
    }, [mergedGeometry])

    return <mesh geometry={mergedGeometry} material={material} frustumCulled={false} dispose={null} />
}
