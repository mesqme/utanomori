import { PHASES } from '../stores/usePhases.jsx'
import { INTRO_TRAVEL_DURATION } from './gameConfig.js'

function moveToward(current, target, maxStep) {
    if (current < target) return Math.min(target, current + maxStep)
    if (current > target) return Math.max(target, current - maxStep)
    return current
}

export function updatePhaseTextureReveal(current, phase, delta) {
    if (phase === PHASES.loading || phase === PHASES.warmup) return 0
    if (phase === PHASES.intro) return moveToward(current, 1, (1 / INTRO_TRAVEL_DURATION) * delta)
    return 1
}

const NOISE_FADE_DURATION = 1.5 // seconds the grain fades in once the scene is shown

// The film grain reveals on its own clock: it fades in as soon as the 3D scene appears (warmup,
// before GO) — NOT during the intro camera travel like the texture / stars / glow reveal above.
export function updateNoiseReveal(current, phase, delta) {
    if (phase === PHASES.loading) return 0
    if (phase === PHASES.warmup) return moveToward(current, 1, (1 / NOISE_FADE_DURATION) * delta)
    return 1
}
