// Screen-space effects (paintery edge, background texture/stars, dithering, grain)
// are tuned against a 1080p drawing buffer. This factor rescales their pixel sizes
// to the actual buffer height so the look is identical on a 1440p / 4k monitor.
export const REFERENCE_HEIGHT = 1080

export function getRefScale(state) {
    return Math.max(0.001, (state.size.height * state.viewport.dpr) / REFERENCE_HEIGHT)
}

// Resize-stable variant: scales with device-pixel-ratio ONLY, never with the live window
// height. CameraProjection locks a world object's on-screen pixel size across window
// resizes (resizing changes the FOV / how much world is visible, not object size), so its
// px-per-world-unit is ∝ dpr and constant under resize. A screen-space texture that should
// stay "glued" to world size must use this — getRefScale tracks buffer height and so makes
// the texture swim/rescale against the world as the window resizes.
export function getWorldLockScale(state) {
    return Math.max(0.001, state.viewport.dpr)
}
