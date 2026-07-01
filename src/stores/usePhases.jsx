import { create } from 'zustand'

// Game-cycle phases:
//   loading → warmup (GO) → intro (camera travel + dialogue) → start (gameplay)
//   → finale (party complete: final line) → credits → restarting (cinematic reverse) → warmup, or
//   credits → start (continue).
// In debug mode the cycle is skipped: loading → start (scene immediately playable).
export const PHASES = {
    loading: 'loading',
    warmup: 'warmup',
    intro: 'intro',
    start: 'start',
    finale: 'finale', // party complete → camera eases to the hero, one closing line, then credits
    credits: 'credits',
    restarting: 'restarting', // the cinematic teardown (camera up + fades) while the hero waits in place
    resettling: 'resettling', // loading-circle curtain masks the instant snap back to origin → warmup
}

const usePhases = create((set) => ({
    phase: PHASES.loading,
    debugMode: false, // true = jump straight into gameplay; false = run the full cycle
    creditsShown: false, // guards against re-rolling credits after "Continue"
    // Set true once the 3D scene has actually rendered a frame (MainCharacter's first useFrame). The
    // loader waits for this before lifting, so the curtain never reveals a not-yet-drawn hero (blink).
    sceneReady: false,
    setSceneReady: (sceneReady) => set({ sceneReady }),
    setPhase: (phase) => set({ phase }),
    setDebugMode: (debugMode) => set({ debugMode }),
    setCreditsShown: (creditsShown) => set({ creditsShown }),
    resetPhase: () => set({ phase: PHASES.loading }),
}))

export default usePhases
