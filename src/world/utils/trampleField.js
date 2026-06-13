/**
 * Trample registry — shared world positions of characters that press the grass
 * down. Each character owns a fixed slot and writes its position every frame; the
 * grass shader reads the whole array (uploaded as a vec4[] uniform) and scales /
 * leans / tints blades near any active trampler.
 *
 * Layout per slot: [x, y, z, active]. active = 0 means the slot is empty.
 */
export const MAX_TRAMPLERS = 8
export const TRAMPLE_SLOT_MAIN = 0
export const TRAMPLE_SLOT_TARGET = 1
export const TRAMPLE_SLOT_FOLLOWER = 2 // followers occupy 2, 3, 4, ... by party index

const data = new Float32Array(MAX_TRAMPLERS * 4)

export function setTrampler(slot, x, y, z) {
    if (slot < 0 || slot >= MAX_TRAMPLERS) return
    const offset = slot * 4
    data[offset] = x
    data[offset + 1] = y
    data[offset + 2] = z
    data[offset + 3] = 1
}

export function clearTrampler(slot) {
    if (slot < 0 || slot >= MAX_TRAMPLERS) return
    data[slot * 4 + 3] = 0
}

export function resetTramplers() {
    data.fill(0)
}

// The shared buffer is wired straight into the grass material uniform, so mutating
// it in place is enough — three re-uploads it each frame.
export function getTrampleData() {
    return data
}
