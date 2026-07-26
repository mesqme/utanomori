// How the world's outer edge dissolves into the sky, shared by every surface that reaches it:
// the ground, the grass and the props all read the same borderParameters.fadeMode and must agree,
// or the edge tears. The shaders switch on the int, so this is the one place the names map.
//
// 0 = Dither   — cut out with the Bayer threshold
// 2 = Paintery — dissolve along the brush texture (what ships)
// 1 was a "mix toward the sky colour" mode, dropped from the panel; the int is left unused rather
// than renumbered, because renumbering would change what every stored 0/2 means.
export function fadeModeToInt(mode) {
    return mode === 'Paintery' ? 2 : 0
}
