import { createNoise2D } from 'simplex-noise'
import { mulberry32 } from './randomUtils.js'

export const WORLD_NOISE_SEED = 1337
export const sharedNoise2D = createNoise2D(mulberry32(WORLD_NOISE_SEED))
