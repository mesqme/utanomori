// Extra see-through subjects for the music-stone game: every stone acts like the hero — props
// (trees) in front of them fade away so the stones stay visible (tall trees can otherwise cover
// even the highest stones). MusicStones projects each stone to a screen disc + camera depth here;
// the prop material reads it and the prop fragment fades fragments that sit in front of any of
// them (multi-source see-through). Sized for the full set of music stones.
export const MAX_STONE_SEE_THROUGH = 7

export const musicStoneSeeThrough = {
    count: 0,
    // [centerX(px), centerY(px), radiusPx, cameraDist] × MAX_STONE_SEE_THROUGH
    data: new Float32Array(MAX_STONE_SEE_THROUGH * 4),
}

export function clearMusicStoneSeeThrough() {
    musicStoneSeeThrough.count = 0
}
