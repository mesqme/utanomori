// Shared "see-through" state: occluders (grass, props) between the camera and the
// hero get a paintary-edged hole punched in them so the hero is always visible.
//
// MainCharacter projects the hero to the screen each frame and writes the live
// fields (centre / radius in framebuffer pixels, camera distance, active). The grass
// and prop materials read these into uniforms; their fragment shaders fade/cut away
// fragments that fall inside the screen disc and sit closer to the camera than the
// hero. Edited live by the See-Through Leva folder.
export const seeThrough = {
    // Tunables (Leva). These options are SHARED by the hero AND the music sheep — both punch the
    // same kind of paintary hole into props/grass that occlude them (worldRadius, inner, depthBias,
    // opacityIntensity, brush). `grassEnabled` toggles only the GRASS clearing (for hero + sheep);
    // the props always stay see-through so characters read behind trees/stones.
    enabled: true,
    grassEnabled: false, // also punch the hole into the GRASS in front of the hero + sheep. Ships
    // off: the grass is short enough to see over, so the clearing cost buys nothing.
    worldRadius: 2.5, // size of the hole in world units around the hero / sheep
    inner: 0.41, // 0..1 - core radius before the falloff begins
    depthBias: 0.5, // occluder must be at least this many world units in front
    opacityIntensity: 0.7, // 0 = object stays opaque, 1 = hero fully visible at the core
    textureContrast: 1.0, // shapes the brush → how the per-pixel transparency reads
    textureScale: 250, // see-through brush scale (px)

    // Live (written by MainCharacter each frame, in framebuffer pixels)
    centerX: 0,
    centerY: 0,
    radiusPx: 120,
    cameraDist: 20,
    active: false,
}

// Apply a style preset's see-through tunables to the live module (so the values in
// sceneStyles actually drive the experience, not just the module defaults).
export function applySeeThroughParameters(params) {
    if (!params) return
    if (params.enabled !== undefined) seeThrough.enabled = params.enabled
    if (params.grassEnabled !== undefined) seeThrough.grassEnabled = params.grassEnabled
    if (params.worldRadius !== undefined) seeThrough.worldRadius = params.worldRadius
    if (params.inner !== undefined) seeThrough.inner = params.inner
    if (params.depthBias !== undefined) seeThrough.depthBias = params.depthBias
    if (params.opacityIntensity !== undefined) seeThrough.opacityIntensity = params.opacityIntensity
    if (params.textureContrast !== undefined) seeThrough.textureContrast = params.textureContrast
    if (params.textureScale !== undefined) seeThrough.textureScale = params.textureScale
}
