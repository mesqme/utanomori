// Calm Web Audio placeholder synth for the companion song mini-game. No deps; all
// functions are safe no-ops when WebAudio is unavailable. Swap for real audio files
// later by replacing playNote / startAmbient internals.
import { NOTE_FREQUENCIES, SONG_BEAT } from '../config/notes.js'

let ctx = null
let master = null
let ambient = null // { stop() }

function ensureContext() {
    if (typeof window === 'undefined') return null
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        ctx = new AC()
        master = ctx.createGain()
        master.gain.value = 0.5
        master.connect(ctx.destination)
        // Browsers start the context suspended until a user gesture — resume on the next one.
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

// Play one note (a soft triangle through a lowpass + attack/release envelope).
export function playNote(index, { when = 0, duration = 0.6, gain = 0.5 } = {}) {
    const c = ensureContext()
    if (!c) return
    const freq = NOTE_FREQUENCIES[index] ?? 440
    const t0 = c.currentTime + Math.max(0, when)

    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq

    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1900

    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

    osc.connect(lp)
    lp.connect(g)
    g.connect(master)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
}

// Spacing for a note given its rhythm (beats), at the shared tempo.
function noteSpacing(beats, index) {
    const beat = beats ? beats[index % beats.length] ?? 1 : 1
    return beat * SONG_BEAT
}

// Play a whole song once (used as a little celebratory hum when a companion joins).
export function playMelody(notes, { beats = null, gain = 0.3, legato = 1.3 } = {}) {
    if (!notes || notes.length === 0) return
    let t = 0
    notes.forEach((note, i) => {
        const spacing = noteSpacing(beats, i)
        playNote(note, { when: t, duration: spacing * legato, gain })
        t += spacing
    })
}

// Quiet looping melody while you are near a singing character (placeholder ambient).
// Notes overlap (legato) so the line flows; the rhythm + tempo match the in-game playback.
export function startAmbient(notes, { beats = null, gain = 0.16, legato = 1.4 } = {}) {
    stopAmbient()
    const c = ensureContext()
    if (!c || !notes || notes.length === 0) return
    let i = 0
    let stopped = false
    const handle = { timer: null, stop: () => { stopped = true; if (handle.timer) clearTimeout(handle.timer) } }
    const step = () => {
        if (stopped) return
        const idx = i % notes.length
        const spacing = noteSpacing(beats, idx)
        playNote(notes[idx], { duration: spacing * legato, gain })
        i++
        handle.timer = setTimeout(step, spacing * 1000)
    }
    ambient = handle
    step()
}

export function stopAmbient() {
    if (ambient) {
        ambient.stop()
        ambient = null
    }
}
