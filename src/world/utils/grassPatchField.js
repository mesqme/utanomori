const UINT_MAX = 4294967296
const cellCache = new Map()
const MAX_CACHED_CELLS = 32768

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function smoothstep(value) {
    const t = clamp(value, 0, 1)
    return t * t * (3 - 2 * t)
}

function fade(value) {
    return value * value * value * (value * (value * 6 - 15) + 10)
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

function gradientDot(gridX, gridZ, x, z, seed) {
    const angle = hash01(gridX, gridZ, seed) * Math.PI * 2
    return Math.cos(angle) * (x - gridX) + Math.sin(angle) * (z - gridZ)
}

function perlinNoise2D(x, z, seed) {
    const ix = Math.floor(x)
    const iz = Math.floor(z)
    const fx = x - ix
    const fz = z - iz
    const sx = fade(fx)
    const sz = fade(fz)

    const n00 = gradientDot(ix, iz, x, z, seed)
    const n10 = gradientDot(ix + 1, iz, x, z, seed)
    const n01 = gradientDot(ix, iz + 1, x, z, seed)
    const n11 = gradientDot(ix + 1, iz + 1, x, z, seed)
    const nx0 = n00 + (n10 - n00) * sx
    const nx1 = n01 + (n11 - n01) * sx

    return clamp((nx0 + (nx1 - nx0) * sz) * 1.41421356237, -1, 1)
}

function signedVariation(seed, channel) {
    return hash01(seed, channel, 0x72f3a9b5) * 2 - 1
}

function getSettings(parameters = {}) {
    if (parameters.normalizedGrassPatchSettings) return parameters

    const settings = {
        normalizedGrassPatchSettings: true,
        worldSeed: Math.floor(parameters.worldSeed ?? 9187),
        spacing: Math.max(0.25, parameters.spacing ?? 2.6),
        jitter: clamp(parameters.jitter ?? 0.68, 0, 0.95),
        domainWarpScale: Math.max(0.0001, parameters.domainWarpScale ?? 0.12),
        domainWarpStrength: Math.max(0, parameters.domainWarpStrength ?? 0.45),
        patchHeightVariation: clamp(parameters.patchHeightVariation ?? 0.2, 0, 0.9),
        patchWidthVariation: clamp(parameters.patchWidthVariation ?? 0.16, 0, 0.9),
        patchColorVariation: clamp(parameters.patchColorVariation ?? 0.28, 0, 1),
        internalNoiseScale: Math.max(0.0001, parameters.internalNoiseScale ?? 0.75),
        internalHeightVariation: clamp(parameters.internalHeightVariation ?? 0.12, 0, 0.9),
        internalWidthVariation: clamp(parameters.internalWidthVariation ?? 0.1, 0, 0.9),
        internalColorVariation: clamp(parameters.internalColorVariation ?? 0.1, 0, 1),
        internalLeanVariation: clamp(parameters.internalLeanVariation ?? 0.22, 0, 1),
        radialLeanStrength: Math.max(0, parameters.radialLeanStrength ?? 0.36),
        borderWidth: Math.max(0.0001, parameters.borderWidth ?? 0.22),
        borderMinScale: clamp(parameters.borderMinScale ?? 0.78, 0.05, 1),
    }
    settings.cacheSignature = [
        settings.worldSeed,
        settings.spacing,
        settings.jitter,
        settings.patchHeightVariation,
        settings.patchWidthVariation,
        settings.patchColorVariation,
    ].join('|')
    return settings
}

export function getGrassPatchCell(gridX, gridZ, parameters = {}) {
    const settings = getSettings(parameters)
    const cacheKey = `${settings.cacheSignature}|${gridX},${gridZ}`
    const cached = cellCache.get(cacheKey)
    if (cached) return cached

    const seed = hashUint(gridX, gridZ, settings.worldSeed)
    const jitterX = (hash01(gridX, gridZ, settings.worldSeed ^ 0x4a19c2d7) - 0.5) * settings.jitter
    const jitterZ = (hash01(gridX, gridZ, settings.worldSeed ^ 0x6d2b79f5) - 0.5) * settings.jitter

    const cell = {
        id: `${gridX},${gridZ}`,
        seed,
        gridX,
        gridZ,
        centerX: (gridX + 0.5 + jitterX) * settings.spacing,
        centerZ: (gridZ + 0.5 + jitterZ) * settings.spacing,
        meanHeight: 1 + signedVariation(seed, 11) * settings.patchHeightVariation,
        meanWidth: 1 + signedVariation(seed, 17) * settings.patchWidthVariation,
        meanColor: clamp(hash01(seed, 23, settings.worldSeed) * settings.patchColorVariation, 0, 1),
        colorFamily: Math.floor(hash01(seed, 27, settings.worldSeed) * 4),
        meanLean: 0.8 + hash01(seed, 29, settings.worldSeed) * 0.4,
    }
    cellCache.set(cacheKey, cell)
    if (cellCache.size > MAX_CACHED_CELLS) {
        cellCache.delete(cellCache.keys().next().value)
    }
    return cell
}

export function sampleGrassPatchField(worldX, worldZ, parameters = {}, out = {}) {
    const settings = getSettings(parameters)
    const warpX = perlinNoise2D(worldX * settings.domainWarpScale, worldZ * settings.domainWarpScale, settings.worldSeed ^ 0x174b9c21)
    const warpZ = perlinNoise2D(worldX * settings.domainWarpScale, worldZ * settings.domainWarpScale, settings.worldSeed ^ 0x5e6f7a8b)
    const sampleX = worldX + warpX * settings.domainWarpStrength
    const sampleZ = worldZ + warpZ * settings.domainWarpStrength
    const baseGridX = Math.floor(sampleX / settings.spacing)
    const baseGridZ = Math.floor(sampleZ / settings.spacing)

    let nearestCell = null
    let nearestDistanceSq = Infinity
    let secondDistanceSq = Infinity

    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const cell = getGrassPatchCell(baseGridX + dx, baseGridZ + dz, settings)
            const cellDx = sampleX - cell.centerX
            const cellDz = sampleZ - cell.centerZ
            const distanceSq = cellDx * cellDx + cellDz * cellDz

            if (distanceSq < nearestDistanceSq) {
                secondDistanceSq = nearestDistanceSq
                nearestDistanceSq = distanceSq
                nearestCell = cell
            } else if (distanceSq < secondDistanceSq) {
                secondDistanceSq = distanceSq
            }
        }
    }

    const localX = (worldX - nearestCell.centerX) * settings.internalNoiseScale
    const localZ = (worldZ - nearestCell.centerZ) * settings.internalNoiseScale
    const internalSeed = nearestCell.seed ^ 0x3c6ef372
    const heightNoise = perlinNoise2D(localX, localZ, internalSeed ^ 0x1)
    const widthNoise = perlinNoise2D(localX + 17.3, localZ - 9.1, internalSeed ^ 0x2)
    const colorNoise = perlinNoise2D(localX - 31.7, localZ + 13.9, internalSeed ^ 0x3)
    const leanNoise = perlinNoise2D(localX + 47.1, localZ + 28.3, internalSeed ^ 0x4)
    const borderDistance = Math.max(0, Math.sqrt(secondDistanceSq) - Math.sqrt(nearestDistanceSq))
    const borderBlend = smoothstep(borderDistance / settings.borderWidth)
    const borderScale = settings.borderMinScale + (1 - settings.borderMinScale) * borderBlend
    const radialX = worldX - nearestCell.centerX
    const radialZ = worldZ - nearestCell.centerZ
    const radialLength = Math.hypot(radialX, radialZ)
    const safeRadialLength = Math.max(radialLength, 0.0001)

    out.patchId = nearestCell.id
    out.patchSeed = nearestCell.seed
    out.centerX = nearestCell.centerX
    out.centerZ = nearestCell.centerZ
    out.borderDistance = borderDistance
    out.borderScale = borderScale
    out.heightMultiplier = clamp(nearestCell.meanHeight * (1 + heightNoise * settings.internalHeightVariation) * borderScale, 0.1, 2)
    out.widthMultiplier = clamp(nearestCell.meanWidth * (1 + widthNoise * settings.internalWidthVariation) * borderScale, 0.1, 2)
    out.colorMix = clamp(nearestCell.meanColor + colorNoise * settings.internalColorVariation, 0, 1)
    out.colorFamily = nearestCell.colorFamily
    out.leanX = radialX / safeRadialLength
    out.leanZ = radialZ / safeRadialLength
    out.leanStrength = settings.radialLeanStrength * nearestCell.meanLean * (1 + leanNoise * settings.internalLeanVariation)
    return out
}

