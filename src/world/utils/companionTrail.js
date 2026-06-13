/**
 * Leader breadcrumb trail — a shared arc-length buffer of the main character's
 * path. Followers sample it at a fixed distance behind, which makes them retrace
 * the exact route and replay running / jumping (the path Y carries jump arcs) as
 * a conga line. Module-level singleton: one trail, many followers.
 */
const MAX_SAMPLES = 512
const MIN_SEGMENT = 0.04

const samples = []
let totalDistance = 0
let lastRecorded = null

export function resetTrail(position) {
    samples.length = 0
    totalDistance = 0
    lastRecorded = null

    if (position) {
        lastRecorded = { x: position.x, y: position.y, z: position.z }
        samples.push({ x: position.x, y: position.y, z: position.z, dist: 0 })
    }
}

export function recordTrail(position) {
    if (!lastRecorded) {
        resetTrail(position)
        return
    }

    const dx = position.x - lastRecorded.x
    const dz = position.z - lastRecorded.z
    const horizontal = Math.hypot(dx, dz)
    if (horizontal < MIN_SEGMENT) return

    totalDistance += horizontal
    samples.push({ x: position.x, y: position.y, z: position.z, dist: totalDistance })
    lastRecorded.x = position.x
    lastRecorded.y = position.y
    lastRecorded.z = position.z

    if (samples.length > MAX_SAMPLES) samples.shift()
}

/**
 * Sample the path `distanceBehind` world units behind the leader's tip.
 * Writes into `out` (x, y, z, headingX, headingZ) and returns it, or null if the
 * trail is empty.
 */
export function sampleTrail(distanceBehind, out = {}) {
    if (samples.length === 0) return null

    const targetDistance = totalDistance - distanceBehind
    const oldest = samples[0]

    if (targetDistance <= oldest.dist) {
        out.x = oldest.x
        out.y = oldest.y
        out.z = oldest.z
        out.headingX = 0
        out.headingZ = 0
        return out
    }

    for (let i = samples.length - 1; i > 0; i--) {
        const a = samples[i - 1]
        const b = samples[i]
        if (a.dist <= targetDistance && b.dist >= targetDistance) {
            const span = Math.max(1e-5, b.dist - a.dist)
            const t = (targetDistance - a.dist) / span
            out.x = a.x + (b.x - a.x) * t
            out.y = a.y + (b.y - a.y) * t
            out.z = a.z + (b.z - a.z) * t
            const hx = b.x - a.x
            const hz = b.z - a.z
            const length = Math.hypot(hx, hz) || 1
            out.headingX = hx / length
            out.headingZ = hz / length
            return out
        }
    }

    const tip = samples[samples.length - 1]
    out.x = tip.x
    out.y = tip.y
    out.z = tip.z
    out.headingX = 0
    out.headingZ = 0
    return out
}

export function getTrailLength() {
    return totalDistance
}
