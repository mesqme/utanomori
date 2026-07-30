import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'

import useStore from '../stores/useStore.jsx'
import usePhases from '../stores/usePhases.jsx'
import { createBackgroundMaterial, updateBackgroundMaterial } from '../materials/BackgroundMaterial.js'
import { getWorldLockScale } from './utils/screenScale.js'
import { screenPainteryUniforms, updateScreenPaintery } from './state/screenPaintery.js'
import { themeMask } from './state/themeMask.js'
import { updatePhaseTextureReveal } from '../game/visualReveal.js'
import { BACKGROUND_TEXTURE_URL_LIST, backgroundTextureIndex } from '../config/surfaceTextures.js'

export default function BackgroundSphere() {
    const meshRef = useRef()
    const rotationAngle = useRef(0)
    const textureReveal = useRef(0)
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

    // Selectable background texture (drei preloads all so swapping is instant). 'World ▸ Background ▸
    // backgroundTexture' picks which — defaults to watercolor; paintaryAlpha is the alternative.
    const textureName = useStore((state) => state.backgroundParameters.textureName)
    const surfaceTextures = useTexture(BACKGROUND_TEXTURE_URL_LIST)
    const backgroundTexture = useMemo(() => {
        const texture = surfaceTextures[backgroundTextureIndex(textureName)] ?? surfaceTextures[0]
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.colorSpace = THREE.NoColorSpace
        texture.needsUpdate = true
        return texture
    }, [surfaceTextures, textureName])

    const geometry = useMemo(() => new THREE.SphereGeometry(50, 32, 24), [])
    // Created once; the texture is swapped on its uTexture uniform (below) so a switch doesn't leak a
    // material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const material = useMemo(() => createBackgroundMaterial(backgroundTexture), [])
    const wireframeMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 'red', side: THREE.BackSide, wireframe: true }), [])

    useEffect(() => {
        material.uniforms.uTexture.value = backgroundTexture
    }, [material, backgroundTexture])

    useEffect(() => {
        return () => {
            geometry.dispose()
            material.dispose()
            wireframeMaterial.dispose()
        }
    }, [geometry, material, wireframeMaterial])

    useFrame((rootState, delta) => {
        const store = useStore.getState()
        const params = store.backgroundParameters

        meshRef.current.position.copy(store.smoothedCircleCenter)
        if (params.rotationEnabled) rotationAngle.current += (params.rotationSpeed ?? 0) * delta
        meshRef.current.rotation.y = rotationAngle.current

        const phase = usePhases.getState().phase
        textureReveal.current = updatePhaseTextureReveal(textureReveal.current, phase, delta)
        const textureAmount = textureReveal.current

        // Drift the screen-space paintery with the camera — shared by every paintery overlay
        // (background + terrain/grass/props), so they all pan together and stay DPR/resize stable.
        updateScreenPaintery(rootState, params.textureYawParallax ?? 0, params.texturePitchParallax ?? 0)

        updateBackgroundMaterial(material, {
            refScale: getWorldLockScale(rootState),
            texturePan: screenPainteryUniforms.uTexturePan.value,
            resolution: screenPainteryUniforms.uPainteryResolution.value,
            time: rootState.clock.elapsedTime,
            ...params,
            // The mix colour holds at 0 through the camera travel and fades in only at the very
            // end (as the camera settles / the first dialogue appears) — unlike the texture and
            // stars, which ramp in across the whole reveal. So the intro sky is the flat colour.
            skyMixAmount: (params.skyMixAmount ?? 1) * THREE.MathUtils.smoothstep(textureAmount, 0.6, 1.0),
            textureBrightness: (params.textureBrightness ?? params.colorIntensity ?? 0.4) * textureAmount,
            textureMixIntensity: params.textureMixIntensity ?? params.colorMixIntensity ?? 0.0,
            starBrightness: (params.starBrightness ?? 1.2) * textureAmount,
            // Outgoing-theme sky during a live masked theme transition (null = identity).
            themeMaskOld: themeMask.active ? themeMask.old : null,
        })
    })

    return <mesh ref={meshRef} geometry={geometry} material={backgroundWireframe ? wireframeMaterial : material} />
}
