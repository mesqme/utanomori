// Extra see-through subjects for the characters — the music sheep AND the main hero: props
// (trees / stones) AND the grass in front of a character fade so you can still see it through
// them. (This does NOT make the characters themselves transparent; it punches the paintary
// see-through hole into the PROPS + grass that occlude them.) The hero shares this buffer so the
// SAME see-through options drive the hero and the sheep, and the GRASS see-through can be toggled
// for all of them at once (see Terrain.jsx — gated by seeThrough.grassEnabled).
//
// Each writer (every SheepCreature + MainCharacter) is its own component, so there are several
// independent writers. To avoid a per-frame clear race, every writer claims a FIXED slot on mount
// and frees it on unmount; inactive / off-screen slots carry radius 0 and are skipped.
// Sized for up to 4 concurrent sheep + the hero.
export const MAX_CHARACTER_SEE_THROUGH = 5

const used = new Array(MAX_CHARACTER_SEE_THROUGH).fill(false)

export const characterSeeThrough = {
    count: MAX_CHARACTER_SEE_THROUGH, // fixed; inactive slots have radius 0 and are skipped
    // [centerX(px), centerY(px), radiusPx, cameraDist] × MAX_CHARACTER_SEE_THROUGH
    data: new Float32Array(MAX_CHARACTER_SEE_THROUGH * 4),
}

export function claimCharacterSeeThroughSlot() {
    for (let i = 0; i < MAX_CHARACTER_SEE_THROUGH; i++) {
        if (!used[i]) {
            used[i] = true
            characterSeeThrough.data[i * 4 + 2] = 0
            return i
        }
    }
    return -1
}

export function releaseCharacterSeeThroughSlot(slot) {
    if (slot < 0) return
    used[slot] = false
    characterSeeThrough.data[slot * 4 + 2] = 0
}

export function writeCharacterSeeThrough(slot, centerX, centerY, radiusPx, cameraDist) {
    if (slot < 0) return
    const o = slot * 4
    characterSeeThrough.data[o] = centerX
    characterSeeThrough.data[o + 1] = centerY
    characterSeeThrough.data[o + 2] = radiusPx
    characterSeeThrough.data[o + 3] = cameraDist
}

export function clearCharacterSeeThrough(slot) {
    if (slot < 0) return
    characterSeeThrough.data[slot * 4 + 2] = 0
}
