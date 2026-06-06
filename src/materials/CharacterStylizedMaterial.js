import * as THREE from 'three'

import characterVertexShader from '../shaders/character/vertex.glsl'
import characterFragmentShader from '../shaders/character/fragment.glsl'
import { characterStylizedDefaults } from '../config/stylizedMaterialDefaults.js'

function getSettings(settings) {
    return {
        ...characterStylizedDefaults,
        ...settings,
    }
}

export function createCharacterStylizedMaterial(sourceMaterial, materialSettings, stylizedSettings, painterlyTexture) {
    const settings = getSettings(stylizedSettings)
    const fallbackColor = sourceMaterial?.color?.getStyle?.() ?? '#ffffff'

    return new THREE.ShaderMaterial({
        name: `stylized_${sourceMaterial?.name || 'material'}`,
        vertexShader: characterVertexShader,
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
        },
        transparent: sourceMaterial?.transparent ?? false,
        opacity: sourceMaterial?.opacity ?? 1,
        alphaTest: sourceMaterial?.alphaTest ?? 0,
        toneMapped: false,
    })
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
