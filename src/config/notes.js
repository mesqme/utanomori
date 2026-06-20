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

// Shared tempo (seconds per beat). The looping song and the in-game playback both use
// it so they feel like the same melody at the same speed.
export const SONG_BEAT = 0.4

const CHORD_TONES = [0, 2, 4] // C E G — the C-major triad (all 7 notes are the C scale)
const RHYTHM_BAG = [0.5, 1, 1, 1, 1.5, 2] // beats per note

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

// Deterministic per-character melody (stable across encounters). Returns note indices
// plus a per-note rhythm (beats), built to sound harmonic: it starts on a chord tone,
// moves mostly stepwise with occasional leaps back to a chord tone, and resolves to the
// tonic — so when several companions loop together the lines stay consonant.
export function getCompanionSong(id, length = SONG_LENGTH) {
    const rng = mulberry32(hashSeed(id ?? 'companion'))
    const notes = []
    let current = CHORD_TONES[Math.floor(rng() * CHORD_TONES.length)]
    for (let i = 0; i < length; i++) {
        notes.push(current)
        if (i < length - 1) {
            if (rng() < 0.4) {
                current = CHORD_TONES[Math.floor(rng() * CHORD_TONES.length)]
            } else {
                const dir = rng() < 0.5 ? -1 : 1
                const step = rng() < 0.7 ? 1 : 2
                current = Math.min(NOTES.length - 1, Math.max(0, current + dir * step))
            }
        }
    }
    notes[length - 1] = 0 // resolve to the tonic (C)

    const beats = []
    for (let i = 0; i < length; i++) beats.push(RHYTHM_BAG[Math.floor(rng() * RHYTHM_BAG.length)])

    return { notes, beats }
}
