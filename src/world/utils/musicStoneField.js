/**
 * Music-stone registry — shared world discs the grass clears around while they rise/sink
 * in the song mini-game. MusicStones writes each stone's current position + radius every
 * frame; the grass shader reads the whole array (uploaded as a vec4[] uniform) and clears /
 * leans blades around any active disc. Because the radius tracks the stone's animated scale,
 * the clearing grows and recovers in sync with the stone (no fixed pre-cleared ring).
 *
 * Layout per slot: [x, z, radius, active]. active = 0 means the slot is empty.
 */
export const MAX_MUSIC_STONES = 7

const data = new Float32Array(MAX_MUSIC_STONES * 4)

export function setMusicStone(index, x, z, radius) {
    if (index < 0 || index >= MAX_MUSIC_STONES) return
    const offset = index * 4
    data[offset] = x
    data[offset + 1] = z
    data[offset + 2] = radius
    data[offset + 3] = radius > 0.001 ? 1 : 0
}

export function clearMusicStone(index) {
    if (index < 0 || index >= MAX_MUSIC_STONES) return
    data[index * 4 + 3] = 0
}

export function clearAllMusicStones() {
    data.fill(0)
}

// The shared buffer is wired straight into the grass material uniform, so mutating it in
// place is enough — three re-uploads it each frame.
export function getMusicStoneData() {
    return data
}
