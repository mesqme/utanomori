import { create } from 'zustand'
import { ROUND_LENGTHS } from '../config/notes.js'

/**
 * Companion song mini-game state machine (pure state — timers live in SongGame.jsx
 * and the celebrate/flee handoff lives in Companions.jsx).
 *
 * stage: idle → prompt → playback → input → roundClear → (playback…) → success | fail
 */
const initialState = {
    active: false,
    stage: 'idle',
    companion: null, // the target definition + its `song` (note indices)
    song: [],
    round: 0, // 0..2  → ROUND_LENGTHS[round] notes
    activeNote: null, // note index currently "sung" above the head, or null
    input: [], // note indices the player has entered this round
    wheelOpen: false,
}

const useSongGame = create((set, get) => ({
    ...initialState,

    // E / prompt → ask "are you ready?"
    begin: (companion) =>
        set({ ...initialState, active: true, stage: 'prompt', companion, song: companion?.song ?? [] }),

    // Yes → play the round.
    confirmReady: () => set({ stage: 'playback', input: [], activeNote: null, wheelOpen: false }),

    setActiveNote: (index) => set({ activeNote: index }),

    openWheel: () => set({ stage: 'input', wheelOpen: true, activeNote: null }),

    // Validate a clicked note against the expected sequence for this round.
    pressNote: (index) => {
        const { stage, song, round, input } = get()
        if (stage !== 'input') return
        const length = ROUND_LENGTHS[round] ?? song.length
        if (index !== song[input.length]) {
            set({ stage: 'fail', wheelOpen: false, activeNote: null })
            return
        }
        const nextInput = [...input, index]
        if (nextInput.length >= length) {
            const lastRound = round >= ROUND_LENGTHS.length - 1
            set({ input: nextInput, wheelOpen: false, stage: lastRound ? 'success' : 'roundClear' })
        } else {
            set({ input: nextInput })
        }
    },

    nextRound: () => set((s) => ({ round: s.round + 1, stage: 'playback', input: [], activeNote: null, wheelOpen: false })),

    reset: () => set({ ...initialState }),
}))

export default useSongGame
