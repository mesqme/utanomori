import { mulberry32 } from './randomUtils.js'

const DEFAULT_WIND_GRID_SPACING = 3.0
const DEFAULT_WIND_HEIGHT = 1.0
const DEFAULT_WIND_HEIGHT_VARIATION_RANGE = 1.0
const WIND_TIME_OFFSET_MAX = 100

export function generateWindLineInstances(x, z, size, options = {}) {
    const seed = ((x * 73856093) ^ (z * 19349663) ^ 0x9e3779b9) >>> 0
    const rng = mulberry32(seed)
    const instances = []

    const gridSpacing = options.gridSpacing ?? DEFAULT_WIND_GRID_SPACING
    const baseHeight = options.height ?? DEFAULT_WIND_HEIGHT
    const heightVariationRange = options.heightVariationRange ?? DEFAULT_WIND_HEIGHT_VARIATION_RANGE

    const halfSize = size * 0.5
    const start = -halfSize + gridSpacing * 0.5
    const end = halfSize - gridSpacing * 0.5

    let index = 0
    for (let localX = start; localX <= end + 1e-4; localX += gridSpacing) {
        for (let localZ = start; localZ <= end + 1e-4; localZ += gridSpacing) {
            instances.push({
                id: `${x}_${z}_${index}`,
                position: [localX, baseHeight + rng() * heightVariationRange, localZ],
                timeOffset: rng() * WIND_TIME_OFFSET_MAX,
            })
            index += 1
        }
    }

    return instances
}
