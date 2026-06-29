import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { revealCircle } from './utils/revealCircle.js'
import { seeThrough } from './utils/seeThrough.js'
import {
    claimCharacterSeeThroughSlot,
    releaseCharacterSeeThroughSlot,
    writeCharacterSeeThrough,
    clearCharacterSeeThrough,
} from './utils/characterSeeThrough.js'
import { createCharacterStylizedMaterial, updateCharacterStylizedMaterial } from '../materials/CharacterStylizedMaterial.js'
import paintaryAlpha01Url from '../assets/textures/paintaryAlpha_01.png'
import maskKanadeUrl from '../assets/textures/mask_kanade.png'
import maskHibikiUrl from '../assets/textures/mask_hibiki.png'
import maskKazaneUrl from '../assets/textures/mask_kazane.png'
import sheepUrl from '../assets/models/sheep.glb'

const IDLE_CLIP = 'sheep_Idle'
const RUN_CLIP = 'sheep_Run'
const SWAY_AXES = {
    X: new THREE.Vector3(1, 0, 0),
    Y: new THREE.Vector3(0, 1, 0),
    Z: new THREE.Vector3(0, 0, 1),
}
// Which mask face each music companion wears (index into the loaded mask texture array).
const MASK_TEXTURE_INDEX = { piano: 0, drums: 1, winds: 2 }

