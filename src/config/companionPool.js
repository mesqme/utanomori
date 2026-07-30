/**
 * Pool of secondary characters. One is drawn per spawn (in order), up to the
 * party cap. The music companions are rendered as the sheep model (see the
 * SheepCreature path in Companions.jsx), whose colours live in sheepMaterialParameters.
 */
// The first three (spawn order) are the music companions — each carries a `music` track id
// (see musicCharacters.js). The remainder are spares if the party cap ever grows.
export const companionPool = Object.freeze([
    { id: 'bun', label: 'Kiri', music: 'piano', scale: 0.92 },
    { id: 'ink', label: 'Miki', music: 'drums', scale: 0.86 },
    { id: 'sky', label: 'Tori', music: 'winds', scale: 0.8 },
    { id: 'plum', label: 'Plum', scale: 0.86 },
    { id: 'sun', label: 'Sun', scale: 0.82 },
])
