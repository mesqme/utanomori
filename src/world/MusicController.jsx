import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import { MUSIC_ORDER } from '../config/musicCharacters.js'
import { getTrackVolume, setTrackVolume, musicTracksStarted, stopMusicTracks } from '../game/musicTracks.js'

// Drives the three synched backing tracks (started on GO). Each frame it picks a desired volume
// per track and fades toward it:
//   • the current TARGET companion's track → by distance from the hero (far = whisper, near = full)
//   • each COLLECTED companion's track → a soft constant (they run behind the party)
//   • during a conversation / mini-game, or before gameplay (loading/warmup/intro) → muted
// Nothing renders; it's a frame hook so it shares the world clock with everything else.
export default function MusicController() {
    useFrame((state, delta) => {
        const phase = usePhases.getState().phase

        // Restarting (back to the loader) → reset the tracks so the next GO replays them in sync.
        if (phase === PHASES.warmup || phase === PHASES.loading) {
            if (musicTracksStarted()) stopMusicTracks()
            return
        }
        if (!musicTracksStarted()) return

        const dt = Math.min(delta, 0.05)
        const store = useStore.getState()
        const m = store.musicParameters
        const player = store.ballPosition
        const companions = useCompanions.getState()
        const inGame = useSongGame.getState().active
        const playing = phase === PHASES.start || phase === PHASES.credits

        const desired = { piano: 0, drums: 0, winds: 0 }
        if (playing && !inGame) {
            // Collected companions hum along softly behind the hero.
            companions.found.forEach((c) => {
                if (c.music) desired[c.music] = m.collectedVolume
            })
            // The companion we're heading toward grows louder as we approach — but stays much
            // quieter at range (distanceFalloff eases the curve so it only swells up close).
            const target = companions.target
            if (target?.music) {
                const dist = Math.hypot(player.x - target.x, player.z - target.z)
                const t = THREE.MathUtils.clamp((m.hearFar - dist) / Math.max(m.hearFar - m.hearNear, 0.001), 0, 1)
                const eased = Math.pow(t, m.distanceFalloff ?? 1)
                desired[target.music] = m.farVolume + (m.nearVolume - m.farVolume) * eased
            }
        }

        for (const track of MUSIC_ORDER) {
            setTrackVolume(track, THREE.MathUtils.damp(getTrackVolume(track), desired[track], m.volumeLerp, dt))
        }
    })

    return null
}
