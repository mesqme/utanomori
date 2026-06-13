import useStore from '../../stores/useStore.jsx'
import { sharedNoise2D } from './worldNoise.js'

// Terrain height at a world XZ — same source the character and grass use.
export function getGroundY(x, z) {
    const terrainParameters = useStore.getState().terrainParameters
    return sharedNoise2D(x * terrainParameters.scale, z * terrainParameters.scale) * terrainParameters.amplitude
}
