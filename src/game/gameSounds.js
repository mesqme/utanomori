// One-shot mini-game sounds (the per-character unique sounds). Loaded once into decoded
// AudioBuffers on the shared context so they fire with no latency and can overlap.
import { getAudioContext, getMasterGain } from './songAudio.js'

import piano01 from '../assets/audio/music/piano_01.mp3'
import piano02 from '../assets/audio/music/piano_02.mp3'
import piano03 from '../assets/audio/music/piano_03.mp3'
import piano04 from '../assets/audio/music/piano_04.mp3'
import drums01 from '../assets/audio/music/drums_01.mp3'
import drums02 from '../assets/audio/music/drums_02.mp3'
import drums03 from '../assets/audio/music/drums_03.mp3'
import winds01 from '../assets/audio/music/winds_01.mp3'
import winds02 from '../assets/audio/music/winds_02.mp3'
import winds03 from '../assets/audio/music/winds_03.mp3'
import winds04 from '../assets/audio/music/winds_04.mp3'
import winds05 from '../assets/audio/music/winds_05.mp3'
import winds06 from '../assets/audio/music/winds_06.mp3'

// track → ordered list of unique-sound URLs (index = the sound index used in the melody).
const SOUND_URLS = {
    piano: [piano01, piano02, piano03, piano04],
    drums: [drums01, drums02, drums03],
    winds: [winds01, winds02, winds03, winds04, winds05, winds06],
}

const buffers = {} // track → array of AudioBuffer | null
let loadStarted = false

export function preloadGameSounds() {
    if (loadStarted) return
    const c = getAudioContext()
    if (!c) return
    loadStarted = true
    for (const [track, urls] of Object.entries(SOUND_URLS)) {
        buffers[track] = new Array(urls.length).fill(null)
        urls.forEach((url, i) => {
            fetch(url)
                .then((r) => r.arrayBuffer())
                .then((ab) => c.decodeAudioData(ab))
                .then((buf) => {
                    buffers[track][i] = buf
                })
                .catch(() => {})
        })
    }
}

// Play one unique sound (one-shot). Safe no-op if not loaded / no audio.
export function playSound(track, soundIndex, { gain = 0.95 } = {}) {
    const c = getAudioContext()
    if (!c) return
    const buf = buffers[track]?.[soundIndex]
    if (!buf) return
    const src = c.createBufferSource()
    src.buffer = buf
    const g = c.createGain()
    g.gain.value = gain
    src.connect(g)
    g.connect(getMasterGain())
    src.start()
}
