// How the world's outer edge dissolves into the sky, shared by every surface that reaches it:
// the ground, the grass and the props all read the same borderParameters.fadeMode and must agree,
// or the edge tears. The shaders switch on the int, so this is the one place the names map.
//
// 0 = Dither   — cut out with the Bayer threshold
// 1 = Color    — mix toward the sky colour
// 2 = Paintery — dissolve along the brush texture (what ships)
export function fadeModeToInt(mode) {
    return mode === 'Color' ? 1 : mode === 'Paintery' ? 2 : 0
}
