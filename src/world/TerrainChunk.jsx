import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import Grass from './Grass.jsx'
import GrassPatchDebug from './GrassPatchDebug.jsx'

export default function TerrainChunk({ x, z, size, noise2D, terrainMaterial, grassMaterial }) {
    const terrainParameters = useStore((s) => s.terrainParameters)
    const terrainScale = terrainParameters.scale
    const terrainAmplitude = terrainParameters.amplitude
    const terrainSegments = terrainParameters.segments

    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(size, size, terrainSegments, terrainSegments)
        const posAttribute = geo.attributes.position
        const chunkWorldX = x * size
        const chunkWorldZ = z * size

        for (let i = 0; i < posAttribute.count; i++) {
            const worldX = posAttribute.getX(i) + chunkWorldX
            const worldZ = -posAttribute.getY(i) + chunkWorldZ
            posAttribute.setZ(i, noise2D(worldX * terrainScale, worldZ * terrainScale) * terrainAmplitude)
        }
        return geo
    }, [noise2D, size, x, z, terrainScale, terrainAmplitude, terrainSegments])

    useEffect(() => () => geometry.dispose(), [geometry])

    return (
        <group position={[x * size, 0, z * size]}>
            <mesh geometry={geometry} material={terrainMaterial} rotation-x={-Math.PI / 2} />
            <Grass
                size={size}
                chunkX={x * size}
                chunkZ={z * size}
                chunkIndexX={x}
                chunkIndexZ={z}
                noise2D={noise2D}
                scale={terrainScale}
                amplitude={terrainAmplitude}
                grassMaterial={grassMaterial}
            />
            <GrassPatchDebug chunkX={x * size} chunkZ={z * size} size={size} noise2D={noise2D} scale={terrainScale} amplitude={terrainAmplitude} />
        </group>
    )
}
