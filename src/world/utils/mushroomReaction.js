import * as THREE from 'three'

import { playSound } from '../../audio/gameSounds.js'

// The mushroom touch reaction: when the hero reaches a mushroom it tips away with a decaying
// wiggle, brightens, and plays a soft wind one-shot — a self-contained per-frame system over a
// plain list of entries, so it lives here rather than inside the component.
//
// Entries are MUTATED IN PLACE (phase / active / inside / dirX / dirZ): they are the same objects
// ScatteredObjects records at placement time, and the reaction state rides along with them.

// Module-scope temps, reused across every mushroom and every frame — allocating these per call
// would put four objects per mushroom per frame on the GC.
const _wiggleAxis = new THREE.Vector3()
const _wiggleRot = new THREE.Matrix4()
const _wiggleMat = new THREE.Matrix4()
const _litColor = new THREE.Color()

export function updateMushroomReactions(pool, chunkMushrooms, hero, op, delta) {
    const maxAngle = op.mushroomWiggleAngle ?? 0.4
    const litBoost = op.mushroomLitBoost ?? 0
    const soundVolume = op.mushroomSoundVolume ?? 0
    const wiggleOn = maxAngle > 0.0001
    // Run the reaction loop if ANY of wiggle / light / sound is on, so the touch react still fires
    // even when the bend is turned off.
    if (!wiggleOn && litBoost <= 0 && soundVolume <= 0) return

    // Deliberately NOT the caller's delta: the wiggle is clamped harder than the frame is.
    const dt = Math.min(delta, 0.05)
    const radiusSq = (op.mushroomWiggleRadius ?? 1.2) ** 2
    const speed = op.mushroomWiggleSpeed ?? 12
    const decay = op.mushroomWiggleDecay ?? 3

    for (const entries of chunkMushrooms.values()) {
        for (const m of entries) {
            const dx = m.x - hero.x
            const dz = m.z - hero.z
            const distSq = dx * dx + dz * dz
            const within = distSq < radiusSq
            if (within && !m.inside) {
                const d = Math.sqrt(distSq) || 1
                m.dirX = dx / d // tip AWAY from the hero
                m.dirZ = dz / d
                m.phase = 0
                m.active = true
                // Soft wind one-shot on touch — one of Tori's (winds) melody sounds.
                if (soundVolume > 0) playSound('winds', Math.floor(Math.random() * 6), { gain: soundVolume })
            }
            m.inside = within
            if (!m.active) continue
            m.phase += dt
            const amp = Math.exp(-m.phase * decay)
            if (amp < 0.02) {
                m.active = false
                pool.setMatrix(m.capId, m.base)
                pool.setMatrix(m.legId, m.base)
                // Restore the base colours once the reaction settles.
                if (litBoost > 0 && m.capColor) {
                    pool.setColor(m.capId, m.capColor)
                    pool.setColor(m.legId, m.legColor)
                }
                continue
            }
            // Light up: brighten cap + leg, riding the reaction amplitude (fades as it settles).
            if (litBoost > 0 && m.capColor) {
                const brightness = 1 + amp * litBoost
                pool.setColor(m.capId, _litColor.copy(m.capColor).multiplyScalar(brightness))
                pool.setColor(m.legId, _litColor.copy(m.legColor).multiplyScalar(brightness))
            }
            if (wiggleOn) {
                const angle = Math.sin(m.phase * speed) * maxAngle * amp
                _wiggleAxis.set(m.dirZ, 0, -m.dirX) // horizontal axis ⟂ to the tip direction
                _wiggleRot.makeRotationAxis(_wiggleAxis, angle)
                _wiggleMat.multiplyMatrices(m.base, _wiggleRot)
                pool.setMatrix(m.capId, _wiggleMat)
                pool.setMatrix(m.legId, _wiggleMat)
            }
        }
    }
}
