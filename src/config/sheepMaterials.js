// The three music companions, keyed by their `music` track (piano = 1st, drums = 2nd, winds = 3rd).
// Each carries its own body / wool / leg base colours. The ids match the glb material NAMES
// (orange = body, white = wool/mask, brown = legs/horns), so a mesh's material.name maps straight
// to a colour. Only baseColor is consumed by the stylized material (painterly settings are shared).
export const sheepCharacterDefaults = Object.freeze({
    piano: { orange: '#20b08a', white: '#efe7f7', brown: '#51804e' },
    drums: { orange: '#2a7ab0', white: '#e7eaf7', brown: '#4e6580' },
    winds: { orange: '#6ab048', white: '#eef7e7', brown: '#5b8040' },
})
