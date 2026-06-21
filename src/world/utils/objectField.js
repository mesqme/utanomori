import { mulberry32 } from './randomUtils.js'
import { sampleRoadDistance } from './roadField.js'
import { objectArchetypes, objectFieldDefaults, objectLibrary, STONE_VARIANTS } from '../../config/objectFieldDefaults.js'

const UINT_MAX = 4294967296

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function smoothstep(edge0, edge1, x) {
    const denom = Math.max(1e-6, edge1 - edge0)
    const t = clamp((x - edge0) / denom, 0, 1)
    return t * t * (3 - 2 * t)
}

function hashUint(a, b, seed) {
    let value = Math.imul(a | 0, 0x1f123bb5) ^ Math.imul(b | 0, 0x5f356495) ^ (seed | 0)
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
    return (value ^ (value >>> 16)) >>> 0
}

function hash01(a, b, seed) {
    return hashUint(a, b, seed) / UINT_MAX
}

function getSettings(parameters = {}, roadParameters = {}) {
    if (parameters.__objectFieldNormalized) return parameters

    return {
        __objectFieldNormalized: true,
        enabled: parameters.enabled ?? objectFieldDefaults.enabled,
        worldSeed: Math.floor(parameters.worldSeed ?? objectFieldDefaults.worldSeed),
        cellSize: Math.max(1, parameters.cellSize ?? objectFieldDefaults.cellSize),
        groupJitter: clamp(parameters.groupJitter ?? objectFieldDefaults.groupJitter, 0, 0.95),
        density: clamp(parameters.density ?? objectFieldDefaults.density, 0, 1),
        roadClearance: Math.max(0, parameters.roadClearance ?? objectFieldDefaults.roadClearance),
        groupScale: Math.max(0.1, parameters.groupScale ?? objectFieldDefaults.groupScale),
        minObjectSpacing: Math.max(0.05, parameters.minObjectSpacing ?? objectFieldDefaults.minObjectSpacing),
        treeSize: Math.max(0.1, parameters.treeSize ?? objectFieldDefaults.treeSize),
        stoneSize: Math.max(0.1, parameters.stoneSize ?? objectFieldDefaults.stoneSize),
        grassFadeDistance: Math.max(0, parameters.grassFadeDistance ?? objectFieldDefaults.grassFadeDistance),
        grassLean: Math.max(0, parameters.grassLean ?? objectFieldDefaults.grassLean),
        roadParameters,
    }
}

// Deterministic group cache. Groups can overhang chunk borders, so the same cell
// may be queried by several chunks / by grass; we generate it once and reuse it.
// Capped with FIFO eviction so an endless world doesn't grow it without bound —
// evicted cells regenerate deterministically on next query.
const groupCache = new Map()
const MAX_CACHED_CELLS = 4096
let cacheSignature = ''

function ensureCache(settings) {
    const signature = JSON.stringify({
        seed: settings.worldSeed,
        cellSize: settings.cellSize,
        jitter: settings.groupJitter,
        density: settings.density,
        roadClearance: settings.roadClearance,
        groupScale: settings.groupScale,
        spacing: settings.minObjectSpacing,
        treeSize: settings.treeSize,
        stoneSize: settings.stoneSize,
        road: settings.roadParameters,
    })

    if (signature !== cacheSignature) {
        groupCache.clear()
        cacheSignature = signature
    }
}

function pickWeighted(items, weightOf, rng) {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0)
    let threshold = rng() * total
    for (const item of items) {
        threshold -= weightOf(item)
        if (threshold <= 0) return item
    }
    return items[items.length - 1]
}

function pickType(mix, rng) {
    const entries = Object.entries(mix)
    return pickWeighted(entries, ([, weight]) => weight, rng)[0]
}

