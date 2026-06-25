import { create } from 'zustand'
import { getMusicCharacter } from '../config/musicCharacters.js'

/**
 * Companion song mini-game state machine (pure state — timers live in SongGame.jsx and the
 * celebrate/flee handoff lives in Companions.jsx).
 *
 * stage: idle → prompt → setup → countdown → playback → input → roundClear → (countdown…) → success | fail
 * (a 3·2·1 countdown precedes every round's playback)
 *
 * The mini-game now uses each character's real one-shot SOUNDS. There is ONE stone per UNIQUE
 * sound (random assignment each game); the melody is a sequence of those sounds (with repeats —
 * you click the same stone again), mapped to a stone sequence (`song`). No vanishing.
 */
const initialState = {
    active: false,
    stage: 'idle',
    companion: null, // the target definition (carries `music`)
    track: null, // 'piano' | 'drums' | 'winds'
    stoneSounds: [], // stone index → unique-sound index (random permutation)
    song: [], // the full melody as a STONE sequence the player must reproduce
    rounds: [], // notes per round, e.g. [2,3,4]
    round: 0,
    activeNote: null, // the STONE index currently "sung" (or null)
    input: [], // stone indices entered this round
    wheelOpen: false,
}

// Fisher–Yates shuffle of [0..n-1].
function shuffledRange(n) {
    const arr = Array.from({ length: n }, (_, i) => i)
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
    }
    return arr
}

const useSongGame = create((set, get) => ({
    ...initialState,

    // E / prompt → ask "are you ready?". Builds this game's random stone→sound assignment + the
    // stone sequence to reproduce, from the companion's music config.
    begin: (companion) => {
        const config = getMusicCharacter(companion?.music)
        if (!config) {
            set({ ...initialState, active: true, stage: 'prompt', companion })
            return
        }
        const stoneSounds = shuffledRange(config.soundCount) // stone i → sound stoneSounds[i]
        const soundToStone = []
        stoneSounds.forEach((sound, stone) => {
            soundToStone[sound] = stone
        })
        const song = config.melody.map((sound) => soundToStone[sound]) // melody as a stone sequence
        set({
            ...initialState,
            active: true,
            stage: 'prompt',
            companion,
            track: config.track,
            stoneSounds,
            song,
            rounds: config.rounds,
        })
    },

    // Yes → stage the stones (rise + camera), then SongGame advances to playback.
    confirmReady: () => set({ stage: 'setup', input: [], activeNote: null, wheelOpen: false }),

    // Setup finished (stones are up) → run the 3·2·1 countdown before the first playback.
    startPlayback: () => set({ stage: 'countdown' }),

    // Countdown elapsed → the companion sings this round's melody.
    startMelody: () => set({ stage: 'playback' }),

    setActiveNote: (index) => set({ activeNote: index }),

    openWheel: () => set({ stage: 'input', wheelOpen: true, activeNote: null }),

    // Validate a clicked stone against the expected stone sequence for this round.
    pressNote: (stoneIndex) => {
        const { stage, song, round, input, rounds } = get()
        if (stage !== 'input') return
        const length = rounds[round] ?? song.length
        if (stoneIndex !== song[input.length]) {
            set({ stage: 'fail', wheelOpen: false, activeNote: null })
            return
        }
        const nextInput = [...input, stoneIndex]
        if (nextInput.length >= length) {
            const lastRound = round >= rounds.length - 1
            set({ input: nextInput, wheelOpen: false, stage: lastRound ? 'success' : 'roundClear' })
        } else {
            set({ input: nextInput })
        }
    },

    nextRound: () => set((s) => ({ round: s.round + 1, stage: 'countdown', input: [], activeNote: null, wheelOpen: false })),

    reset: () => set({ ...initialState }),
}))

export default useSongGame
