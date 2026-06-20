// Calm Web Audio placeholder synth for the companion song mini-game. No deps; all
// functions are safe no-ops when WebAudio is unavailable. Swap the oscillator internals
// for real audio files later.
//
// Each singing companion gets a spatial "voice" (a stereo panner + gain) that loops its
// melody; the scene updates pan (direction) + gain (distance) every frame so you can
// hear where the song comes from and the lines layer as you collect companions.
import { NOTE_FREQUENCIES, SONG_BEAT } from '../config/notes.js'

let ctx = null
let master = null

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

// One note (soft triangle through a lowpass + attack/release envelope) into a node.
function playNoteInto(dest, index, { when = 0, duration = 0.6, gain = 0.5 } = {}) {
    const c = ensureContext()
    if (!c || !dest) return
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
    g.connect(dest)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
}

// Non-spatial note (centred) — used by the game UI (wheel clicks, listen playback).
export function playNote(index, options) {
    ensureContext()
    playNoteInto(master, index, options)
}

function noteSpacing(beats, index) {
    const beat = beats ? beats[index % beats.length] ?? 1 : 1
    return beat * SONG_BEAT
}

// Play a whole song once, centred (a little celebratory hum when a companion joins).
export function playMelody(notes, { beats = null, gain = 0.3, legato = 1.3 } = {}) {
    if (!notes || notes.length === 0) return
    let t = 0
    notes.forEach((note, i) => {
        const spacing = noteSpacing(beats, i)
        playNote(note, { when: t, duration: spacing * legato, gain })
        t += spacing
    })
}

// ----- Spatial looping voices (one per singing companion) -----

export function createVoice() {
    const c = ensureContext()
    if (!c) return null
    const gain = c.createGain()
    gain.gain.value = 0.0001
    gain.connect(master)
    const panner = c.createStereoPanner ? c.createStereoPanner() : null
    if (panner) panner.connect(gain)
    return { c, gain, panner, dest: panner ?? gain, timer: null, stopped: true, legato: 1.4 }
}

// Loop the melody forever (free-running at the shared tempo + rhythm, notes overlapping).
export function startVoice(voice, notes, beats, { legato = 1.4 } = {}) {
    if (!voice || !notes || notes.length === 0) return
    stopVoiceLoop(voice)
    voice.stopped = false
    voice.legato = legato
    let i = 0
    const step = () => {
        if (voice.stopped) return
        const idx = i % notes.length
        const spacing = noteSpacing(beats, idx)
        playNoteInto(voice.dest, notes[idx], { duration: spacing * voice.legato, gain: 0.7 })
        i++
        voice.timer = setTimeout(step, spacing * 1000)
    }
    step()
}

// Update where the voice sits: pan ∈ [-1,1] (left→right) and final linear gain (distance).
export function setVoiceSpatial(voice, { pan = 0, gain = 0.1 } = {}) {
    if (!voice) return
    if (voice.panner) voice.panner.pan.value = Math.max(-1, Math.min(1, pan))
    voice.gain.gain.setTargetAtTime(Math.max(0.00001, gain), voice.c.currentTime, 0.06)
}

export function stopVoiceLoop(voice) {
    if (!voice) return
    voice.stopped = true
    if (voice.timer) {
        clearTimeout(voice.timer)
        voice.timer = null
    }
}

export function disposeVoice(voice) {
    if (!voice) return
    stopVoiceLoop(voice)
    try {
        voice.gain.disconnect()
        if (voice.panner) voice.panner.disconnect()
    } catch {
        // already disconnected
    }
}
