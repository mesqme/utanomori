// Ambient + character + footstep sounds, all on the shared AudioContext (so they resume on the
// same GO gesture as the music). Safe no-ops until the buffers decode / WebAudio is available.
//
//   • cicadas — the persistent looping bed, gain ramped by the AmbientController
//   • owls (far / close) — a self-scheduling random pool: fade in → hold the whole clip →
//     fade out → wait a random gap → pick another (each clip is more than just the hoot, so the
//     fades let the bedded ambience breathe)
//   • spiritMumble / spiritSad — one-shots fired on conversation / flee
//   • footsteps — one-shots fired on a cadence while the hero walks (a grass pair)
import { getAudioContext, getMasterGain, loadAudioBuffer } from './songAudio.js'

import cicadesUrl from '../assets/audio/sounds/cicades.mp3'
import owlFarUrl from '../assets/audio/sounds/owlFar.mp3'
import owlCloseUrl from '../assets/audio/sounds/owlClose.mp3'
import mumbleUrl from '../assets/audio/sounds/spiritMumble.mp3'
import sadUrl from '../assets/audio/sounds/spiritSad.mp3'
import sighUrl from '../assets/audio/sounds/sigh_03.mp3'
import footstepGrass01 from '../assets/audio/sounds/footstepGrass_01.mp3'
import footstepGrass02 from '../assets/audio/sounds/footstepGrass_02.mp3'

const URLS = {
    cicades: cicadesUrl,
    owlFar: owlFarUrl,
    owlClose: owlCloseUrl,
    mumble: mumbleUrl,
    sad: sadUrl,
    sigh: sighUrl, // the one hero sigh (intro dialogue)
    footstepGrass_0: footstepGrass01, // grass footstep pair (the only footsteps used)
    footstepGrass_1: footstepGrass02,
}

const buffers = {} // name → AudioBuffer | undefined
let cicadaLoadStarted = false
let ambientLoadStarted = false

const CICADA_CROSSFADE = 2.0 // seconds blended across the loop seam (22s clip → ~20s seamless loop)

// Make a decoded buffer loop seamlessly: blend the last `crossfadeSec` onto the first `crossfadeSec`
// with an equal-power fade, then drop that overlap. The wrap point then lands on CONSECUTIVE original
// samples (no click), and the fade hides the join — ideal for a broadband drone like cicadas, whose
// raw trim otherwise jumps abruptly at the loop point.
function makeSeamlessLoop(ctx, buffer, crossfadeSec) {
    const sr = buffer.sampleRate
    const channels = buffer.numberOfChannels
    const cross = Math.min(Math.floor(crossfadeSec * sr), Math.floor(buffer.length / 2))
    if (cross <= 0) return buffer
    const outLen = buffer.length - cross
    const out = ctx.createBuffer(channels, outLen, sr)
    for (let ch = 0; ch < channels; ch++) {
        const src = buffer.getChannelData(ch)
        const dst = out.getChannelData(ch)
        for (let i = 0; i < outLen; i++) dst[i] = src[i]
        for (let i = 0; i < cross; i++) {
            const t = i / cross
            const fadeIn = Math.sin(0.5 * Math.PI * t) // head grows in
            const fadeOut = Math.cos(0.5 * Math.PI * t) // dropped tail fades out
            dst[i] = src[i] * fadeIn + src[outLen + i] * fadeOut
        }
    }
    return out
}

// CRITICAL: the base cicada ambient loop. Loaded up front and TRACKED on the loading bar (blocks GO),
// so the scene is never silent at the start. Crossfaded into a seamless loop as it decodes.
export function preloadCicadas() {
    if (cicadaLoadStarted) return
    const c = getAudioContext()
    if (!c) return
    cicadaLoadStarted = true
    loadAudioBuffer(URLS.cicades, { tracked: true }).then((buf) => {
        if (buf) buffers.cicades = makeSeamlessLoop(c, buf, CICADA_CROSSFADE)
    })
}

// BACKGROUND: the remaining ambient one-shots (owls, mumble, sad, sigh, footsteps). Fired once loading
// is done (see Loader) — untracked, so they download without holding up GO; they no-op until ready.
export function preloadAmbientSounds() {
    if (ambientLoadStarted) return
    const c = getAudioContext()
    if (!c) return
    ambientLoadStarted = true
    for (const [name, url] of Object.entries(URLS)) {
        if (name === 'cicades') continue // critical → already loaded via preloadCicadas (on the bar)
        loadAudioBuffer(url).then((buf) => {
            if (buf) buffers[name] = buf
        })
    }
}

// ----- Looping layer (cicadas — the seamless-looped buffer built above) -----
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
    gain.connect(getMasterGain())
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
    gain.connect(getMasterGain())
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
    g.connect(getMasterGain())
    try {
        src.start()
    } catch {
        // no context
    }
}

export const playMumble = (gain = 0.9) => playOneShot('mumble', gain)
export const playSad = (gain = 0.9) => playOneShot('sad', gain)

// The hero's intro-dialogue sigh (a single sound).
export function playSigh(gain = 0.9) {
    playOneShot('sigh', gain)
}

// index: 0 | 1 — the two grass samples are alternated for a left/right gait.
export function playFootstep(index, gain = 0.4) {
    playOneShot(`footstepGrass_${index % 2}`, gain)
}
