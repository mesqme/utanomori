import * as THREE from 'three'
import { mulberry32 } from './randomUtils.js'
import { generateChunkStones } from './stoneUtils.js'

const TREE_COUNT_MIN = 1
const TREE_COUNT_MAX = 2
const TREE_SCALE_MIN = 0.9
const TREE_SCALE_MAX = 1.1
const TREE_PADDING_FRACTION = 0.1
const TREE_RADIUS = 0.9
const TREE_ATTEMPTS = 12
const STONE_RADIUS_MULTIPLIER = 1.1

function buildStoneField(x, z, size, noise2D, stoneParameters, terrainParameters) {
    const capacity = 500
    const current = generateChunkStones(x, z, size, noise2D, stoneParameters, terrainParameters)
    const neighbors = []

    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) continue

            const neighborStones = generateChunkStones(x + dx, z + dz, size, noise2D, stoneParameters, terrainParameters, true, true).stones
            for (const s of neighborStones) {
                neighbors.push({ ...s, x: s.x + dx * size, z: s.z + dz * size })
            }
        }
    }

    return {
        instances: current.instances,
        stones: [...current.stones, ...neighbors],
        currentStones: current.stones,
        capacity,
    }
}

function buildTreeInstances(x, z, size, noise2D, terrainParameters, stoneField) {
    if (!noise2D) return []

    const seed = ((x * 73856093) ^ (z * 19349663) ^ 0x9e3779b9) >>> 0
    const rng = mulberry32(seed)
    const count = TREE_COUNT_MIN + Math.floor(rng() * (TREE_COUNT_MAX - TREE_COUNT_MIN + 1))
    const padding = size * TREE_PADDING_FRACTION
    const stones = stoneField?.stones ?? []
    const trees = []

    for (let i = 0; i < count; i++) {
        let placed = false
        for (let attempt = 0; attempt < TREE_ATTEMPTS && !placed; attempt++) {
            const localX = THREE.MathUtils.lerp(-size * 0.5 + padding, size * 0.5 - padding, rng())
            const localZ = THREE.MathUtils.lerp(-size * 0.5 + padding, size * 0.5 - padding, rng())

            const okStones = stones.every((s) => {
                const stoneRadius = Math.max(s.scaleX ?? 0, s.scaleZ ?? 0) * STONE_RADIUS_MULTIPLIER
                const dx = localX - s.x
                const dz = localZ - s.z
                return dx * dx + dz * dz > (stoneRadius + TREE_RADIUS) ** 2
            })
            if (!okStones) continue

            const okTrees = trees.every((t) => {
                const dx = localX - t.position[0]
                const dz = localZ - t.position[2]
                return dx * dx + dz * dz > (TREE_RADIUS * 2) ** 2
            })
            if (!okTrees) continue

            const worldX = localX + x * size
            const worldZ = localZ + z * size
            const y = noise2D(worldX * terrainParameters.scale, worldZ * terrainParameters.scale) * terrainParameters.amplitude

            trees.push({
                id: `${x}_${z}_${i}`,
                seed: rng(),
                position: [localX, y, localZ],
                rotation: [0, rng() * Math.PI * 2, 0],
                scale: THREE.MathUtils.lerp(TREE_SCALE_MIN, TREE_SCALE_MAX, rng()),
            })
            placed = true
        }
    }

    return trees
}

export function generateChunkData(x, z, size, noise2D, stoneParameters, terrainParameters) {
    const stoneField = buildStoneField(x, z, size, noise2D, stoneParameters, terrainParameters)
    const treeInstances = buildTreeInstances(x, z, size, noise2D, terrainParameters, stoneField)
    return { stoneField, treeInstances }
}
