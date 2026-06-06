const UINT_MAX = 4294967296

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function smoothstep(value) {
    const t = clamp(value, 0, 1)
    return t * t * (3 - 2 * t)
}

function hashUint(a, b, seed) {
    let value = Math.imul(a | 0, 0x1f123bb5) ^ Math.imul(b | 0, 0x5f356495) ^ (seed | 0)
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
    return (value ^ (value >>> 16)) >>> 0
}

function hashSigned(a, b, seed) {
    return (hashUint(a, b, seed) / UINT_MAX) * 2 - 1
}

function getSettings(parameters = {}) {
    if (parameters.normalizedRoadSettings) return parameters

    return {
        normalizedRoadSettings: true,
        enabled: parameters.enabled ?? true,
        worldSeed: Math.floor(parameters.worldSeed ?? 4242),
        laneSpacing: Math.max(4, parameters.laneSpacing ?? 24),
        nodeSpacing: Math.max(2, parameters.nodeSpacing ?? 10),
        meanderStrength: Math.max(0, parameters.meanderStrength ?? 6),
        width: Math.max(0.05, parameters.width ?? 1.5),
        softness: Math.max(0.001, parameters.softness ?? 0.75),
    }
}

function getNodeOffset(laneIndex, nodeIndex, settings) {
    return hashSigned(laneIndex, nodeIndex, settings.worldSeed) * settings.meanderStrength
}

function sampleLane(laneIndex, worldZ, settings) {
    const nodePosition = worldZ / settings.nodeSpacing
    const nodeIndex = Math.floor(nodePosition)
    const t = nodePosition - nodeIndex
    const p0 = getNodeOffset(laneIndex, nodeIndex - 1, settings)
    const p1 = getNodeOffset(laneIndex, nodeIndex, settings)
    const p2 = getNodeOffset(laneIndex, nodeIndex + 1, settings)
    const p3 = getNodeOffset(laneIndex, nodeIndex + 2, settings)

    const t2 = t * t
    const t3 = t2 * t
    const offset =
        0.5 *
        (2 * p1 +
            (-p0 + p2) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
    const derivative =
        (0.5 *
            (-p0 +
                p2 +
                2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
                3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2)) /
        settings.nodeSpacing

    return {
        laneIndex,
        x: laneIndex * settings.laneSpacing + offset,
        directionX: derivative,
        directionZ: 1,
    }
}

function findNearestLane(worldX, worldZ, settings) {
    const baseLane = Math.round(worldX / settings.laneSpacing)
    let nearestLane = null

    for (let laneOffset = -2; laneOffset <= 2; laneOffset++) {
        const lane = sampleLane(baseLane + laneOffset, worldZ, settings)
        const perpendicularScale = Math.sqrt(1 + lane.directionX * lane.directionX)
        const distance = Math.abs(worldX - lane.x) / perpendicularScale
        if (!nearestLane || distance < nearestLane.distance) {
            nearestLane = { ...lane, distance }
        }
    }

    return nearestLane
}

export function sampleRoadDistance(worldX, worldZ, parameters = {}) {
    const settings = getSettings(parameters)
    if (!settings.enabled) return Infinity

    return findNearestLane(worldX, worldZ, settings).distance
}

export function sampleRoadDirection(worldX, worldZ, parameters = {}) {
    const settings = getSettings(parameters)
    if (!settings.enabled) return { x: 0, z: 1 }

    const nearestLane = findNearestLane(worldX, worldZ, settings)

    const length = Math.hypot(nearestLane.directionX, nearestLane.directionZ)
    return {
        x: nearestLane.directionX / length,
        z: nearestLane.directionZ / length,
    }
}

export function getNearestRoadPoint(worldX, worldZ, parameters = {}) {
    const settings = getSettings(parameters)
    if (!settings.enabled) return null

    const nearestLane = findNearestLane(worldX, worldZ, settings)

    return {
        x: nearestLane.x,
        z: worldZ,
        distance: nearestLane.distance,
        laneIndex: nearestLane.laneIndex,
    }
}

export function sampleRoadMask(worldX, worldZ, parameters = {}) {
    const settings = getSettings(parameters)
    if (!settings.enabled) return 0

    const distance = sampleRoadDistance(worldX, worldZ, settings)
    const innerRadius = settings.width * 0.5
    return 1 - smoothstep((distance - innerRadius) / settings.softness)
}

export function sampleRoadField(worldX, worldZ, parameters = {}) {
    return {
        distance: sampleRoadDistance(worldX, worldZ, parameters),
        direction: sampleRoadDirection(worldX, worldZ, parameters),
        mask: sampleRoadMask(worldX, worldZ, parameters),
    }
}

export function createRoadSampler(parameters = {}) {
    const settings = getSettings(parameters)
    return {
        sample: (worldX, worldZ) => sampleRoadField(worldX, worldZ, settings),
        sampleMask: (worldX, worldZ) => sampleRoadMask(worldX, worldZ, settings),
        sampleDistance: (worldX, worldZ) => sampleRoadDistance(worldX, worldZ, settings),
        sampleDirection: (worldX, worldZ) => sampleRoadDirection(worldX, worldZ, settings),
        getNearestPoint: (worldX, worldZ) => getNearestRoadPoint(worldX, worldZ, settings),
    }
}
