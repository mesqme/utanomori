// The three synched backing tracks (one per music companion). All start together on GO and stay on
// the same timeline; the MusicController only changes each track's volume (muted → distance-based for
// the active target → collected level).
//
// Played through the Web Audio API (decoded audio → looping AudioBufferSourceNode), NOT HTMLAudio: an
// <audio> loop re-seeks at the boundary and isn't gapless, whereas a looping buffer source is
// sample-accurate. All three sources start at ONE shared audio time, so the layers stay perfectly in
// sync (and loop seamlessly). Decoded buffers are cached so a restart replays instantly. (MP3 source
// files — once decoded into a buffer the playback is identical to WAV, just a smaller download.)
import { getAudioContext } from './songAudio.js'
import pianoFull from '../assets/audio/music/piano_full.mp3'
import drumsFull from '../assets/audio/music/drums_full.mp3'
import windsFull from '../assets/audio/music/winds_full.mp3'
import pianoPreview from '../assets/audio/music/piano_preview.mp3'
import drumsPreview from '../assets/audio/music/drums_preview.mp3'
import windsPreview from '../assets/audio/music/winds_preview.mp3'

// Six layers — the FULL melody per companion + a simplified PREVIEW per companion. All start together
// on GO and stay on the same timeline (so the preview ↔ full swap on a win is musically seamless); the
// MusicController only changes each layer's volume.
const TRACK_URLS = {
    piano: pianoFull,
    drums: drumsFull,
    winds: windsFull,
    pianoPreview,
    drumsPreview,
    windsPreview,
}
const ORDER = ['piano', 'drums', 'winds', 'pianoPreview', 'drumsPreview', 'windsPreview']

const buffers = {} // track → decoded AudioBuffer (cached across restarts)
const gains = {} // track → GainNode (volume)
const sources = {} // track → AudioBufferSourceNode (looping)
let started = false

export function startMusicTracks() {
    if (started || typeof window === 'undefined') return
    const ctx = getAudioContext()
    if (!ctx) return
    started = true

    const decodeAll = ORDER.map((track) => {
        if (buffers[track]) return Promise.resolve({ track, buffer: buffers[track] })
        return fetch(TRACK_URLS[track])
            .then((r) => r.arrayBuffer())
            .then((ab) => ctx.decodeAudioData(ab))
            .then((buffer) => {
                buffers[track] = buffer
                return { track, buffer }
            })
    })

    Promise.all(decodeAll)
        .then((decoded) => {
            if (!started) return // stopped before the decode finished
            const startTime = ctx.currentTime + 0.12 // one shared epoch → the layers stay in sync
            decoded.forEach(({ track, buffer }) => {
                const gain = ctx.createGain()
                gain.gain.value = 0 // the MusicController ramps it up
                gain.connect(ctx.destination)
                const src = ctx.createBufferSource()
                src.buffer = buffer
                src.loop = true // gapless
                src.connect(gain)
                src.start(startTime)
                gains[track] = gain
                sources[track] = src
            })
        })
        .catch(() => {})
}

export function setTrackVolume(track, volume) {
    const gain = gains[track]
    if (gain) gain.gain.value = Math.max(0, Math.min(1, volume))
}

export function getTrackVolume(track) {
    return gains[track]?.gain.value ?? 0
}

export function musicTracksStarted() {
    return started
}

export function stopMusicTracks() {
    for (const track of ORDER) {
        try {
            sources[track]?.stop()
            sources[track]?.disconnect()
            gains[track]?.disconnect()
        } catch {
            // already stopped / disconnected
        }
        delete sources[track]
        delete gains[track]
    }
    started = false
}
