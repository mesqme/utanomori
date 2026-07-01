// Shared Web Audio context plumbing. The actual sound now lives in musicTracks.js (the looping
// WAV backing layers) and gameSounds.js (the one-shot mini-game sounds); this module only owns the
// single AudioContext they all share, so everything stays on one clock and one user-gesture resume.
// (The old placeholder synth + spatial "voices" that used to live here were removed once real audio
// replaced them — only getAudioContext / resumeAudio are still used.)

let ctx = null
let master = null
let muted = false
let volume = 1.0 // 0..1 master level from the on-screen slider (mute overrides it to silence)

// Effective master gain: silence when muted or the slider is at 0, otherwise the slider level.
function masterTarget() {
    return muted || volume <= 0 ? 0.0001 : volume
}

function ensureContext() {
    if (typeof window === 'undefined') return null
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        ctx = new AC()
        // Single master gain — EVERY sound (music tracks, one-shots, ambient) routes through it, so
        // one knob mutes the whole experience (the on-screen sound toggle). 1.0 = full (sounds carry
        // their own levels); 0 = muted.
        master = ctx.createGain()
        master.gain.value = masterTarget()
        master.connect(ctx.destination)
        if (ctx.state === 'suspended') {
            const resume = () => {
                ctx.resume()
                window.removeEventListener('pointerdown', resume)
                window.removeEventListener('keydown', resume)
            }
            window.addEventListener('pointerdown', resume)
            window.addEventListener('keydown', resume)
        }
    }
    return ctx
}

export function resumeAudio() {
    const c = ensureContext()
    if (c && c.state === 'suspended') c.resume()
}

// Shared AudioContext for the real-sound modules (musicTracks / gameSounds / ambientSounds) so
// everything stays on one clock.
export function getAudioContext() {
    return ensureContext()
}

// The shared master gain — connect every sound here (instead of ctx.destination) so the on-screen
// sound toggle can mute everything at once.
export function getMasterGain() {
    ensureContext()
    return master
}

export function setAudioMuted(value) {
    muted = value
    const c = ensureContext()
    if (master && c) master.gain.setTargetAtTime(masterTarget(), c.currentTime, 0.02)
}

export function isAudioMuted() {
    return muted
}

// Master volume level (0..1) from the on-screen slider. Applied through the same master gain, so it
// scales EVERYTHING; a manual mute still overrides it to silence.
export function setAudioVolume(value) {
    volume = Math.max(0, Math.min(1, value))
    const c = ensureContext()
    if (master && c) master.gain.setTargetAtTime(masterTarget(), c.currentTime, 0.02)
}

export function getAudioVolume() {
    return volume
}
