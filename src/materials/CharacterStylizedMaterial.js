import * as THREE from 'three'

import characterVertexShader from '../shaders/character/vertex.glsl'
import characterInstancedVertexShader from '../shaders/character/instancedVertex.glsl'
import characterFragmentShader from '../shaders/character/fragment.glsl'
import { characterStylizedDefaults } from '../config/stylizedMaterialDefaults.js'

function getSettings(settings) {
    return {
        ...characterStylizedDefaults,
        ...settings,
    }
}

// options: { instanced } → use the InstancedMesh vertex (the sheep scales); { transparent } →
// honour the per-frame uFade reveal-edge fade (companions). The hero passes neither, so it keeps
// the skinned vertex, stays opaque, and leaves uFade = 0 (the fade is a no-op).
export function createCharacterStylizedMaterial(sourceMaterial, materialSettings, stylizedSettings, painterlyTexture, options = {}) {
    const settings = getSettings(stylizedSettings)
    const fallbackColor = sourceMaterial?.color?.getStyle?.() ?? '#ffffff'

    const material = new THREE.ShaderMaterial({
        name: `stylized_${sourceMaterial?.name || 'material'}`,
        vertexShader: options.instanced ? characterInstancedVertexShader : characterVertexShader,
        fragmentShader: characterFragmentShader,
        uniforms: {
            uBaseColor: { value: new THREE.Color(materialSettings?.baseColor ?? fallbackColor) },
            uDebugMode: { value: settings.debugMode },
            uPainterlyEnabled: { value: settings.painterlyEnabled ? 1 : 0 },
            uPainterlyTexture: { value: painterlyTexture },
            uPainterlyScale: { value: settings.painterlyScale },
            uPainterlyContrast: { value: settings.painterlyContrast },
            uPainterlyColor: { value: new THREE.Color(settings.painterlyColor) },
            uPainterlyColorStrength: { value: settings.painterlyColorStrength },
            uPainterlyBrightnessVariation: { value: settings.painterlyBrightnessVariation },
            uFade: { value: 0 },
            uBackgroundColor: { value: new THREE.Color(options.backgroundColor ?? '#000000') },
            // In-shader cartoon eyes (head mesh only). Off by default; CharacterEyes flips uDrawEyes
            // on the head material + drives the rest each frame when the "Head Shader (uv1)" mode is on.
            uDrawEyes: { value: 0 },
            uEyeColor: { value: new THREE.Color('#f2c20a') },
            uPupilColor: { value: new THREE.Color('#130d09') },
            uEyeRadius: { value: 0.16 },
            uEyeSpacing: { value: 0.47 },
            uEyeOffsetY: { value: 0 },
            uEyeAspect: { value: 1.0 },
            uEyeNoiseScale: { value: 1.1 },
            uEyeNoiseStrength: { value: 0.07 },
            uPupilWidth: { value: 0.07 },
            uPupilHeight: { value: 0.1 },
            uPupilOffsetX: { value: 0 },
            uPupilOffsetY: { value: 0 },
            uPupilNoiseScale: { value: 0.9 },
            uPupilNoiseStrength: { value: 0.13 },
            uEyeEdgeSoftness: { value: 0.01 },
            uEyeBlink: { value: 0 },
        },
        // Companions render OPAQUE (their reveal-edge fade is a dither dissolve in the fragment, not
        // alpha) so they depth-sort cleanly with the transparent grass instead of blending through
        // it. (The hero keeps whatever its source material declared.)
        transparent: options.transparent ? false : (sourceMaterial?.transparent ?? false),
        depthWrite: true,
        opacity: sourceMaterial?.opacity ?? 1,
        alphaTest: sourceMaterial?.alphaTest ?? 0,
        toneMapped: false,
    })

    return material
}

export function updateCharacterStylizedMaterial(material, materialSettings, stylizedSettings, painterlyTexture) {
    const settings = getSettings(stylizedSettings)
    const uniforms = material.uniforms

    uniforms.uBaseColor.value.set(materialSettings.baseColor)
    uniforms.uDebugMode.value = settings.debugMode
    uniforms.uPainterlyEnabled.value = settings.painterlyEnabled ? 1 : 0
    uniforms.uPainterlyTexture.value = painterlyTexture
    uniforms.uPainterlyScale.value = settings.painterlyScale
    uniforms.uPainterlyContrast.value = settings.painterlyContrast
    uniforms.uPainterlyColor.value.set(settings.painterlyColor)
    uniforms.uPainterlyColorStrength.value = settings.painterlyColorStrength
    uniforms.uPainterlyBrightnessVariation.value = settings.painterlyBrightnessVariation
}
