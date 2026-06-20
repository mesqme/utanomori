// Calm Web Audio placeholder synth for the companion song mini-game. No deps; all
// functions are safe no-ops when WebAudio is unavailable.
//
// Every singing companion registers a spatial "voice" (stereo panner + gain). A single
// global scheduler drives ALL voices off the shared audio clock, so their melodies are
// deterministic and never drift apart — the scene only changes each voice's gain/pan
// (distance + direction, or fully muted during the game). Notes are always scheduled on
// the shared timeline; muting just skips the (inaudible) oscillator while the playhead
// keeps advancing, so a voice is always in sync the instant it is unmuted.
import { NOTE_FREQUENCIES, SONG_BEAT } from '../config/notes.js'

let ctx = null
let master = null

const voices = new Set()
let scheduler = null
let schedulerStart = 0 // shared epoch (audio time) — set once, never reset

function ensureContext() {
    if (typeof window === 'undefined') return null
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        ctx = new AC()
        master = ctx.createGain()
        master.gain.value = 0.5
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

// One note (soft triangle through a lowpass + attack/release envelope) into a node.
function playNoteInto(dest, index, { when = 0, at = null, duration = 0.6, gain = 0.5 } = {}) {
    const c = ensureContext()
    if (!c || !dest) return
    const freq = NOTE_FREQUENCIES[index] ?? 440
    const t0 = at != null ? at : c.currentTime + Math.max(0, when)

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

// ----- Global scheduler + spatial voices -----

// Place a freshly-registered voice onto the shared timeline at the current moment, so it
// joins already in sync with the others (same epoch, same tempo grid).
function alignVoice(voice, now) {
    const loopBeats = voice.beats && voice.beats.length ? voice.beats.reduce((a, b) => a + (b || 1), 0) : voice.notes.length
    const loopDur = Math.max(loopBeats * SONG_BEAT, 1e-3)
    const elapsed = now - schedulerStart
    if (elapsed <= 0) {
        voice.nextTime = schedulerStart
        voice.nextIndex = 0
    } else {
        const loops = Math.floor(elapsed / loopDur)
        voice.nextTime = schedulerStart + loops * loopDur
        voice.nextIndex = loops * voice.notes.length
        while (voice.nextTime < now) {
            voice.nextTime += noteSpacing(voice.beats, voice.nextIndex)
            voice.nextIndex++
        }
    }
}

function ensureScheduler() {
    const c = ensureContext()
    if (!c || scheduler) return
    schedulerStart = c.currentTime + 0.15
    scheduler = setInterval(() => {
        if (!ctx || ctx.state !== 'running') return // wait for the first user gesture
        const now = ctx.currentTime
        const horizon = now + 0.2
        voices.forEach((voice) => {
            if (!voice.notes || voice.notes.length === 0) return
            if (voice.nextTime === null) alignVoice(voice, now)
            while (voice.nextTime < horizon) {
                const spacing = noteSpacing(voice.beats, voice.nextIndex)
                if (voice.gainValue > 0.0008) {
                    playNoteInto(voice.dest, voice.notes[voice.nextIndex % voice.notes.length], { at: voice.nextTime, duration: spacing * voice.legato, gain: 0.7 })
                }
                voice.nextTime += spacing
                voice.nextIndex++
            }
        })
    }, 30)
}

export function createVoice(notes, beats, { legato = 1.4 } = {}) {
    const c = ensureContext()
    if (!c) return null
    const gain = c.createGain()
    gain.gain.value = 0.00001
    gain.connect(master)
    const panner = c.createStereoPanner ? c.createStereoPanner() : null
    if (panner) panner.connect(gain)
    const voice = { c, gain, panner, dest: panner ?? gain, notes, beats, legato, gainValue: 0, nextTime: null, nextIndex: 0 }
    voices.add(voice)
    ensureScheduler()
    return voice
}

// pan ∈ [-1,1] (left→right) and final linear gain (distance / mute). Never stops the loop.
export function setVoiceSpatial(voice, { pan = 0, gain = 0.1 } = {}) {
    if (!voice) return
    if (voice.panner) voice.panner.pan.value = Math.max(-1, Math.min(1, pan))
    voice.gainValue = gain
    voice.gain.gain.setTargetAtTime(Math.max(0.00001, gain), voice.c.currentTime, 0.06)
}

export function disposeVoice(voice) {
    if (!voice) return
    voices.delete(voice)
    try {
        voice.gain.disconnect()
        if (voice.panner) voice.panner.disconnect()
    } catch {
        // already disconnected
    }
}

// The note this voice is sounding right now (or null when muted / not running), with a
// unique `key` per note instance so visuals can spawn exactly when a new note begins.
export function voiceCurrentNote(voice) {
    if (!voice || !ctx || ctx.state !== 'running') return null
    if (voice.gainValue <= 0.0008) return null
    if (!voice.notes || voice.notes.length === 0) return null
    const elapsed = ctx.currentTime - schedulerStart
    if (elapsed < 0) return null
    const loopBeats = voice.beats && voice.beats.length ? voice.beats.reduce((a, b) => a + (b || 1), 0) : voice.notes.length
    const loopDur = Math.max(loopBeats * SONG_BEAT, 1e-3)
    const loops = Math.floor(elapsed / loopDur)
    const pos = elapsed - loops * loopDur
    let acc = 0
    let idx = 0
    for (; idx < voice.notes.length; idx++) {
        const spacing = noteSpacing(voice.beats, idx)
        if (pos < acc + spacing) break
        acc += spacing
    }
    if (idx >= voice.notes.length) idx = voice.notes.length - 1
    return { index: voice.notes[idx], key: loops * voice.notes.length + idx }
}
