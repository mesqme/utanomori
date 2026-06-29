import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import { MUSIC_ORDER } from '../config/musicCharacters.js'
import { getTrackVolume, setTrackVolume, musicTracksStarted, stopMusicTracks } from '../game/musicTracks.js'

// Drives the six synched backing layers (started on GO): a FULL + a simplified PREVIEW per companion.
// Each frame it picks a desired volume per layer and fades toward it:
//   • the current TARGET companion (not yet beaten) → its PREVIEW by distance (far = whisper, near =
//     full); the FULL stays silent so the player never hears it before winning the mini-game
//   • each COLLECTED companion (beaten) → its FULL at a soft constant; its preview is silenced
//   • during a conversation / mini-game, or before gameplay (loading/warmup/intro) → all muted
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

        const desired = {}
        for (const track of MUSIC_ORDER) {
            desired[track] = 0 // full
            desired[`${track}Preview`] = 0 // simplified preview
        }
        if (playing && !inGame) {
            // Collected (beaten) companions hum their FULL melody softly behind the hero.
            companions.found.forEach((c) => {
                if (c.music) desired[c.music] = m.collectedVolume
            })
            // The companion we're heading toward (not yet beaten) plays its PREVIEW, growing louder as
            // we approach. The FULL version stays silent until the mini-game is won — so the player only
            // ever hears the full melody after beating that character.
            const target = companions.target
            if (target?.music) {
                const dist = Math.hypot(player.x - target.x, player.z - target.z)
                const t = THREE.MathUtils.clamp((m.hearFar - dist) / Math.max(m.hearFar - m.hearNear, 0.001), 0, 1)
                const eased = Math.pow(t, m.distanceFalloff ?? 1)
                desired[`${target.music}Preview`] = m.farVolume + (m.nearVolume - m.farVolume) * eased
            }
        }

        for (const track of MUSIC_ORDER) {
            setTrackVolume(track, THREE.MathUtils.damp(getTrackVolume(track), desired[track], m.volumeLerp, dt))
            const preview = `${track}Preview`
            setTrackVolume(preview, THREE.MathUtils.damp(getTrackVolume(preview), desired[preview], m.volumeLerp, dt))
        }
    })

    return null
}
