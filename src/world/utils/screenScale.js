// Screen-space effects (paintery edge, background texture/stars, dithering, grain)
// are tuned against a 1080p drawing buffer. This factor rescales their pixel sizes
// to the actual buffer height so the look is identical on a 1440p / 4k monitor.
export const REFERENCE_HEIGHT = 1080

export function getRefScale(state) {
    return Math.max(0.001, (state.size.height * state.viewport.dpr) / REFERENCE_HEIGHT)
}