export function getGrassPatchCellsInBounds(minX, maxX, minZ, maxZ, parameters = {}) {
    const settings = getSettings(parameters)
    const padding = settings.spacing * 2 + settings.domainWarpStrength
    const minGridX = Math.floor((minX - padding) / settings.spacing)
    const maxGridX = Math.floor((maxX + padding) / settings.spacing)
    const minGridZ = Math.floor((minZ - padding) / settings.spacing)
    const maxGridZ = Math.floor((maxZ + padding) / settings.spacing)
    const cells = []

    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
        for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ++) {
            const cell = getGrassPatchCell(gridX, gridZ, settings)
            if (cell.centerX >= minX && cell.centerX <= maxX && cell.centerZ >= minZ && cell.centerZ <= maxZ) {
                cells.push(cell)
            }
        }
    }

    return cells
}

export function createGrassPatchSampler(parameters = {}) {
    const settings = getSettings(parameters)
    return {
        getCell: (gridX, gridZ) => getGrassPatchCell(gridX, gridZ, settings),
        sample: (worldX, worldZ, out) => sampleGrassPatchField(worldX, worldZ, settings, out),
        getCellsInBounds: (minX, maxX, minZ, maxZ) => getGrassPatchCellsInBounds(minX, maxX, minZ, maxZ, settings),
    }
}
