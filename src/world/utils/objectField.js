import { mulberry32 } from './randomUtils.js'
import { sampleRoadDistance } from './roadField.js'
import { objectArchetypes, objectFieldDefaults, objectLibrary } from '../../config/objectFieldDefaults.js'

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
        const scale = 0.82 + rng() * 0.5
        const footprintRadius = library.footprintRadius * scale

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
        const tiltAmplitude = type === 'stone' ? 0.28 : type === 'mushroom' ? 0.12 : 0.06
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

        instances.push({ type, localX, localZ, worldX, worldZ, scale, rotationY, tiltX, tiltZ, footprintRadius, colorTone, sockets })
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

        // 0..1 coverage under an object footprint — used to suppress grass.
        sampleCoverage(worldX, worldZ) {
            if (!settings.enabled) return 0

            let coverage = 0
            forEachNeighborInstance(worldX, worldZ, (instance) => {
                const dx = worldX - instance.worldX
                const dz = worldZ - instance.worldZ
                const dist = Math.sqrt(dx * dx + dz * dz)
                const local = 1 - smoothstep(instance.footprintRadius * 0.6, instance.footprintRadius * 1.15, dist)
                if (local > coverage) coverage = local
                if (coverage >= 1) return false
            })
            return coverage
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
