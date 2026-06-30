// The three music companions. Each owns a full backing track (played from GO, volume managed)
// and a small set of unique one-shot sounds used in its mini-game. The mini-game shows ONE stone
// per UNIQUE sound; the melody is a sequence of those sounds (with repeats — you click the same
// stone again). Rounds reveal a growing prefix of the melody: [len-2, len-1, len].
//
// `melody` lists indices into the unique sounds (0-based). `rounds` are derived from its length.

function roundsFor(melodyLength) {
    return [melodyLength - 2, melodyLength - 1, melodyLength]
}

export const MUSIC_CHARACTERS = {
    piano: {
        track: 'piano', // backing track + sound-file prefix
        soundCount: 4, // unique sounds → stone count
        melody: [0, 1, 2, 3], // piano_01..04
        rounds: roundsFor(4), // [2, 3, 4]
        prompt: 'I am Kiri, the spirit of the morning mist. Would you like to listen to my song?',
    },
    drums: {
        track: 'drums',
        soundCount: 3,
        melody: [0, 1, 2, 0, 1], // drums_01,02,03,01,02
        rounds: roundsFor(5), // [3, 4, 5]
        prompt: 'I am Miki, the spirit of the old trees. Would you like to listen to my song?',
    },
    winds: {
        track: 'winds',
        soundCount: 6,
        melody: [0, 1, 2, 3, 4, 5, 1], // winds_01..06, winds_02
        rounds: roundsFor(7), // [5, 6, 7]
        prompt: 'I am Tori, the spirit of the birds. Would you like to listen to my song?',
    },
}

// Spawn order maps companionPool[0..2] → these tracks (see companionPool.music).
export const MUSIC_ORDER = ['piano', 'drums', 'winds']

export function getMusicCharacter(id) {
    return MUSIC_CHARACTERS[id] ?? null
}
