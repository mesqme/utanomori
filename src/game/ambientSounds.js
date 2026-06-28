// Ambient + character + footstep sounds, all on the shared AudioContext (so they resume on the
// same GO gesture as the music). Safe no-ops until the buffers decode / WebAudio is available.
//
//   • wind / cicadas — persistent looping layers, gain ramped by the AmbientController
//   • owls (far / close) — a self-scheduling random pool: fade in → hold the whole clip →
//     fade out → wait a random gap → pick another (each clip is more than just the hoot, so the
//     fades let the bedded ambience breathe)
//   • capucine_mumble / capucin_sad — one-shots fired on conversation / flee
//   • footsteps — one-shots fired on a cadence while the hero walks (plain OR grass pair)
import { getAudioContext } from './songAudio.js'

import windUrl from '../assets/audio/sounds/wind.wav'
import cicadesUrl from '../assets/audio/sounds/cicades.wav'
import owlFarUrl from '../assets/audio/sounds/owlFar.wav'
import owlCloseUrl from '../assets/audio/sounds/owlClose.wav'
import mumbleUrl from '../assets/audio/sounds/capucine_mumble.wav'
import sadUrl from '../assets/audio/sounds/capucin_sad.wav'
import sigh01 from '../assets/audio/sounds/sigh_01.wav'
import sigh02 from '../assets/audio/sounds/sigh_02.wav'
import sigh03 from '../assets/audio/sounds/sigh_03.wav'
import sigh04 from '../assets/audio/sounds/sigh_04.wav'
import footstep01 from '../assets/audio/sounds/footstep_01.wav'
import footstep02 from '../assets/audio/sounds/footstep_02.wav'
import footstepGrass01 from '../assets/audio/sounds/footstepGrass_01.wav'
import footstepGrass02 from '../assets/audio/sounds/footstepGrass_02.wav'

const URLS = {
    wind: windUrl,
    cicades: cicadesUrl,
    owlFar: owlFarUrl,
    owlClose: owlCloseUrl,
    mumble: mumbleUrl,
    sad: sadUrl,
    sigh_0: sigh01,
    sigh_1: sigh02,
    sigh_2: sigh03,
    sigh_3: sigh04,
    footstep_0: footstep01,
    footstep_1: footstep02,
    footstepGrass_0: footstepGrass01,
    footstepGrass_1: footstepGrass02,
}

const buffers = {} // name → AudioBuffer | undefined
let loadStarted = false

export function preloadAmbientSounds() {
    if (loadStarted) return
    const c = getAudioContext()
    if (!c) return
    loadStarted = true
    for (const [name, url] of Object.entries(URLS)) {
        fetch(url)
            .then((r) => r.arrayBuffer())
            .then((ab) => c.decodeAudioData(ab))
            .then((buf) => {
                buffers[name] = buf
            })
            .catch(() => {})
    }
}

// ----- Looping layers (wind, cicadas) -----
const loops = {} // name → { src, gain }

function ensureLoop(name) {
    if (loops[name]) return loops[name]
    const c = getAudioContext()
    const buf = buffers[name]
    if (!c || !buf) return null
    const src = c.createBufferSource()
    src.buffer = buf
    src.loop = true
    const gain = c.createGain()
    gain.gain.value = 0.0001
    src.connect(gain)
    gain.connect(c.destination)
    try {
        src.start()
    } catch {
        // already started / no context
    }
    loops[name] = { src, gain }
    return loops[name]
}

function setLoopGain(name, volume, smoothing = 0.35) {
    const loop = ensureLoop(name)
    if (!loop) return
    const c = getAudioContext()
    loop.gain.gain.setTargetAtTime(Math.max(0.0001, volume), c.currentTime, smoothing)
}

export const setWindGain = (v) => setLoopGain('wind', v)
export const setCicadaGain = (v) => setLoopGain('cicades', v)

// ----- Owls (random far/close pool, fade in → hold → fade out → gap) -----
let owlPeak = 0
let owlCfg = { minGap: 5, maxGap: 14, fade: 1.5 }
let owlRunning = false
let owlTimer = null

function scheduleNextOwl() {
    if (!owlRunning) return
    const c = getAudioContext()
    const which = Math.random() < 0.5 ? 'owlFar' : 'owlClose'
    const buf = buffers[which]
    // Not loaded yet, or muted (owls off) → check again shortly without playing.
    if (!c || !buf || owlPeak <= 0.001) {
        owlTimer = setTimeout(scheduleNextOwl, 1500)
        return
    }
    const src = c.createBufferSource()
    src.buffer = buf
    const gain = c.createGain()
    const t0 = c.currentTime
    const dur = buf.duration
    const fade = Math.min(owlCfg.fade, dur * 0.45)
    const peak = Math.max(0.0001, owlPeak)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.linearRampToValueAtTime(peak, t0 + fade)
    gain.gain.setValueAtTime(peak, t0 + Math.max(fade, dur - fade))
    gain.gain.linearRampToValueAtTime(0.0001, t0 + dur)
    src.connect(gain)
    gain.connect(c.destination)
    try {
        src.start()
    } catch {
        // no context
    }
    const gap = owlCfg.minGap + Math.random() * Math.max(0, owlCfg.maxGap - owlCfg.minGap)
    owlTimer = setTimeout(scheduleNextOwl, (dur + gap) * 1000)
}

export function startOwlSequence(cfg) {
    if (cfg) owlCfg = { ...owlCfg, ...cfg }
    if (owlRunning) return
    owlRunning = true
    scheduleNextOwl()
}

export function setOwlPeak(v) {
    owlPeak = v
}

export function setOwlConfig(cfg) {
    if (cfg) owlCfg = { ...owlCfg, ...cfg }
}

// ----- One-shots (character + footsteps) -----
function playOneShot(name, gain = 0.9) {
    const c = getAudioContext()
    const buf = buffers[name]
    if (!c || !buf) return
    const src = c.createBufferSource()
    src.buffer = buf
    const g = c.createGain()
    g.gain.value = gain
    src.connect(g)
    g.connect(c.destination)
    try {
        src.start()
    } catch {
        // no context
    }
}

export const playMumble = (gain = 0.9) => playOneShot('mumble', gain)
export const playSad = (gain = 0.9) => playOneShot('sad', gain)

// The chosen sigh (sigh_01..04, index 0..3) — the hero's intro dialogue.
export function playSigh(index = 0, gain = 0.9) {
    const i = Math.max(0, Math.min(3, Math.round(index)))
    playOneShot(`sigh_${i}`, gain)
}

// pair: 'grass' | 'plain'; index: 0 | 1 (the two samples are alternated for a left/right gait).
export function playFootstep(pair, index, gain = 0.4) {
    const prefix = pair === 'grass' ? 'footstepGrass_' : 'footstep_'
    playOneShot(`${prefix}${index % 2}`, gain)
}
