// Shared Web Audio context plumbing. The actual sound now lives in musicTracks.js (the looping
// WAV backing layers) and gameSounds.js (the one-shot mini-game sounds); this module only owns the
// single AudioContext they all share, so everything stays on one clock and one user-gesture resume.
// (The old placeholder synth + spatial "voices" that used to live here were removed once real audio
// replaced them — only getAudioContext / resumeAudio are still used.)

let ctx = null
let master = null
let muted = false

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
        master.gain.value = muted ? 0.0001 : 1.0
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
    if (master && c) master.gain.setTargetAtTime(value ? 0.0001 : 1.0, c.currentTime, 0.02)
}

export function isAudioMuted() {
    return muted
}
