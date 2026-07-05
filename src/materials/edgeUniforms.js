import * as THREE from 'three'

// Option A — stylized silhouette edge. One set of uniforms shared (by reference) across
// every stylized material (character, props, companions), so a single update reaches
// them all. The rim (where the surface turns away from the camera) dissolves into the
// background through the brush noise, giving a thin painterly oil/pastel contour.
export const edgeUniforms = {
    uEdgeEnabled: { value: 1 },
    uEdgeMode: { value: 1 }, // 0 = alpha blend, 1 = dither (alpha test)
    uEdgeColor: { value: new THREE.Color('#2a2342') },
    // Outgoing theme's edge colour (masked theme transitions) — set by the props' update path;
    // materials without the mask use the 4-arg paintedEdgeAlpha overload and never read it.
    uEdgeColorOld: { value: new THREE.Color('#2a2342') },
    uEdgeTint: { value: 0.6 },
    uEdgeWidth: { value: 2.0 },
    uEdgeBias: { value: 0.05 },
    uEdgeSoftness: { value: 0.12 },
    uEdgeNoiseScale: { value: 0.2 },
    uEdgeSharpness: { value: 1.0 },
}

// Materials that carry the edge — tracked so we can flip `transparent` when the mode
// changes (alpha blend needs transparency; dither stays opaque).
const edgeMaterials = new Set()

function applyTransparency(material) {
    const wantTransparent = edgeUniforms.uEdgeEnabled.value === 1 && edgeUniforms.uEdgeMode.value === 0
    if (material.transparent !== wantTransparent) {
        material.transparent = wantTransparent
        material.needsUpdate = true
    }
}

// Spread `...edgeUniforms` into a material's uniforms, then register it here.
export function registerEdgeMaterial(material) {
    edgeMaterials.add(material)
    applyTransparency(material)
    return material
}

export function unregisterEdgeMaterial(material) {
    edgeMaterials.delete(material)
}

export function updateEdgeUniforms(params) {
    edgeUniforms.uEdgeEnabled.value = params.enabled ? 1 : 0
    edgeUniforms.uEdgeMode.value = params.mode === 'Alpha' ? 0 : 1
    edgeUniforms.uEdgeColor.value.set(params.color)
    edgeUniforms.uEdgeTint.value = params.tint
    edgeUniforms.uEdgeWidth.value = params.width
    edgeUniforms.uEdgeBias.value = params.bias
    edgeUniforms.uEdgeSoftness.value = params.softness
    edgeUniforms.uEdgeNoiseScale.value = params.noiseScale
    edgeUniforms.uEdgeSharpness.value = params.sharpness ?? 1.0
    edgeMaterials.forEach(applyTransparency)
}
