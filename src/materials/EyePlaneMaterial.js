import * as THREE from 'three'

import eyePlaneVertexShader from '../shaders/eyePlane/vertex.glsl'
import eyePlaneFragmentShader from '../shaders/eyePlane/fragment.glsl'

// Material for the tree eye planes (one eye pair per UV-square, instanced per tree via a BatchedMesh).
// Transparent decal (depthWrite off + a slight polygon offset so it sits just in front of the
// canopy surface it's authored on). The whole-plane wind + the eye drawing live in the shaders.
export function createEyePlaneMaterial() {
    return new THREE.ShaderMaterial({
        name: 'eye_plane',
        vertexShader: eyePlaneVertexShader,
        fragmentShader: eyePlaneFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -3,
        toneMapped: true,
        uniforms: {
            uCircleCenter: { value: new THREE.Vector3() },
            uCircleRadiusFactor: { value: 0.07 },
            uPropChunkSize: { value: 9 },
            uPropFadeOffset: { value: 2.5 },
            uTime: { value: 0 },
            uWindDir: { value: new THREE.Vector2(1, 0) },
            uWindStrength: { value: 0 },
            uWindSpeed: { value: 1 },
            uWindGust: { value: 0.5 },
            uEyeColor: { value: new THREE.Color('#f0e24a') },
            uPupilColor: { value: new THREE.Color('#120d09') },
            uEyeRadius: { value: 0.2 },
            uEyeSpacing: { value: 0.5 },
            uEyeOffsetY: { value: 0 },
            uEyeAspect: { value: 1.0 },
            uEyeNoiseScale: { value: 1.2 },
            uEyeNoiseStrength: { value: 0.08 },
            uPupilWidth: { value: 0.06 },
            uPupilHeight: { value: 0.13 },
            uPupilNoiseScale: { value: 1.0 },
            uPupilNoiseStrength: { value: 0.1 },
            uEdgeSoftness: { value: 0.04 },
            uBlinkInterval: { value: 3.5 },
            uBlinkWidth: { value: 0.06 },
            uLookInterval: { value: 7.0 },
            uLookHold: { value: 0.3 },
            uLookAmount: { value: 0.06 },
            uLookChance: { value: 0.4 },
        },
    })
}

export function updateEyePlaneMaterial(material, options) {
    const u = material.uniforms
    u.uCircleCenter.value.set(options.circleCenterX, 0, options.circleCenterZ)
    u.uCircleRadiusFactor.value = options.radiusFactor
    u.uPropChunkSize.value = options.chunkSize
    u.uPropFadeOffset.value = options.fadeOffset
    if (options.wind) {
        u.uTime.value = options.wind.time
        u.uWindDir.value.set(options.wind.dirX, options.wind.dirZ)
        u.uWindStrength.value = options.wind.strength
        u.uWindSpeed.value = options.wind.speed
        u.uWindGust.value = options.wind.gust
    }
    const e = options.eyes
    if (e) {
        u.uEyeColor.value.set(e.eyeColor)
        u.uPupilColor.value.set(e.pupilColor)
        u.uEyeRadius.value = e.eyeRadius
        u.uEyeSpacing.value = e.eyeSpacing
        u.uEyeOffsetY.value = e.eyeOffsetY
        u.uEyeAspect.value = e.eyeAspect
        u.uEyeNoiseScale.value = e.eyeNoiseScale
        u.uEyeNoiseStrength.value = e.eyeNoiseStrength
        u.uPupilWidth.value = e.pupilWidth
        u.uPupilHeight.value = e.pupilHeight
        u.uPupilNoiseScale.value = e.pupilNoiseScale
        u.uPupilNoiseStrength.value = e.pupilNoiseStrength
        u.uEdgeSoftness.value = e.edgeSoftness
        u.uBlinkInterval.value = e.blinkInterval
        u.uBlinkWidth.value = e.blinkWidth
        u.uLookInterval.value = e.lookInterval
        u.uLookHold.value = e.lookHold
        u.uLookAmount.value = e.lookAmount
        u.uLookChance.value = e.lookChance
    }
}
