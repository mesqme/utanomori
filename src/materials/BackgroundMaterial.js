import * as THREE from 'three'

import backgroundVertexShader from '../shaders/background/vertex.glsl'
import backgroundFragmentShader from '../shaders/background/fragment.glsl'
import { themeMaskUniforms } from '../world/state/themeMask.js'

// Layered night sky: base colour gradient + paintery texture variation + stars.
function colorModeToInt(mode) {
    return mode === 'Color Mix' ? 1 : mode === 'Both' ? 2 : 0
}

export function createBackgroundMaterial(painteryTexture) {
    return new THREE.ShaderMaterial({
        name: 'background',
        vertexShader: backgroundVertexShader,
        fragmentShader: backgroundFragmentShader,
        side: THREE.BackSide,
        uniforms: {
            // Layer 1 — base colour
            uBackgroundColor: { value: new THREE.Color('#2a2358') },
            uSkyMixColor: { value: new THREE.Color('#3f6ea8') },
            uSkyMixAmount: { value: 1 },
            // Outgoing theme (masked theme transitions) + the screen-space mask itself.
            uBackgroundColorOld: { value: new THREE.Color('#2a2358') },
            uSkyMixColorOld: { value: new THREE.Color('#3f6ea8') },
            uSkyMixAmountOld: { value: 1 },
            uStarsEnabledOld: { value: 1 },
            uStarColorOld: { value: new THREE.Color('#fff8ff') },
            ...themeMaskUniforms,
            // Layer 2 — paintery texture
            uTextureEnabled: { value: true },
            uColorMode: { value: 0 },
            uTexture: { value: painteryTexture },
            uTextureSize: { value: 250 },
            uTexturePan: { value: new THREE.Vector2(0, 0) },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uTextureLayer2: { value: 2.3 },
            uTextureContrast: { value: 1.0 },
            uTextureBrightness: { value: 0.4 },
            uTextureMixIntensity: { value: 0.0 },
            // Layer 3 — stars
            uStarsEnabled: { value: true },
            uTime: { value: 0 },
            uStarCells: { value: 30 },
            uStarDensity: { value: 0.4 },
            uStarSize: { value: 0.06 },
            uStarBrightness: { value: 1.2 },
            uStarTwinkleSpeed: { value: 1.5 },
            uStarRays: { value: 0.35 },
            uStarColor: { value: new THREE.Color('#fff8ff') },
            uStarsFadeStart: { value: -0.05 },
            uStarsFadeWidth: { value: 0.45 },
        },
    })
}

export function updateBackgroundMaterial(material, options) {
    const u = material.uniforms
    const refScale = options.refScale ?? 1

    // Layer 1 — the flat base: background colour blended toward the mix colour
    u.uBackgroundColor.value.set(options.backgroundColor ?? options.colorMixColor ?? '#2a2358')
    u.uSkyMixColor.value.set(options.skyMixColor ?? '#3f6ea8')
    u.uSkyMixAmount.value = options.skyMixAmount ?? 1

    // Outgoing theme during a masked theme transition (identity when inactive).
    const old = options.themeMaskOld
    u.uBackgroundColorOld.value.set(old?.bgColor ?? options.backgroundColor ?? '#2a2358')
    u.uSkyMixColorOld.value.set(old?.skyMixColor ?? options.skyMixColor ?? '#3f6ea8')
    u.uSkyMixAmountOld.value = old?.skyMixAmount ?? options.skyMixAmount ?? 1
    u.uStarsEnabledOld.value = (old ? old.starsEnabled : options.starsEnabled !== false) ? 1 : 0
    u.uStarColorOld.value.set(old?.starColor ?? options.starColor ?? '#fff8ff')

    // Layer 2 — paintery texture
    u.uTextureEnabled.value = options.textureEnabled !== false
    u.uColorMode.value = colorModeToInt(options.colorMode)
    u.uTextureSize.value = (options.textureSize ?? 250) * refScale
    if (options.texturePan) u.uTexturePan.value.copy(options.texturePan)
    if (options.resolution) u.uResolution.value.copy(options.resolution)
    u.uTextureLayer2.value = options.textureLayer2 ?? 2.3
    u.uTextureContrast.value = options.textureContrast ?? 1.0
    u.uTextureBrightness.value = options.textureBrightness ?? options.colorIntensity ?? 0.4
    u.uTextureMixIntensity.value = options.textureMixIntensity ?? options.colorMixIntensity ?? 0.0

    // Layer 3 — stars (direction space → resolution independent, no refScale)
    u.uStarsEnabled.value = options.starsEnabled !== false
    u.uTime.value = options.time ?? 0
    u.uStarCells.value = options.starCellSize ?? 30
    u.uStarDensity.value = options.starDensity ?? 0.4
    u.uStarSize.value = options.starSize ?? 0.06
    u.uStarBrightness.value = options.starBrightness ?? 1.2
    u.uStarTwinkleSpeed.value = options.starTwinkleSpeed ?? 1.5
    u.uStarRays.value = options.starRays ?? 0.35
    u.uStarColor.value.set(options.starColor ?? '#fff8ff')
    u.uStarsFadeStart.value = options.starsFadeStart ?? -0.05
    u.uStarsFadeWidth.value = options.starsFadeWidth ?? 0.45
}
