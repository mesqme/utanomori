/**
 * Pool of secondary characters. One is drawn per spawn (in order), up to the
 * party cap. The music companions are rendered as the sheep model (see the
 * SheepCreature path in Companions.jsx); each entry supplies id/label/colours.
 */
// The first three (spawn order) are the music companions — each carries a `music` track id
// (see musicCharacters.js). The remainder are spares if the party cap ever grows.
export const companionPool = Object.freeze([
    { id: 'bun', label: 'Kanade', music: 'piano', bodyColor: '#f3ecff', accentColor: '#d9c9ff', pupilColor: '#2a2350', ears: 'round', scale: 0.92 },
    { id: 'ink', label: 'Hibiki', music: 'drums', bodyColor: '#2a2350', accentColor: '#3a2f63', pupilColor: '#fff8ff', ears: 'cat', scale: 0.86 },
    { id: 'sky', label: 'Kazane', music: 'winds', bodyColor: '#6fb7ff', accentColor: '#a9d6ff', pupilColor: '#0d0a2a', ears: 'none', scale: 0.8 },
    { id: 'plum', label: 'Plum', bodyColor: '#b58cff', accentColor: '#d3bcff', pupilColor: '#0d0a2a', ears: 'round', scale: 0.86 },
    { id: 'sun', label: 'Sun', bodyColor: '#ffd36e', accentColor: '#ffe6a8', pupilColor: '#3a2a10', ears: 'none', scale: 0.82 },
])
