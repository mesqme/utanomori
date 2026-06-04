import * as THREE from 'three'
import { mulberry32 } from './randomUtils.js'

export function smoothstep(edge0, edge1, x) {
    const e0 = edge0
    const e1 = edge1
    const denom = Math.max(1e-8, e1 - e0)
    let t = (x - e0) / denom
    t = Math.max(0, Math.min(1, t))
    return t * t * (3 - 2 * t)
}

// Global cache for stone placements
// We cache the "candidates" (positions/seeds) so we don't re-run the expensive grid search + noise for every neighbor query.
const placementCache = new Map()
let lastPlacementSettings = ''

function getCachedPlacements(chunkX, chunkZ, size, noise2D, stoneParameters) {
    // Parameters that affect the *selection* of stones
    // Note: We don't include visual params like scale/color/yOffset here, only placement logic.
    const maxCount = Math.max(0, Math.floor(stoneParameters.count))
    if (maxCount === 0) return []

    // Create a signature for parameters that affect placement
    const settings = {
        seedPrefix: 'v1',
        count: maxCount,
        noiseScale: stoneParameters.noiseScale,
        noiseThreshold: stoneParameters.noiseThreshold,
        size: size,
    }

    const settingsHash = JSON.stringify(settings)
    if (settingsHash !== lastPlacementSettings) {
        placementCache.clear()
        lastPlacementSettings = settingsHash
    }

    const key = `${chunkX},${chunkZ}`
    if (placementCache.has(key)) {
        return placementCache.get(key)
    }

    // --- Generation Logic (Copied/Refactored from original) ---
    const chunkWorldX = chunkX * size
    const chunkWorldZ = chunkZ * size

    // Stability Fix: Ensure noise generator is available
    if (!noise2D) return []

    const minCells = Math.ceil(Math.sqrt(maxCount * 2.5))
    const cells = Math.max(8, minCells)
    const cellSize = size / cells

    const candidates = []

    for (let ix = 0; ix < cells; ix++) {
        for (let iz = 0; iz < cells; iz++) {
            const seed = ((chunkX * 73856093) ^ (chunkZ * 19349663) ^ (ix * 83492791) ^ (iz * 2971215073)) >>> 0
            const rng = mulberry32(seed)

            const cx = -size * 0.5 + (ix + 0.5) * cellSize
            const cz = -size * 0.5 + (iz + 0.5) * cellSize

            // Local position within the chunk
            const localX = cx + (rng() - 0.5) * cellSize * 0.85
            const localZ = cz + (rng() - 0.5) * cellSize * 0.85

            const worldX = localX + chunkWorldX
            const worldZ = localZ + chunkWorldZ

            const n = noise2D(worldX * stoneParameters.noiseScale, worldZ * stoneParameters.noiseScale)
            const n01 = (n + 1) * 0.5
            if (n01 < stoneParameters.noiseThreshold) continue

            const score = n01 + rng() * 0.2

            candidates.push({
                score,
                localX,
                localZ,
                seed,
            })
        }
    }

    candidates.sort((a, b) => b.score - a.score)
    const chosen = candidates.slice(0, maxCount)

    placementCache.set(key, chosen)
    return chosen
}

// Deterministically generate stones for a single chunk
export function generateChunkStones(
    chunkX, // index
    chunkZ, // index
    size,
    noise2D,
    stoneParameters,
    terrainParameters,
    skipMatrices = false,
    minimalData = false // New flag: skip expensive noise/y calculations if we only need x/z/scale
) {
    // Return minimal structure if invalid
    if (!stoneParameters.enabled || !noise2D) return { instances: [], stones: [] }

    // 1. Get Placements (Cached)
    const chosen = getCachedPlacements(chunkX, chunkZ, size, noise2D, stoneParameters)
    if (!chosen || chosen.length === 0) return { instances: [], stones: [] }

    const chunkWorldX = chunkX * size
    const chunkWorldZ = chunkZ * size

    const instances = []
    const stones = []
    const dummy = new THREE.Object3D()

    for (const c of chosen) {
        const rng = mulberry32(c.seed ^ 0x1234567)

        const worldX = c.localX + chunkWorldX
        const worldZ = c.localZ + chunkWorldZ

        // Optimization: For grass suppression (minimalData), we don't need Y height.
        // Skipping noise2D saves significant CPU when generating 8 neighbors.
        const y = minimalData ? 0 : noise2D(worldX * terrainParameters.scale, worldZ * terrainParameters.scale) * terrainParameters.amplitude

        const baseScale = THREE.MathUtils.lerp(stoneParameters.minScale, stoneParameters.maxScale, rng())
        const yScale = baseScale * THREE.MathUtils.lerp(0.55, 0.95, rng())

        const centerY = y + stoneParameters.yOffset + yScale * 0.25

        // Visual Improvements:
        // 1. Random Y rotation
        const rotY = rng() * Math.PI * 2
        // 2. Slight random tilt on X and Z
        const rotX = (rng() - 0.5) * 0.5
        const rotZ = (rng() - 0.5) * 0.5

        // 3. Non-uniform footprint
        const scaleX = baseScale * (0.8 + rng() * 0.4)
        const scaleZ = baseScale * (0.8 + rng() * 0.4)

        if (!skipMatrices && !minimalData) {
            dummy.position.set(c.localX, centerY, c.localZ)
            dummy.rotation.set(rotX, rotY, rotZ)
            dummy.scale.set(scaleX, yScale, scaleZ)
            dummy.updateMatrix()
            instances.push({ matrix: dummy.matrix.clone() })
        }

        // Store stone data.
        if (minimalData) {
            // For grass/neighbors, we only need footprint info
            stones.push({
                x: c.localX,
                z: c.localZ,
                scaleX,
                scaleZ,
                // y, rotX, rotY, rotZ not needed for grass
            })
        } else {
            stones.push({
                x: c.localX,
                y: centerY,
                z: c.localZ,
                scaleX,
                scaleY: yScale,
                scaleZ,
                rotX,
                rotY,
                rotZ,
            })
        }
    }

    return { instances, stones }
}
