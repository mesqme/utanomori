import * as THREE from 'three'

import { PAINTERY_TEXTURE_URLS } from '../../config/painteryTextures.js'

// Shared state of the LIVE (in-shader) theme transition — see shaders/includes/themeMask.glsl. While
// active, every themed material mixes its OLD values (the `old` snapshot, captured at switch time)
// toward the live store values by the per-fragment screen-space mask, so the whole world keeps
// moving during the Portal switch. Driven by game/themeTransition.js.
export const themeMask = {
    active: false,
    progress: 0, // 0 → 1 (gsap-tweened)
    old: null, // snapshot of the themed values the dual materials need (see captureThemeSnapshot)
}

// One brush texture shared by every material's mask (consistent torn edge across ground/sky/props).
const brushTexture = new THREE.TextureLoader().load(PAINTERY_TEXTURE_URLS.paintaryAlpha)
brushTexture.wrapS = THREE.RepeatWrapping
brushTexture.wrapT = THREE.RepeatWrapping
brushTexture.colorSpace = THREE.NoColorSpace

// The ONE set of mask uniforms, shared by every themed material (the edgeUniforms pattern):
// spreading this into a material's uniforms shares the SAME `{ value }` objects, so the single
// per-frame updateThemeMask() call below reaches all of them — no per-material update plumbing,
// and a new themed material only needs the spread to be transition-correct.
export const themeMaskUniforms = {
    uThemeMaskActive: { value: 0 },
    uThemeMaskStyle: { value: 0 },
    uThemeMaskProgress: { value: 1 },
    uThemeMaskResolution: { value: new THREE.Vector2(1, 1) },
    uThemeMaskBrush: { value: brushTexture },
    uThemeMaskBand: { value: 0.15 },
    uThemeMaskTexScale: { value: 0.65 },
    uThemeMaskPerlinScale: { value: 6.5 },
    uThemeMaskPerlinDetail: { value: 1 },
}

// Per-frame (ONE call for the whole app — Terrain.jsx drives it): push the mask state + edge
// params (themeTransitionParameters) into the shared uniforms.
export function updateThemeMask(gl, params) {
    themeMaskUniforms.uThemeMaskActive.value = themeMask.active ? 1 : 0
    if (!themeMask.active) return
    themeMaskUniforms.uThemeMaskStyle.value = params.edgeStyle === 'Perlin' ? 1 : 0
    themeMaskUniforms.uThemeMaskProgress.value = themeMask.progress
    gl.getDrawingBufferSize(themeMaskUniforms.uThemeMaskResolution.value)
    themeMaskUniforms.uThemeMaskBand.value = params.band
    themeMaskUniforms.uThemeMaskTexScale.value = params.textureScale
    themeMaskUniforms.uThemeMaskPerlinScale.value = params.perlinScale
    themeMaskUniforms.uThemeMaskPerlinDetail.value = Math.round(params.perlinDetail)
}
