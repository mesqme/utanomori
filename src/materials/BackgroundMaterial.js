import * as THREE from 'three'

import backgroundVertexShader from '../shaders/background/vertex.glsl'
import backgroundFragmentShader from '../shaders/background/fragment.glsl'

// Background sky modes: 0 = flat colour, 1 = stylized brush texture, 2 = night sky.
function backgroundModeToInt(mode) {
    return mode === 'Texture' ? 1 : mode === 'NightSky' ? 2 : 0
}

export function createBackgroundMaterial(painteryTexture) {
    return new THREE.ShaderMaterial({
        name: 'background',
        vertexShader: backgroundVertexShader,
        fragmentShader: backgroundFragmentShader,
        side: THREE.BackSide,
        uniforms: {
            uMode: { value: 0 },
            uColor: { value: new THREE.Color('#44336c') },
            uTexture: { value: painteryTexture },
            uTextureScale: { value: 0.004 },
            uTextureContrast: { value: 0.4 },
            uTextureLayer2: { value: 2.3 },
            uTime: { value: 0 },
            uStarCellSize: { value: 30 },
            uStarDensity: { value: 0.4 },
            uStarSize: { value: 0.06 },
            uStarBrightness: { value: 1.2 },
            uStarTwinkleSpeed: { value: 1.5 },
            uStarRays: { value: 0.35 },
            uStarColor: { value: new THREE.Color('#fff8ff') },
        },
    })
}

export function updateBackgroundMaterial(material, options) {
    const u = material.uniforms
    u.uMode.value = backgroundModeToInt(options.mode)
    u.uColor.value.set(options.color)
    u.uTime.value = options.time
    u.uTextureScale.value = options.textureScale
    u.uTextureContrast.value = options.textureContrast
    u.uTextureLayer2.value = options.textureLayer2
    u.uStarCellSize.value = options.starCellSize
    u.uStarDensity.value = options.starDensity
    u.uStarSize.value = options.starSize
    u.uStarBrightness.value = options.starBrightness
    u.uStarTwinkleSpeed.value = options.starTwinkleSpeed
    u.uStarRays.value = options.starRays
    u.uStarColor.value.set(options.starColor)
}