function buildCellGroup(cellX, cellZ, settings) {
    if (!settings.enabled) return null

    // Density gate — keeps ~density fraction of cells, giving an even-but-natural spread.
    if (hash01(cellX, cellZ, settings.worldSeed ^ 0x9e3779b9) > settings.density) return null

    const jitterX = (hash01(cellX, cellZ, settings.worldSeed ^ 0x1b56c4f9) - 0.5) * settings.groupJitter
    const jitterZ = (hash01(cellX, cellZ, settings.worldSeed ^ 0x7f4a7c15) - 0.5) * settings.groupJitter
    const anchorX = (cellX + 0.5 + jitterX) * settings.cellSize
    const anchorZ = (cellZ + 0.5 + jitterZ) * settings.cellSize

    // Objects avoid roads (cheaper than making roads bend around objects).
    if (settings.roadClearance > 0 && sampleRoadDistance(anchorX, anchorZ, settings.roadParameters) < settings.roadClearance) {
        return null
    }

    const seed = hashUint(cellX, cellZ, settings.worldSeed)
    const rng = mulberry32(seed ^ 0x51ed270b)
    const archetype = pickWeighted(objectArchetypes, (item) => item.weight, rng)
    const [minCount, maxCount] = archetype.count
    const targetCount = Math.round(minCount + rng() * (maxCount - minCount))
    const radius = archetype.radius * settings.groupScale

    // Per-instance road clearance: the group gate only checks the anchor, but
    // instances scatter up to `radius` away and could still land on a road.
    const roadEnabled = settings.roadParameters?.enabled
    const roadHalfWidth = roadEnabled ? Math.max(0.05, settings.roadParameters.width ?? 1.5) * 0.5 : 0

    const instances = []
    const maxAttempts = targetCount * 6
    let attempts = 0

    while (instances.length < targetCount && attempts < maxAttempts) {
        attempts++

        const type = pickType(archetype.mix, rng)
        const library = objectLibrary[type]
        const angle = rng() * Math.PI * 2
        const distance = Math.sqrt(rng()) * radius
        const localX = Math.cos(angle) * distance
        const localZ = Math.sin(angle) * distance
        // Stones stay close to their authored size (similar base size); trees / mushrooms vary more.
        const scale = type === 'stone' ? 0.9 + rng() * 0.2 : 0.82 + rng() * 0.5
        // Stones are real meshes: pick a variant and take its measured safe radius. Other
        // types use the library footprint. Either way the footprint tracks the on-screen
        // size (instance scale × per-type size) so spacing / grass suppression match it.
        let variantIndex = -1
        let baseFootprint
        let sizeMul
        if (type === 'stone') {
            variantIndex = Math.floor(rng() * STONE_VARIANTS.length) % STONE_VARIANTS.length
            baseFootprint = STONE_VARIANTS[variantIndex].diameter * 0.5
            sizeMul = settings.stoneSize
        } else {
            baseFootprint = library.footprintRadius
            sizeMul = type === 'tree' ? settings.treeSize : 1
        }
        const footprintRadius = baseFootprint * scale * sizeMul

        // Keep the object's footprint off the road surface (with a small margin).
        if (roadEnabled) {
            const roadDistance = sampleRoadDistance(anchorX + localX, anchorZ + localZ, settings.roadParameters)
            if (roadDistance < roadHalfWidth + footprintRadius + 0.25) continue
        }

        let fits = true
        for (const other of instances) {
            const dx = other.localX - localX
            const dz = other.localZ - localZ
            const minDist = settings.minObjectSpacing + (footprintRadius + other.footprintRadius) * 0.5
            if (dx * dx + dz * dz < minDist * minDist) {
                fits = false
                break
            }
        }
        if (!fits) continue

        const rotationY = rng() * Math.PI * 2
        const tiltAmplitude = type === 'mushroom' ? 0.12 : type === 'stone' ? 0.06 : 0.04
        const tiltX = (rng() - 0.5) * tiltAmplitude
        const tiltZ = (rng() - 0.5) * tiltAmplitude
        const colorTone = 0.85 + rng() * 0.3
        const worldX = anchorX + localX
        const worldZ = anchorZ + localZ

        // Sockets are centred (offset x/z == 0 in the library), so world XZ matches the
        // instance and only the height needs scaling. Terrain Y is added by the consumer.
        const sockets = (library.sockets ?? []).map((socket, socketIndex) => ({
            id: socket.id,
            index: socketIndex,
            capacity: socket.capacity ?? 1,
            worldX,
            worldZ,
            heightOffset: (socket.offset?.[1] ?? 0) * scale,
            normal: socket.normal ?? [0, 1, 0],
        }))

        instances.push({ type, variantIndex, localX, localZ, worldX, worldZ, scale, rotationY, tiltX, tiltZ, footprintRadius, colorTone, sockets })
    }

    if (instances.length === 0) return null

    return { id: `${cellX},${cellZ}`, cellX, cellZ, anchorX, anchorZ, archetype: archetype.id, instances }
}

