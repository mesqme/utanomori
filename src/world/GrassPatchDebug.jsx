import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { createGrassPatchSampler } from './utils/grassPatchField.js'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'

export default function GrassPatchDebug({ chunkX, chunkZ, size, noise2D, scale, amplitude }) {
    const grassPatchParameters = useStore((state) => state.grassPatchParameters)

    const geometry = useMemo(() => {
        const result = new THREE.BufferGeometry()
        if (!grassPatchParameters.debugCenters) return result

        const halfSize = size * 0.5
        const cells = createGrassPatchSampler(grassPatchParameters).getCellsInBounds(chunkX - halfSize, chunkX + halfSize, chunkZ - halfSize, chunkZ + halfSize)
        const positions = new Float32Array(cells.length * 3)
        const colors = new Float32Array(cells.length * 3)
        const debugPalette = soundJourneyPalette.grassPatchDebugColors.map((value) => new THREE.Color(value))

        cells.forEach((cell, index) => {
            const localX = cell.centerX - chunkX
            const localZ = cell.centerZ - chunkZ
            const y = (noise2D ? noise2D(cell.centerX * scale, cell.centerZ * scale) * amplitude : 0) + 0.15
            positions.set([localX, y, localZ], index * 3)
            const color = debugPalette[cell.colorFamily]
            colors.set([color.r, color.g, color.b], index * 3)
        })

        result.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        result.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        return result
    }, [grassPatchParameters, chunkX, chunkZ, size, noise2D, scale, amplitude])

    const material = useMemo(
        () =>
            new THREE.PointsMaterial({
                size: 12,
                sizeAttenuation: false,
                vertexColors: true,
                depthTest: false,
            }),
        []
    )

    useEffect(() => () => geometry.dispose(), [geometry])
    useEffect(() => () => material.dispose(), [material])

    if (!grassPatchParameters.debugCenters) return null
    return <points geometry={geometry} material={material} renderOrder={10} />
}
