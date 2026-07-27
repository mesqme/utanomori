const BASE_SIZE_PX = 200
const BASE_RING_WIDTH_PX = 12
const BASE_PERCENT_FONT_PX = 48

export function useLoaderFixedSizeStyle(parameters = {}) {
    const radius = Math.max(1, parameters.circleRadius ?? BASE_SIZE_PX * 0.5)
    const ringWidth = Math.max(1, parameters.ringWidth ?? BASE_RING_WIDTH_PX)
    const ringEdge = Math.max(0.5, ringWidth - 1)

    return {
        '--sj-loader-size': `${radius * 2}px`,
        '--sj-loader-ring-width': `${ringWidth}px`,
        '--sj-loader-ring-edge': `${ringEdge}px`,
        '--sj-loader-percent-size': `${BASE_PERCENT_FONT_PX}px`,
    }
}
