import * as THREE from 'three'

import companionVertexShader from '../shaders/companion/vertex.glsl'
import companionFragmentShader from '../shaders/companion/fragment.glsl'
import { fadeModeToInt } from './TerrainMaterial.jsx'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'

// Secondary-character material: a plain sphere whose body colour comes from the
// geometry's vertex colour, with two big cute eyes drawn by a front projection
// (white circles + animated black pupils that drift and blink). Same painterly
// stylization + reveal fade as the rest of the world. Shared across all creatures;
// per-creature variation (body colour, blink phase) rides on geometry attributes.
export function createCompanionEyeMaterial(painterlyTexture) {
    return new THREE.ShaderMaterial({
        name: 'companion_eye',
        vertexShader: companionVertexShader,
        fragmentShader: companionFragmentShader,
        vertexColors: true,
        uniforms: {
            uTime: { value: 0 },
            uEyeColor: { value: new THREE.Color('#fff8ff') },
            uPupilColor: { value: new THREE.Color('#0d0a2a') },
            uEyeRadius: { value: 0.5 },
            uEyeSize: { value: 0.34 },
            uPupilSize: { value: 0.18 },
            uEyeSpacing: { value: 0.4 },
            uEyeHeight: { value: 0.12 },
            uPainterlyEnabled: { value: 1 },
            uPainterlyTexture: { value: painterlyTexture },
            uPainterlyScale: { value: 0.6 },
            uPainterlyContrast: { value: 1.05 },
            uPainterlyBrightnessVariation: { value: 0.32 },
            uBackgroundColor: { value: new THREE.Color(soundJourneyPalette.background) },
            uPropFadeMode: { value: 1 },
            uPixelSize: { value: 1 },
            uPainteryScale: { value: 0.006 },
            uPainteryScreenBlend: { value: 0.85 },
            uPainteryDrift: { value: 0.12 },
            uPainteryLayer2Scale: { value: 2.2 },
            uPainteryBleed: { value: 0.35 },
            uCircleCenter: { value: new THREE.Vector3() },
            uCircleRadiusFactor: { value: 0.07 },
            uPropChunkSize: { value: 9 },
            uPropFadeOffset: { value: 2.5 },
        },
        toneMapped: false,
    })
}

export function updateCompanionEyeMaterial(material, options) {
    const u = material.uniforms
    u.uTime.value = options.time
    u.uCircleCenter.value.set(options.circleCenterX, 0, options.circleCenterZ)
    u.uCircleRadiusFactor.value = options.radiusFactor
    u.uPropChunkSize.value = options.chunkSize
    u.uPropFadeOffset.value = options.fadeOffset
    u.uBackgroundColor.value.set(options.backgroundColor)
    u.uPropFadeMode.value = fadeModeToInt(options.fadeMode)
    u.uPixelSize.value = options.pixelSize
    u.uPainterlyEnabled.value = options.painterlyEnabled ? 1 : 0
    if (options.paintery) {
        u.uPainteryScale.value = options.paintery.scale
        u.uPainteryScreenBlend.value = options.paintery.screenBlend
        u.uPainteryDrift.value = options.paintery.drift
        u.uPainteryLayer2Scale.value = options.paintery.layer2Scale
        u.uPainteryBleed.value = options.paintery.bleed
    }
}
