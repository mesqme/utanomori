import * as THREE from 'three'

import backgroundVertexShader from '../shaders/background/vertex.glsl'
import backgroundFragmentShader from '../shaders/background/fragment.glsl'
import { themeMaskUniforms } from '../world/utils/themeMask.js'

// Layered night sky: base colour gradient + paintery texture variation + stars.
function starStyleToInt(style) {
    return style === 'Natural' ? 1 : 0
}

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
            // Layer 1 — base colour gradient
            uBackgroundColor: { value: new THREE.Color('#2a2358') },
            uGradientTopColor: { value: new THREE.Color('#44336c') },
            uHorizonColor: { value: new THREE.Color('#3f6ea8') },
            uGradientIntensity: { value: 1 },
            uGradientHeight: { value: 0.12 },
            uGradientPower: { value: 1.4 },
            // Outgoing theme (masked theme transitions) + the screen-space mask itself.
            uBackgroundColorOld: { value: new THREE.Color('#2a2358') },
            uGradientTopColorOld: { value: new THREE.Color('#44336c') },
            uHorizonColorOld: { value: new THREE.Color('#3f6ea8') },
            uGradientIntensityOld: { value: 1 },
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
            uStarStyle: { value: 0 },
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

    // Layer 1 — base colour gradient (top colour comes from the scene background colour)
    u.uBackgroundColor.value.set(options.backgroundColor ?? options.colorMixColor ?? '#2a2358')
    u.uGradientTopColor.value.set(options.gradientTopColor ?? options.color ?? '#44336c')
    u.uHorizonColor.value.set(options.horizonColor ?? options.colorHorizon ?? '#3f6ea8')
    u.uGradientIntensity.value = options.gradientIntensity ?? 1
    u.uGradientHeight.value = options.gradientHeight ?? 0.12
    u.uGradientPower.value = options.gradientPower ?? 1.4

    // Outgoing theme during a masked theme transition (identity when inactive).
    const old = options.themeMaskOld
    u.uBackgroundColorOld.value.set(old?.bgColor ?? options.backgroundColor ?? '#2a2358')
    u.uGradientTopColorOld.value.set(old?.gradTop ?? options.gradientTopColor ?? '#44336c')
    u.uHorizonColorOld.value.set(old?.horizon ?? options.horizonColor ?? '#3f6ea8')
    u.uGradientIntensityOld.value = old?.gradIntensity ?? options.gradientIntensity ?? 1
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
    u.uStarStyle.value = starStyleToInt(options.starStyle)
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
