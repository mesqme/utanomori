import { create } from 'zustand'

// Game-cycle phases:
//   loading → warmup (GO) → intro (camera travel + dialogue) → start (gameplay)
//   → credits (after the party is complete) → back to warmup (restart) or start (continue).
// In debug mode the cycle is skipped: loading → start (scene immediately playable).
export const PHASES = {
    loading: 'loading',
    warmup: 'warmup',
    intro: 'intro',
    start: 'start',
    credits: 'credits',
}

const usePhases = create((set) => ({
    phase: PHASES.loading,
    debugMode: false, // true = jump straight into gameplay; false = run the full cycle
    creditsShown: false, // guards against re-rolling credits after "Continue"
    setPhase: (phase) => set({ phase }),
    setDebugMode: (debugMode) => set({ debugMode }),
    setCreditsShown: (creditsShown) => set({ creditsShown }),
    resetPhase: () => set({ phase: PHASES.loading }),
}))

export default usePhases
