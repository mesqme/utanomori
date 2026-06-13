import * as THREE from 'three'

import { revealCircle } from '../world/utils/revealCircle.js'

// Soft ground-shadow blob (under the hero and companions) that fades out at the
// reveal-circle edge like everything else in the world. A plain MeshBasicMaterial
// with the fade injected into its alpha — `material.opacity` still works on top
// (the hero scales it with jump height).
const SHADOW_FADE_OFFSET = 2.5

export function createGroundShadowMaterial({ color, opacity }) {
    const revealUniforms = {
        uCircleCenter: { value: new THREE.Vector3() },
        uCircleRadiusFactor: { value: 0.07 },
        uShadowChunkSize: { value: 9 },
        uShadowFadeOffset: { value: SHADOW_FADE_OFFSET },
    }

    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
    })

    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, revealUniforms)
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vShadowWorldPos;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvShadowWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
                varying vec3 vShadowWorldPos;
                uniform vec3 uCircleCenter;
                uniform float uCircleRadiusFactor;
                uniform float uShadowChunkSize;
                uniform float uShadowFadeOffset;`
            )
            .replace(
                '#include <dithering_fragment>',
                `float shadowDist = length(vShadowWorldPos.xz - uCircleCenter.xz);
                float shadowRadius = uShadowChunkSize * uCircleRadiusFactor;
                float shadowMask = 1.0 - smoothstep(shadowRadius - uShadowFadeOffset, shadowRadius, shadowDist);
                gl_FragColor.a *= shadowMask;
                #include <dithering_fragment>`
            )
    }
    material.customProgramCacheKey = () => 'ground-shadow-fade'
    material.userData.revealUniforms = revealUniforms

    return material
}

export function updateGroundShadowMaterial(material) {
    const u = material.userData.revealUniforms
    if (!u) return
    u.uCircleCenter.value.set(revealCircle.centerX, 0, revealCircle.centerZ)
    u.uCircleRadiusFactor.value = revealCircle.radiusFactor
    u.uShadowChunkSize.value = revealCircle.chunkSize
}