// The sheep music companion. Each instance is its own SkeletonUtils.clone (own skeleton + mixer),
// shares the hero's stylized material (+ a reveal-edge fade), crossfades sheep_Idle↔sheep_Run by
// `moving`, and turns the 36 scales into ONE InstancedMesh whose per-instance local-Y twist is
// driven by the motion bone's bounce (up → twist one way, down → the other). Body tinted per
// companion. Lives inside the companion group (Companions.jsx).
export default function SheepCreature({ definition, moving = false }) {
    const { scene, animations } = useGLTF(sheepUrl)
    const sheepParameters = useStore((s) => s.sheepParameters)
    const sheepMaterialParameters = useStore((s) => s.sheepMaterialParameters)

    const painterlyTexture = useTexture(paintaryAlpha01Url)
    useMemo(() => {
        painterlyTexture.wrapS = THREE.RepeatWrapping
        painterlyTexture.wrapT = THREE.RepeatWrapping
        painterlyTexture.colorSpace = THREE.NoColorSpace
        painterlyTexture.needsUpdate = true
    }, [painterlyTexture])

    // Per-character face textures for the mask mesh (Sheep_Mask): piano→Kanade, drums→Hibiki,
    // winds→Kazane. flipY=false to match the glTF UVs.
    const maskTextures = useTexture([maskKanadeUrl, maskHibikiUrl, maskKazaneUrl])
    useMemo(() => {
        maskTextures.forEach((t) => {
            t.colorSpace = THREE.SRGBColorSpace
            t.flipY = false
            t.needsUpdate = true
        })
    }, [maskTextures])

    // One clone per companion → its own skeleton, so they animate independently.
    const clone = useMemo(() => cloneSkeleton(scene), [scene])
    const music = definition?.music ?? 'piano' // which companion → its own colour set
    const maskTexture = maskTextures[MASK_TEXTURE_INDEX[music] ?? 0] // this companion's face

    const groupRef = useRef(null)
    const mixerRef = useRef(null)
    const actionsRef = useRef({ idle: null, run: null })
    const materialsRef = useRef([]) // { material, groupId }
    const motionBoneRef = useRef(null)
    const scalesRef = useRef(null) // { mesh, bases, gains }
    const movingRef = useRef(false)
    const runBlendRef = useRef(0)
    const swayAngleRef = useRef(0)
    const motionRestRef = useRef(null)

    const tmpQuat = useMemo(() => new THREE.Quaternion(), [])
    const tmpYQuat = useMemo(() => new THREE.Quaternion(), [])
    const tmpMat = useMemo(() => new THREE.Matrix4(), [])
    const tmpWorld = useMemo(() => new THREE.Vector3(), [])
    const tmpColor = useMemo(() => new THREE.Color(), [])
    // See-through projection temps (props in front of this companion fade — like the hero/stones).
    const stAnchor = useMemo(() => new THREE.Vector3(), [])
    const stEdge = useMemo(() => new THREE.Vector3(), [])
    const stRight = useMemo(() => new THREE.Vector3(), [])
    const seeThroughSlotRef = useRef(-1)
    // Skip the see-through write for the first couple frames: this component's useFrame runs BEFORE
    // the parent (TargetCreature/Follower) positions the group, so frame 1 reads an un-positioned
    // (≈origin) transform and would punch a stale see-through hole in a prop near the origin.
    const placedFramesRef = useRef(0)

    // Claim a fixed see-through slot for this companion (freed on unmount).
    useEffect(() => {
        seeThroughSlotRef.current = claimCharacterSeeThroughSlot()
        return () => {
            releaseCharacterSeeThroughSlot(seeThroughSlotRef.current)
            seeThroughSlotRef.current = -1
        }
    }, [])

    // Slight per-scale colour jitter (tunable). Each scale keeps a stable random offset; the
    // variation amount scales it into a per-instance tint multiplied onto the scale base colour.
    const applyScaleColors = useCallback(
        (variation) => {
            const scales = scalesRef.current
            if (!scales?.mesh || !scales.colorOffsets) return
            for (let i = 0; i < scales.colorOffsets.length; i++) {
                const o = scales.colorOffsets[i]
                tmpColor.setRGB(
                    THREE.MathUtils.clamp(1 + o[0] * variation, 0.25, 1.75),
                    THREE.MathUtils.clamp(1 + o[1] * variation, 0.25, 1.75),
                    THREE.MathUtils.clamp(1 + o[2] * variation, 0.25, 1.75)
                )
                scales.mesh.setColorAt(i, tmpColor)
            }
            if (scales.mesh.instanceColor) scales.mesh.instanceColor.needsUpdate = true
        },
        [tmpColor]
    )

    const groupIdOf = (material) => (Array.isArray(material) ? material[0]?.name : material?.name) ?? 'orange'

    // Build the per-clone materials + collapse the 36 scales into one InstancedMesh (runs once).
    useEffect(() => {
        if (!clone) return undefined
        const created = []

        const charMats = sheepMaterialParameters.characters[music] ?? sheepMaterialParameters.characters.piano
        const makeMaterial = (sourceMaterial, instanced) => {
            const groupId = groupIdOf(sourceMaterial)
            const settings = charMats[groupId] ?? { baseColor: '#ffffff' }
            const material = createCharacterStylizedMaterial(sourceMaterial, settings, sheepMaterialParameters, painterlyTexture, {
                transparent: true,
                instanced,
            })
            material.uniforms.uBaseColor.value.set(settings.baseColor)
            created.push({ material, groupId })
            return material
        }

        // The mask mesh (Sheep_Mask) shows the flat character face texture instead of the stylized
        // colour — only this mesh; everything else keeps the painterly stylized material.
        const maskMaterial = new THREE.MeshBasicMaterial({ map: maskTexture, toneMapped: false })
        clone.traverse((object) => {
            if (object.name === 'motion') motionBoneRef.current = object
            if (object.isSkinnedMesh) {
                object.material = object.name === 'Sheep_Mask' ? maskMaterial : makeMaterial(object.material, false)
                object.frustumCulled = false
            }
        })

        // Scales: one geometry instanced 36× from the children's local transforms.
        let scalesRoot = null
        clone.traverse((object) => {
            if (object.name === 'Sheep_ScalesRoot') scalesRoot = object
        })
        if (scalesRoot) {
            const leaves = scalesRoot.children.filter((child) => child.isMesh)
            if (leaves.length > 0) {
                const bases = leaves.map((leaf) => ({ pos: leaf.position.clone(), quat: leaf.quaternion.clone(), scale: leaf.scale.clone() }))
                const gains = leaves.map(() => 0.7 + Math.random() * 0.6) // slight per-scale variation
                const colorOffsets = leaves.map(() => [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1])
                const material = makeMaterial(leaves[0].material, true)
                const inst = new THREE.InstancedMesh(leaves[0].geometry, material, leaves.length)
                inst.frustumCulled = false
                const m = new THREE.Matrix4()
                bases.forEach((b, i) => {
                    m.compose(b.pos, b.quat, b.scale)
                    inst.setMatrixAt(i, m)
                })
                inst.instanceMatrix.needsUpdate = true
                leaves.forEach((leaf) => scalesRoot.remove(leaf))
                scalesRoot.add(inst)
                scalesRef.current = { mesh: inst, bases, gains, colorOffsets }
                applyScaleColors(useStore.getState().sheepParameters.scaleColorVariation ?? 0)
            }
        }

        materialsRef.current = created
        return () => {
            created.forEach(({ material }) => material.dispose())
            maskMaterial.dispose()
            if (scalesRef.current?.mesh) scalesRef.current.mesh.dispose()
            materialsRef.current = []
            scalesRef.current = null
            motionBoneRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clone, painterlyTexture, maskTexture])

    // Animations: idle + run, crossfaded by `moving`.
    useEffect(() => {
        if (!clone) return undefined
        const mixer = new THREE.AnimationMixer(clone)
        const idleClip = THREE.AnimationClip.findByName(animations, IDLE_CLIP)
        const runClip = THREE.AnimationClip.findByName(animations, RUN_CLIP)
        if (!idleClip) console.warn('SheepCreature: missing animation clip', IDLE_CLIP)
        const idle = idleClip ? mixer.clipAction(idleClip) : null
        const run = runClip ? mixer.clipAction(runClip) : null
        if (idle) {
            idle.setLoop(THREE.LoopRepeat, Infinity)
            idle.setEffectiveWeight(1)
            idle.play()
        }
        if (run) {
            run.setLoop(THREE.LoopRepeat, Infinity)
            run.setEffectiveWeight(0)
            run.play()
        }
        mixerRef.current = mixer
        actionsRef.current = { idle, run }
        // Desync: start each companion at a random phase so they don't move in perfect lockstep.
        mixer.setTime(Math.random() * 2)
        return () => {
            mixer.stopAllAction()
            if (clone) mixer.uncacheRoot(clone)
            mixerRef.current = null
            actionsRef.current = { idle: null, run: null }
        }
    }, [clone, animations])

    // Re-stylize when the Sheep controls change (this companion's own colour set).
    useEffect(() => {
        const charMats = sheepMaterialParameters.characters[music] ?? sheepMaterialParameters.characters.piano
        materialsRef.current.forEach(({ material, groupId }) => {
            const settings = charMats[groupId] ?? { baseColor: '#ffffff' }
            updateCharacterStylizedMaterial(material, settings, sheepMaterialParameters, painterlyTexture)
            material.uniforms.uBaseColor.value.set(settings.baseColor)
        })
    }, [sheepMaterialParameters, painterlyTexture, music])

    useEffect(() => {
        movingRef.current = moving
    }, [moving])

    // Re-tint the scales when the variation slider changes.
    useEffect(() => {
        applyScaleColors(sheepParameters.scaleColorVariation ?? 0)
    }, [sheepParameters.scaleColorVariation, applyScaleColors])

    useFrame((state, delta) => {
        const dt = Math.min(delta, 0.1)
        const p = useStore.getState().sheepParameters

        // idle ↔ run crossfade
        const { idle, run } = actionsRef.current
        const targetBlend = movingRef.current ? 1 : 0
        const blendSpeed = movingRef.current ? p.runBlendInSpeed : p.runBlendOutSpeed
        runBlendRef.current = THREE.MathUtils.damp(runBlendRef.current, targetBlend, blendSpeed, dt)
        if (idle) idle.setEffectiveWeight(1 - runBlendRef.current)
        if (run) run.setEffectiveWeight(runBlendRef.current)
        idle?.setEffectiveTimeScale(p.idleTimeScale)
        run?.setEffectiveTimeScale(p.runTimeScale)
        mixerRef.current?.update(delta)

        // Scales: twist each instance around its local Y by the motion bone's bounce. Read AFTER
        // mixer.update so the motion bone is in its posed position this frame.
        const scales = scalesRef.current
        const motion = motionBoneRef.current
        if (scales && motion) {
            const y = motion.position.y
            if (motionRestRef.current === null) motionRestRef.current = y
            motionRestRef.current = THREE.MathUtils.damp(motionRestRef.current, y, 1.2, dt) // slow baseline
            const disp = y - motionRestRef.current // + when the body rises
            const target = THREE.MathUtils.clamp(-disp * p.swayGain, -p.swayMax, p.swayMax)
            swayAngleRef.current = THREE.MathUtils.damp(swayAngleRef.current, target, p.swayDamp, dt)
            const angle = swayAngleRef.current
            const axis = SWAY_AXES[p.swayAxis] ?? SWAY_AXES.Z
            for (let i = 0; i < scales.bases.length; i++) {
                const b = scales.bases[i]
                tmpYQuat.setFromAxisAngle(axis, angle * scales.gains[i])
                tmpQuat.copy(b.quat).multiply(tmpYQuat)
                tmpMat.compose(b.pos, tmpQuat, b.scale)
                scales.mesh.setMatrixAt(i, tmpMat)
            }
            scales.mesh.instanceMatrix.needsUpdate = true
        }

        // Reveal-edge fade (per-object): fade toward the background past the lit circle.
        if (groupRef.current) {
            groupRef.current.getWorldPosition(tmpWorld)
            const dist = Math.hypot(tmpWorld.x - revealCircle.centerX, tmpWorld.z - revealCircle.centerZ)
            const radius = revealCircle.chunkSize * revealCircle.radiusFactor
            const fadeOffset = useStore.getState().objectParameters.fadeOffset
            const fade = THREE.MathUtils.smoothstep(dist, radius - fadeOffset, radius)
            const bg = useStore.getState().backgroundParameters.backgroundColor
            materialsRef.current.forEach(({ material }) => {
                material.uniforms.uFade.value = fade
                material.uniforms.uBackgroundColor.value.set(bg)
            })

            // See-through: project this companion to a screen disc so PROPS (and grass) in front of
            // it fade (the sheep itself stays opaque — the hole is punched in the trees/grass). Skip
            // when it's already fading out at the world edge or is off-screen / behind the camera.
            // Radius is the SHARED see-through size (seeThrough.worldRadius) so the hero and the sheep
            // use the same option; only the head-anchor height stays per-sheep.
            // Warm-up gate: don't write a hole until the parent has positioned us for a couple
            // frames (otherwise frame 1 reads ≈origin and punches a stale hole in a prop there).
            const placed = placedFramesRef.current >= 2
            if (placedFramesRef.current < 2) placedFramesRef.current++
            const slot = seeThroughSlotRef.current
            if (placed && slot >= 0 && seeThrough.enabled && fade < 0.85) {
                stAnchor.copy(tmpWorld)
                stAnchor.y += p.seeThroughHeight ?? 0.6
                const camDist = state.camera.position.distanceTo(stAnchor)
                stRight.setFromMatrixColumn(state.camera.matrixWorld, 0)
                stEdge.copy(stAnchor).addScaledVector(stRight, seeThrough.worldRadius)
                stAnchor.project(state.camera)
                stEdge.project(state.camera)
                if (stAnchor.z > -1 && stAnchor.z < 1) {
                    const dpr = state.viewport.dpr
                    const bw = state.size.width * dpr
                    const bh = state.size.height * dpr
                    const cx = (stAnchor.x * 0.5 + 0.5) * bw
                    const cy = (stAnchor.y * 0.5 + 0.5) * bh
                    const rPx = Math.hypot((stEdge.x * 0.5 + 0.5) * bw - cx, (stEdge.y * 0.5 + 0.5) * bh - cy)
                    writeCharacterSeeThrough(slot, cx, cy, rPx, camDist)
                } else {
                    clearCharacterSeeThrough(slot)
                }
            } else if (slot >= 0) {
                clearCharacterSeeThrough(slot)
            }
        }
    })

    const scale = (sheepParameters.modelScale ?? 1) * (definition?.scale ?? 1)
    return (
        <group
            ref={groupRef}
            scale={scale}
            position-y={sheepParameters.yOffset ?? 0}
            rotation-y={THREE.MathUtils.degToRad(sheepParameters.modelYaw ?? 0)}
        >
            <primitive object={clone} />
        </group>
    )
}

useGLTF.preload(sheepUrl)
