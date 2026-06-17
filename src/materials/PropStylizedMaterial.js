import * as THREE from 'three'

import propVertexShader from '../shaders/prop/vertex.glsl'
import propFragmentShader from '../shaders/prop/fragment.glsl'
import { fadeModeToInt } from './TerrainMaterial.jsx'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'

// Stylized prop material — the character's unlit + triplanar-painterly look, but
// extended with the BatchedMesh chunks so it batches with per-instance colour, plus
// the reveal-circle fade. Compiles as GLSL3 (forced by three for ShaderMaterials),
// which the batching chunks require.
//
// `vertexColors: true` makes it read a geometry colour attribute instead of the
// batched colour — used for the (non-batched) companion creatures, which carry
// per-vertex colours. The batching chunks are inert on a regular mesh.
export function createPropStylizedMaterial(painterlyTexture, { vertexColors = false, toneMapped = false } = {}) {
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
            uPainterySize: { value: 167 },
            uPainteryScreenBlend: { value: 0.85 },
            uPainteryDrift: { value: 0.12 },
            uPainteryLayer2Scale: { value: 2.2 },
            uPainteryBleed: { value: 0.35 },
            uCircleCenter: { value: new THREE.Vector3() },
            uCircleRadiusFactor: { value: 0.07 },
            uPropChunkSize: { value: 9 },
            uPropFadeOffset: { value: 2.5 },
            uSeeThroughActive: { value: 0 },
            uSeeThroughCenter: { value: new THREE.Vector2() },
            uSeeThroughRadius: { value: 120 },
            uSeeThroughDepth: { value: 20 },
            uSeeThroughInner: { value: 0.35 },
            uSeeThroughCoreOpacity: { value: 0.35 },
            uSeeThroughDepthBias: { value: 0.5 },
        },
        toneMapped,
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
    const refScale = options.refScale ?? 1
    u.uBackgroundColor.value.set(options.backgroundColor)
    u.uPropFadeMode.value = fadeModeToInt(options.fadeMode)
    u.uPixelSize.value = options.pixelSize * refScale
    u.uPainterlyEnabled.value = options.painterlyEnabled ? 1 : 0
    u.uPainterlyScale.value = options.painterlyScale
    u.uPainterlyContrast.value = options.painterlyContrast
    u.uPainterlyBrightnessVariation.value = options.painterlyBrightness
    u.uPainterlyColorStrength.value = options.painterlyColorStrength
    if (options.paintery) {
        u.uPainterySize.value = options.paintery.size * refScale
        u.uPainteryScreenBlend.value = options.paintery.screenBlend
        u.uPainteryDrift.value = options.paintery.drift
        u.uPainteryLayer2Scale.value = options.paintery.layer2Scale
        u.uPainteryBleed.value = options.paintery.bleed
    }
    if (options.seeThrough) {
        const st = options.seeThrough
        u.uSeeThroughActive.value = st.active ? 1 : 0
        u.uSeeThroughCenter.value.set(st.centerX, st.centerY)
        u.uSeeThroughRadius.value = st.radiusPx
        u.uSeeThroughDepth.value = st.cameraDist
        u.uSeeThroughInner.value = st.inner
        u.uSeeThroughCoreOpacity.value = st.coreOpacity
        u.uSeeThroughDepthBias.value = st.depthBias
    }
}
