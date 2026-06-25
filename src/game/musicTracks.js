// The three synched 2-minute backing tracks (one per music companion). All start together on
// GO (looping, muted) and stay on the same timeline; the MusicController only changes each
// track's volume (muted → distance-based for the active target → collected level). Streamed via
// HTMLAudioElement (the full tracks are long — no need to decode them into memory).
import pianoFull from '../assets/audio/music/piano_full.mp3'
import drumsFull from '../assets/audio/music/drums_full.mp3'
import windsFull from '../assets/audio/music/winds_full.mp3'

const TRACK_URLS = { piano: pianoFull, drums: drumsFull, winds: windsFull }

const elements = {} // track → HTMLAudioElement
let started = false

export function startMusicTracks() {
    if (started || typeof window === 'undefined') return
    started = true
    for (const [track, url] of Object.entries(TRACK_URLS)) {
        const el = new Audio(url)
        el.loop = true
        el.preload = 'auto'
        el.volume = 0
        elements[track] = el
    }
    // Kick them all off in the same tick so they stay in sync (best-effort; play() may need a
    // user gesture — GO is a click, so it's allowed).
    Object.values(elements).forEach((el) => {
        const p = el.play()
        if (p && p.catch) p.catch(() => {})
    })
}

export function setTrackVolume(track, volume) {
    const el = elements[track]
    if (el) el.volume = Math.max(0, Math.min(1, volume))
}

export function getTrackVolume(track) {
    return elements[track]?.volume ?? 0
}

export function musicTracksStarted() {
    return started
}

export function stopMusicTracks() {
    Object.values(elements).forEach((el) => {
        el.pause()
        el.currentTime = 0
    })
    started = false
}
