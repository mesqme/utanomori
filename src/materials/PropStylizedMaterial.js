import * as THREE from 'three'

import propVertexShader from '../shaders/prop/vertex.glsl'
import propFragmentShader from '../shaders/prop/fragment.glsl'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'

// Stylized prop material — the character's unlit + triplanar-painterly look, but
// extended with the BatchedMesh chunks so it batches with per-instance colour, plus
// the reveal-circle fade. Compiles as GLSL3 (forced by three for ShaderMaterials),
// which the batching chunks require.
//
// `vertexColors: true` makes it read a geometry colour attribute instead of the
// batched colour — used for the (non-batched) companion creatures, which carry
// per-vertex colours. The batching chunks are inert on a regular mesh.
export function createPropStylizedMaterial(painterlyTexture, { vertexColors = false } = {}) {
    const material = new THREE.ShaderMaterial({
        name: 'prop_stylized',
        vertexShader: propVertexShader,
        fragmentShader: propFragmentShader,
        uniforms: {
            uBaseColor: { value: new THREE.Color('#ffffff') },
            uPainterlyEnabled: { value: 1 },
            uPainterlyTexture: { value: painterlyTexture },
            uPainterlyScale: { value: 0.08 },
            uPainterlyContrast: { value: 1.05 },
            uPainterlyColor: { value: new THREE.Color('#ffffff') },
            uPainterlyColorStrength: { value: 0 },
            uPainterlyBrightnessVariation: { value: 0.5 },
            uBackgroundColor: { value: new THREE.Color(soundJourneyPalette.background) },
            uPropFadeMode: { value: 1 },
            uPixelSize: { value: 1 },
            uCircleCenter: { value: new THREE.Vector3() },
            uCircleRadiusFactor: { value: 0.07 },
            uPropChunkSize: { value: 9 },
            uPropFadeOffset: { value: 2.5 },
        },
        toneMapped: false,
    })

    if (vertexColors) material.vertexColors = true

    return material
}

export function updatePropStylizedMaterial(material, options) {
    const u = material.uniforms
    u.uCircleCenter.value.set(options.circleCenterX, 0, options.circleCenterZ)
    u.uCircleRadiusFactor.value = options.radiusFactor
    u.uPropChunkSize.value = options.chunkSize
    u.uPropFadeOffset.value = options.fadeOffset
    u.uBackgroundColor.value.set(options.backgroundColor)
    u.uPropFadeMode.value = options.fadeMode === 'Dither' ? 0 : 1
    u.uPixelSize.value = options.pixelSize
    u.uPainterlyEnabled.value = options.painterlyEnabled ? 1 : 0
    u.uPainterlyScale.value = options.painterlyScale
    u.uPainterlyContrast.value = options.painterlyContrast
    u.uPainterlyBrightnessVariation.value = options.painterlyBrightness
    u.uPainterlyColorStrength.value = options.painterlyColorStrength
}
