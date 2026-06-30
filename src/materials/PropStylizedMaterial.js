import * as THREE from 'three'

import propVertexShader from '../shaders/prop/vertex.glsl'
import propFragmentShader from '../shaders/prop/fragment.glsl'
import { fadeModeToInt } from './TerrainMaterial.jsx'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'
import { edgeUniforms, registerEdgeMaterial } from './edgeUniforms.js'
import { screenPainteryUniforms } from '../world/utils/screenPaintery.js'

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
            ...screenPainteryUniforms,
            uPainteryScreenBlend: { value: 0.85 },
            uPainteryDrift: { value: 0.12 },
            uPainteryLayer2Scale: { value: 2.2 },
            uPainteryBleed: { value: 0.35 },
            uCircleCenter: { value: new THREE.Vector3() },
            uCircleRadiusFactor: { value: 0.07 },
            uPropChunkSize: { value: 9 },
            uPropFadeOffset: { value: 2.5 },
            // Tree wind sway (vertex bend; only vertices with aWind = 1 move).
            uTime: { value: 0 },
            uWindDir: { value: new THREE.Vector2(1, 0) },
            uWindStrength: { value: 0 },
            uWindSpeed: { value: 1 },
            uWindGust: { value: 0.5 },
            uSeeThroughActive: { value: 0 },
            uSeeThroughCenter: { value: new THREE.Vector2() },
            uSeeThroughRadius: { value: 120 },
            uSeeThroughDepth: { value: 20 },
            uSeeThroughInner: { value: 0.35 },
            uSeeThroughDepthBias: { value: 0.5 },
            uSeeThroughOpacityIntensity: { value: 0.7 },
            uSeeThroughTextureContrast: { value: 1.0 },
            uSeeThroughTextureScale: { value: 250 },
            // Extra see-through subjects: every music stone (see musicStoneSeeThrough).
            uStoneSeeThrough: { value: new Float32Array(7 * 4) },
            uStoneSeeThroughCount: { value: 0 },
            // Extra see-through subjects: the music characters / sheep (see characterSeeThrough).
            uCharSeeThrough: { value: new Float32Array(5 * 4) },
            uCharSeeThroughCount: { value: 0 },
            uPropRimEnabled: { value: 1 },
            uPropRimColorStone: { value: new THREE.Color('#cfc2ff') },
            uPropRimColorTrunk: { value: new THREE.Color('#cfc2ff') },
            uPropRimColorMushroom: { value: new THREE.Color('#cfc2ff') },
            uPropRimStrength: { value: 0.7 },
            uPropRimPower: { value: 2.5 },
            // Stone bottom gradient (applies only to scattered stones; vStone gates it).
            uStoneGradientEnabled: { value: 0 },
            uStoneGradientDark: { value: 0.45 },
            uStoneGradientColor: { value: new THREE.Color('#161335') },
            uStoneGradientColorStrength: { value: 0.5 },
            uStoneGradientHeight: { value: 0.65 },
            ...edgeUniforms,
        },
        toneMapped,
    })

    if (vertexColors) material.vertexColors = true

    return registerEdgeMaterial(material)
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
    if (options.propRim) {
        const r = options.propRim
        u.uPropRimEnabled.value = r.enabled ? 1 : 0
        u.uPropRimStrength.value = r.strength
        u.uPropRimPower.value = r.power
        if (r.color != null) {
            // Single colour → all three slots (the music stones use one material + one colour).
            u.uPropRimColorStone.value.set(r.color)
            u.uPropRimColorTrunk.value.set(r.color)
            u.uPropRimColorMushroom.value.set(r.color)
        } else {
            if (r.stoneColor) u.uPropRimColorStone.value.set(r.stoneColor)
            if (r.trunkColor) u.uPropRimColorTrunk.value.set(r.trunkColor)
            if (r.mushroomColor) u.uPropRimColorMushroom.value.set(r.mushroomColor)
        }
    }
    if (options.stoneGradient) {
        const s = options.stoneGradient
        u.uStoneGradientEnabled.value = s.enabled ? 1 : 0
        u.uStoneGradientDark.value = s.dark
        u.uStoneGradientColor.value.set(s.color)
        u.uStoneGradientColorStrength.value = s.colorStrength
        u.uStoneGradientHeight.value = s.height
    }
    if (options.paintery) {
        u.uPainterySize.value = options.paintery.size // CSS-locked (dpr applied in the shader)
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
        u.uSeeThroughDepthBias.value = st.depthBias
        u.uSeeThroughOpacityIntensity.value = st.opacityIntensity
        u.uSeeThroughTextureContrast.value = st.textureContrast
        u.uSeeThroughTextureScale.value = st.textureScale // CSS-locked (dpr applied in the shader)
    }
    // Extra music-stone see-through subjects (trees fade where a bottom stone is behind them).
    if (options.stoneSeeThrough) {
        u.uStoneSeeThrough.value = options.stoneSeeThrough.data
        u.uStoneSeeThroughCount.value = options.stoneSeeThrough.count
    } else {
        u.uStoneSeeThroughCount.value = 0
    }
    // Extra music-character see-through subjects (trees fade where a sheep is behind them).
    if (options.charSeeThrough) {
        u.uCharSeeThrough.value = options.charSeeThrough.data
        u.uCharSeeThroughCount.value = options.charSeeThrough.count
    } else {
        u.uCharSeeThroughCount.value = 0
    }
    // Tree wind (trees only — gated by aWind in the vertex shader).
    if (options.wind) {
        u.uTime.value = options.wind.time
        u.uWindDir.value.set(options.wind.dirX, options.wind.dirZ)
        u.uWindStrength.value = options.wind.strength
        u.uWindSpeed.value = options.wind.speed
        u.uWindGust.value = options.wind.gust
    }
}