function getCellGroup(cellX, cellZ, settings) {
    const key = `${cellX},${cellZ}`
    if (groupCache.has(key)) return groupCache.get(key)

    const group = buildCellGroup(cellX, cellZ, settings)
    groupCache.set(key, group)

    if (groupCache.size > MAX_CACHED_CELLS) {
        const evictCount = groupCache.size - MAX_CACHED_CELLS
        let evicted = 0
        for (const cachedKey of groupCache.keys()) {
            groupCache.delete(cachedKey)
            if (++evicted >= evictCount) break
        }
    }

    return group
}

export function createObjectFieldSampler(parameters = {}, roadParameters = {}) {
    const settings = getSettings(parameters, roadParameters)
    ensureCache(settings)

    const forEachNeighborInstance = (worldX, worldZ, visit) => {
        const baseCellX = Math.floor(worldX / settings.cellSize)
        const baseCellZ = Math.floor(worldZ / settings.cellSize)

        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const group = getCellGroup(baseCellX + dx, baseCellZ + dz, settings)
                if (!group) continue
                for (const instance of group.instances) {
                    if (visit(instance, group) === false) return
                }
            }
        }
    }

    return {
        settings,

        // Groups owned by this chunk == those whose anchor falls inside the chunk bounds.
        getGroupsInChunk(chunkIndexX, chunkIndexZ, chunkSize) {
            if (!settings.enabled) return []

            const minX = chunkIndexX * chunkSize - chunkSize * 0.5
            const maxX = chunkIndexX * chunkSize + chunkSize * 0.5
            const minZ = chunkIndexZ * chunkSize - chunkSize * 0.5
            const maxZ = chunkIndexZ * chunkSize + chunkSize * 0.5
            const minCellX = Math.floor(minX / settings.cellSize) - 1
            const maxCellX = Math.floor(maxX / settings.cellSize) + 1
            const minCellZ = Math.floor(minZ / settings.cellSize) - 1
            const maxCellZ = Math.floor(maxZ / settings.cellSize) + 1
            const groups = []

            for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
                for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
                    const group = getCellGroup(cellX, cellZ, settings)
                    if (!group) continue
                    if (group.anchorX >= minX && group.anchorX < maxX && group.anchorZ >= minZ && group.anchorZ < maxZ) {
                        groups.push(group)
                    }
                }
            }

            return groups
        },

        // Per-blade object reaction for the grass: hard no-grass within each object's safe
        // radius (footprintRadius), then a fade band of width `grassFadeDistance` where the
        // grass shortens and leans away from the object. Returns { suppress: 0..1, leanX,
        // leanZ } with the lean already scaled by `grassLean` and weighted by suppression.
        sampleObjectField(worldX, worldZ) {
            if (!settings.enabled) return { suppress: 0, leanX: 0, leanZ: 0 }

            const fade = settings.grassFadeDistance
            let suppress = 0
            let leanX = 0
            let leanZ = 0
            forEachNeighborInstance(worldX, worldZ, (instance) => {
                const dx = worldX - instance.worldX
                const dz = worldZ - instance.worldZ
                const dist = Math.sqrt(dx * dx + dz * dz)
                const r = instance.footprintRadius
                const s = 1 - smoothstep(r, r + fade, dist) // 1 inside r → 0 at r + fade
                if (s > suppress) {
                    suppress = s
                    if (dist > 1e-4) {
                        leanX = (dx / dist) * s * settings.grassLean
                        leanZ = (dz / dist) * s * settings.grassLean
                    } else {
                        leanX = 0
                        leanZ = 0
                    }
                }
                if (suppress >= 0.999) return false
            })
            return { suppress, leanX, leanZ }
        },

        // Nearest object + its group — for future character placement / collision.
        sampleNearestObject(worldX, worldZ) {
            if (!settings.enabled) return null

            let best = null
            let bestDistance = Infinity
            forEachNeighborInstance(worldX, worldZ, (instance, group) => {
                const dx = worldX - instance.worldX
                const dz = worldZ - instance.worldZ
                const dist = Math.sqrt(dx * dx + dz * dz)
                if (dist < bestDistance) {
                    bestDistance = dist
                    best = { group, instance, distance: dist }
                }
            })
            return best
        },
    }
}
