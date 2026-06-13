/**
 * Shared state of the world-reveal circle (the lit area around the hero that the
 * terrain / grass fade into at its edge). Terrain owns it and writes it every
 * frame; props read it to fade out at the same edge, and companion spawning reads
 * it to place friends inside the lit area.
 *
 * Visible radius (world units) ≈ chunkSize * radiusFactor.
 */
export const revealCircle = {
    centerX: 0,
    centerZ: 0,
    radiusFactor: 0.07,
    chunkSize: 9,
}

export function getRevealRadius() {
    return revealCircle.chunkSize * revealCircle.radiusFactor
}
