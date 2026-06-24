// Extra see-through subjects for the music-stone game: the bottom side stones act like the hero
// — props (trees) in front of them fade away so the stones stay visible. MusicStones projects
// each participating stone to a screen disc + camera depth here; the prop material reads it and
// the prop fragment fades fragments that sit in front of any of them (multi-source see-through).
export const MAX_STONE_SEE_THROUGH = 4

export const musicStoneSeeThrough = {
    count: 0,
    // [centerX(px), centerY(px), radiusPx, cameraDist] × MAX_STONE_SEE_THROUGH
    data: new Float32Array(MAX_STONE_SEE_THROUGH * 4),
}

export function clearMusicStoneSeeThrough() {
    musicStoneSeeThrough.count = 0
}
