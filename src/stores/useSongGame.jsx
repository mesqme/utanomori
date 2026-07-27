import { create } from 'zustand'
import { getMusicCharacter } from '../config/musicCharacters.js'
import { FAIL_LINES } from '../game/gameText.js'

/**
 * Companion song mini-game state machine (pure state — timers live in SongGame.jsx and the
 * celebrate/flee handoff lives in Companions.jsx).
 *
 * stage: idle → prompt → setup → countdown → playback → input → roundClear → (countdown…) → success
 *                                                                        ↘ fail → failSpeech → flee
 * (a 3·2·1 countdown precedes every round's playback; a miss shows an exclamation, then the
 *  character's "not satisfied" speech, then it flees)
 *
 * The mini-game now uses each character's real one-shot SOUNDS. There is ONE stone per UNIQUE
 * sound (random assignment each game); the melody is a sequence of those sounds (with repeats —
 * you click the same stone again), mapped to a stone sequence (`song`). No vanishing.
 */

// Stones staged per game — one per stone colour (Game → Minigame → Note colours). Characters with
// fewer sounds than this get silent decoy stones in the leftover slots.
const BOARD_STONES = 6

const initialState = {
    active: false,
    stage: 'idle',
    companion: null, // the target definition (carries `music`)
    track: null, // 'piano' | 'drums' | 'winds'
    stoneSounds: [], // stone index → unique-sound index (or -1 for a silent decoy stone)
    stoneCount: 0, // how many stones to stage (always BOARD_STONES)
    song: [], // the full melody as a STONE sequence the player must reproduce
    rounds: [], // notes per round, e.g. [2,3,4]
    round: 0,
    activeNote: null, // the STONE index currently "sung" (or null)
    input: [], // stone indices entered this round
    lastPress: null, // { stone, correct, nonce } — last clicked stone result (drives feedback FX)
    pressNonce: 0, // bumped each press so repeats re-trigger the same-result flash
    failLine: null, // the funny-angry line the character says when you miss
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
        // Every board is a full six stones — one per stone colour. The character's real sounds are
        // scattered across random slots and the leftovers are silent decoys (a wrong click = miss).
        // Every music character has soundCount <= BOARD_STONES, so no sound is ever dropped.
        const soundCount = config.soundCount
        const stoneCount = BOARD_STONES
        const slots = shuffledRange(stoneCount) // random stone slot per real sound
        const stoneSounds = new Array(stoneCount).fill(-1) // stone i → sound index (or -1 = decoy)
        const soundToStone = []
        for (let sound = 0; sound < soundCount; sound++) {
            const stone = slots[sound]
            stoneSounds[stone] = sound
            soundToStone[sound] = stone
        }
        const song = config.melody.map((sound) => soundToStone[sound]) // melody as a stone sequence
        set({
            ...initialState,
            active: true,
            stage: 'prompt',
            companion,
            track: config.track,
            stoneSounds,
            stoneCount,
            song,
            rounds: config.rounds,
        })
    },

    // Yes → stage the stones (rise + camera), then SongGame advances to playback.
    confirmReady: () => set({ stage: 'setup', input: [], activeNote: null }),

    // Setup finished (stones are up) → run the 3·2·1 countdown before the first playback.
    startPlayback: () => set({ stage: 'countdown' }),

    // Countdown elapsed → the companion sings this round's melody.
    startMelody: () => set({ stage: 'playback' }),

    setActiveNote: (index) => set({ activeNote: index }),

    // Melody finished playing → hand over to the player (the stones become clickable).
    openInput: () => set({ stage: 'input', activeNote: null }),

    // Validate a clicked stone against the expected stone sequence for this round. Each press
    // publishes `lastPress` (with a bumping nonce) so the torus rings / arrow / character emote
    // can flash green (correct) or red (incorrect).
    pressNote: (stoneIndex) => {
        const { stage, song, round, input, rounds, pressNonce } = get()
        if (stage !== 'input') return
        const length = rounds[round] ?? song.length
        const correct = stoneIndex === song[input.length]
        const nonce = pressNonce + 1
        const lastPress = { stone: stoneIndex, correct, nonce }

        if (!correct) {
            set({
                stage: 'fail',
                activeNote: null,
                lastPress,
                pressNonce: nonce,
                failLine: FAIL_LINES[Math.floor(Math.random() * FAIL_LINES.length)],
            })
            return
        }

        const nextInput = [...input, stoneIndex]
        const base = { input: nextInput, lastPress, pressNonce: nonce }
        if (nextInput.length >= length) {
            const lastRound = round >= rounds.length - 1
            set({ ...base, stage: lastRound ? 'success' : 'roundClear' })
        } else {
            set(base)
        }
    },

    nextRound: () => set((s) => ({ round: s.round + 1, stage: 'countdown', input: [], activeNote: null })),

    // Fail flow: 'fail' (exclamation moment, stones still up) → 'failSpeech' (stones gone, the
    // character delivers its grumpy line up close) → 'flee' (it bolts; Companions relocates + resets).
    failSpeech: () => set({ stage: 'failSpeech' }),
    confirmFail: () => set({ stage: 'flee' }),

    reset: () => set({ ...initialState }),
}))

export default useSongGame
