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
