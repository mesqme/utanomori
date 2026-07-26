import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import Grass from './Grass.jsx'
import { createRoadSampler } from './fields/roadField.js'

export default function TerrainChunk({ x, z, size, terrainMaterial, grassMaterial }) {
    const terrainSegments = useStore((s) => s.terrainParameters.segments)
    const grassEnabled = useStore((s) => s.grassParameters.enabled)
    const roadParameters = useStore((s) => s.roadParameters)

    // Flat plane; the subdivisions exist for the per-vertex aRoadDistance attribute
    // (the fragment shader interpolates it to draw the road).
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(size, size, terrainSegments, terrainSegments)
        const posAttribute = geo.attributes.position
        const roadDistances = new Float32Array(posAttribute.count)
        const chunkWorldX = x * size
        const chunkWorldZ = z * size
        const roadSampler = createRoadSampler(roadParameters)

        for (let i = 0; i < posAttribute.count; i++) {
            const worldX = posAttribute.getX(i) + chunkWorldX
            const worldZ = -posAttribute.getY(i) + chunkWorldZ
            const roadDistance = roadSampler.sampleDistance(worldX, worldZ)
            roadDistances[i] = Number.isFinite(roadDistance) ? roadDistance : 100000
        }
        geo.setAttribute('aRoadDistance', new THREE.BufferAttribute(roadDistances, 1))
        return geo
    }, [size, x, z, terrainSegments, roadParameters])

    useEffect(() => () => geometry.dispose(), [geometry])

    return (
        <group position={[x * size, 0, z * size]}>
            <mesh geometry={geometry} material={terrainMaterial} rotation-x={-Math.PI / 2} />
            {grassEnabled && (
                <Grass
                    size={size}
                    chunkX={x * size}
                    chunkZ={z * size}
                    chunkIndexX={x}
                    chunkIndexZ={z}
                    grassMaterial={grassMaterial}
                />
            )}
        </group>
    )
}
