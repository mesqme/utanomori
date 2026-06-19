// The 7-note vocabulary for the companion song mini-game. Each note has a shown
// number (index + 1), a colour, and a frequency. The character "songs" are sequences
// of these note indices. Colours are placeholders — tweak freely.
export const NOTES = Object.freeze([
    { name: 'C', color: '#e85c5c' },
    { name: 'D', color: '#ef9f43' },
    { name: 'E', color: '#f2d24b' },
    { name: 'F', color: '#5fc46a' },
    { name: 'G', color: '#46c2c9' },
    { name: 'A', color: '#5b8def' },
    { name: 'B', color: '#b072e6' },
])

// C4 … B4 (Hz).
export const NOTE_FREQUENCIES = Object.freeze([261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88])

// Round lengths — the full song is 6 notes; round N "sings" the first 4 / 5 / 6.
export const ROUND_LENGTHS = Object.freeze([4, 5, 6])
export const SONG_LENGTH = 6

function hashSeed(text) {
    let hash = 2166136261
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

function mulberry32(a) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// Deterministic per-character song (stable across encounters), avoiding immediate
// repeats so the melody reads. Pass an explicit array on the companion to override.
export function getCompanionSong(id, length = SONG_LENGTH) {
    const rng = mulberry32(hashSeed(id ?? 'companion'))
    const song = []
    for (let i = 0; i < length; i++) {
        let n = Math.floor(rng() * NOTES.length)
        if (i > 0 && n === song[i - 1]) n = (n + 1) % NOTES.length
        song.push(n)
    }
    return song
}
