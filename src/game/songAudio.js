// Calm Web Audio placeholder synth for the companion song mini-game. No deps; all
// functions are safe no-ops when WebAudio is unavailable. Swap for real audio files
// later by replacing playNote / startAmbient internals.
import { NOTE_FREQUENCIES } from '../config/notes.js'

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

// Play a whole song once (used as a little celebratory hum when a companion joins).
export function playMelody(song, { cadence = 0.42, duration = 0.5, gain = 0.3 } = {}) {
    if (!song || song.length === 0) return
    song.forEach((note, i) => playNote(note, { when: i * cadence, duration, gain }))
}

// Quiet looping melody while you are near a singing character (placeholder ambient).
export function startAmbient(song, { noteDuration = 0.9, gap = 0.5, gain = 0.16 } = {}) {
    stopAmbient()
    const c = ensureContext()
    if (!c || !song || song.length === 0) return
    let i = 0
    let stopped = false
    const handle = { timer: null, stop: () => { stopped = true; if (handle.timer) clearTimeout(handle.timer) } }
    const step = () => {
        if (stopped) return
        playNote(song[i % song.length], { duration: noteDuration, gain })
        i++
        handle.timer = setTimeout(step, (noteDuration + gap) * 1000)
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
