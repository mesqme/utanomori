import * as THREE from 'three'

import backgroundVertexShader from '../shaders/background/vertex.glsl'
import backgroundFragmentShader from '../shaders/background/fragment.glsl'

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
            // Layer 2 — paintery texture
            uTextureEnabled: { value: true },
            uColorMode: { value: 0 },
            uTexture: { value: painteryTexture },
            uTextureSize: { value: 250 },
            uTexturePan: { value: new THREE.Vector2(0, 0) },
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
            // Constellations
            uConstellationsEnabled: { value: false },
            uConstellationDensity: { value: 0.02 },
            uConstellationBrightness: { value: 0.6 },
            uConstellationWidth: { value: 0.04 },
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

    // Layer 2 — paintery texture
    u.uTextureEnabled.value = options.textureEnabled !== false
    u.uColorMode.value = colorModeToInt(options.colorMode)
    u.uTextureSize.value = (options.textureSize ?? 250) * refScale
    if (options.texturePan) u.uTexturePan.value.copy(options.texturePan)
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

    // Constellations
    u.uConstellationsEnabled.value = options.constellationsEnabled === true
    u.uConstellationDensity.value = options.constellationDensity ?? 0.02
    u.uConstellationBrightness.value = options.constellationBrightness ?? 0.6
    u.uConstellationWidth.value = options.constellationWidth ?? 0.04
}
