// Ground-shadow registry — the soft dark blobs under the hero + companions are now drawn DIRECTLY
// in the terrain (ground) fragment instead of as separate transparent decal meshes. The decals were
// transparent and sorted badly against the (also transparent) grass; the ground is opaque and reads
// correctly, and we only ever stand on the ground anyway.
//
// Each character writes its blob into a fixed slot every frame; the terrain shader reads the whole
// array (uploaded as a vec4[] uniform, like uTramplers) and darkens the ground around any active one.
// Slots reuse the trample slot indices (hero = 0, target = 1, followers = 2, 3, …).
//
// Layout per slot: [worldX, worldZ, radius, strength]. radius <= 0 OR strength <= 0 = inactive.
export const MAX_GROUND_SHADOWS = 6

const data = new Float32Array(MAX_GROUND_SHADOWS * 4)

export function setGroundShadow(slot, x, z, radius, strength) {
    if (slot < 0 || slot >= MAX_GROUND_SHADOWS) return
    const offset = slot * 4
    data[offset] = x
    data[offset + 1] = z
    data[offset + 2] = radius
    data[offset + 3] = strength
}

export function clearGroundShadow(slot) {
    if (slot < 0 || slot >= MAX_GROUND_SHADOWS) return
    data[slot * 4 + 2] = 0
    data[slot * 4 + 3] = 0
}

// The shared buffer is wired straight into the terrain material uniform, so mutating it in place is
// enough — three re-uploads it each frame.
export function getGroundShadowData() {
    return data
}
