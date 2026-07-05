// The three music companions, keyed by their `music` track (piano = 1st, drums = 2nd, winds = 3rd).
// Each carries its own body / wool / leg base colours. The ids match the glb material NAMES
// (orange = body, white = wool/mask, brown = legs/horns), so a mesh's material.name maps straight
// to a colour. Only baseColor is consumed by the stylized material (painterly settings are shared).
export const sheepCharacterDefaults = Object.freeze({
    // Legs/horns (brown) are the SAME tan on all three companions, in every theme.
    piano: { orange: '#b938a5', white: '#efe7f7', brown: '#cda66b' },
    drums: { orange: '#259eda', white: '#e7eaf7', brown: '#cda66b' },
    winds: { orange: '#8db92f', white: '#eef7e7', brown: '#cda66b' },
})
