import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, useTexture } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import usePhases from '../stores/usePhases.jsx'
import { updatePhaseTextureReveal } from '../game/visualReveal.js'
import { PAINTERY_TEXTURE_URLS } from '../config/painteryTextures.js'

// Shared billboard vertex shader.
const billboardVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

// A stylized teardrop flame: wide rounded base tapering to a swaying tip, hot core → warm edge.
const fireFragment = /* glsl */ `
    precision mediump float;
    uniform float uTime;
    uniform float uBrightness;
    uniform vec3 uColorCore;
    uniform vec3 uColorEdge;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    void main() {
        vec2 p = vUv * 2.0 - 1.0;                  // -1..1, y up
        float yN = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
        p.x += (noise(vec2(p.y * 2.5, uTime * 1.6)) - 0.5) * 0.55 * yN;
        float width = mix(0.9, 0.04, smoothstep(-0.6, 1.0, p.y));
        float body = 1.0 - smoothstep(width * 0.55, width, abs(p.x));
        float base = smoothstep(-1.0, -0.55, p.y);
        float tip = smoothstep(1.0, 0.05, p.y);
        float shape = body * base * tip * uBrightness;
        if (shape < 0.04) discard;
        float core = smoothstep(0.0, 0.85, shape) * (1.0 - smoothstep(0.0, 0.85, abs(p.x) / max(width, 0.001)));
        vec3 col = mix(uColorEdge, uColorCore, core);
        gl_FragColor = vec4(col, shape);
    }
`

// A semi-transparent circle with a SHARP paintery edge — same dither-like dissolve logic as the
// ground border (discard where the radial distance beats the brush), plus an overall opacity.
const glowFragment = /* glsl */ `
    precision mediump float;
    uniform sampler2D uPaintery;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uRadius;
    uniform float uBleed;
    uniform float uTextureScale;
    varying vec2 vUv;

    void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float d = length(p) / max(uRadius, 0.001);          // 0 centre → 1 at the circle edge
        float brush = texture2D(uPaintery, vUv * uTextureScale).r;
        if (d > brush) discard;                              // sharp, paintery (dither-like) edge
        float a = uOpacity * (1.0 - smoothstep(brush - uBleed, brush, d));
        gl_FragColor = vec4(uColor, a);
    }
`

// Flame + paintery glow that live in the hollow middle of the hero's lantern. The flame is
// attached to the lantern bone (state.lanternFirePosition); the glow is a semi-transparent
// paintery circle pushed toward the camera so it always draws over the lantern + stick.
export default function LanternGlow() {
    const fireGroupRef = useRef()
    const glowGroupRef = useRef()
    const fireRef = useRef()
    const glowRef = useRef()
    const glowRevealRef = useRef(0) // 0 → 1 fade-in of the glow opacity as the experience starts

    const painteryTexture = useTexture(PAINTERY_TEXTURE_URLS.paintaryAlpha, (texture) => {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
    })

    const fireMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: billboardVertex,
                fragmentShader: fireFragment,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false,
                uniforms: {
                    uTime: { value: 0 },
                    uBrightness: { value: 1 },
                    uColorCore: { value: new THREE.Color('#ffe6a8') },
                    uColorEdge: { value: new THREE.Color('#ff6a16') },
                },
            }),
        []
    )

    const glowMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: billboardVertex,
                fragmentShader: glowFragment,
                transparent: true,
                depthWrite: false,
                blending: THREE.NormalBlending, // semi-transparent (not additive)
                toneMapped: false,
                uniforms: {
                    uPaintery: { value: painteryTexture },
                    uColor: { value: new THREE.Color('#ffb04d') },
                    uOpacity: { value: 0.79 },
                    uRadius: { value: 0.85 },
                    uBleed: { value: 0.13 },
                    uTextureScale: { value: 0.2 },
                },
            }),
        [painteryTexture]
    )

    useEffect(() => {
        return () => {
            fireMaterial.dispose()
            glowMaterial.dispose()
        }
    }, [fireMaterial, glowMaterial])

    useFrame((state, delta) => {
        const store = useStore.getState()
        const p = store.lanternFireParameters
        if (!fireGroupRef.current || !glowGroupRef.current) return
        // Glow opacity fades 0 → its value as the experience starts (0 in loading/warmup, ramps
        // through the intro, full in gameplay) — same phase reveal the background uses.
        glowRevealRef.current = updatePhaseTextureReveal(glowRevealRef.current, usePhases.getState().phase, delta)
        const visible = !!p.enabled
        fireGroupRef.current.visible = visible
        glowGroupRef.current.visible = visible
        if (!visible) return

        // Fire and glow each follow their OWN bone-local position (computed in MainCharacter).
        fireGroupRef.current.position.copy(store.lanternFirePosition)
        glowGroupRef.current.position.copy(store.lanternGlowPosition)

        const t = state.clock.elapsedTime
        const flicker = 1 + (Math.sin(t * p.flickerSpeed) + Math.sin(t * p.flickerSpeed * 1.7 + 1.3)) * 0.25 * p.flickerAmount

        fireMaterial.uniforms.uTime.value = t
        fireMaterial.uniforms.uBrightness.value = flicker
        fireMaterial.uniforms.uColorCore.value.set(p.fireColorCore)
        fireMaterial.uniforms.uColorEdge.value.set(p.fireColorEdge)
        if (fireRef.current) {
            fireRef.current.scale.set(p.fireSize, p.fireSize * 1.7, p.fireSize)
        }

        glowMaterial.uniforms.uColor.value.set(p.glowColor)
        glowMaterial.uniforms.uOpacity.value = p.glowOpacity * glowRevealRef.current
        glowMaterial.uniforms.uRadius.value = p.glowRadius
        glowMaterial.uniforms.uBleed.value = p.glowBleed
        glowMaterial.uniforms.uTextureScale.value = p.glowTextureScale
        if (glowRef.current) {
            glowRef.current.scale.setScalar(p.glowSize)
            // Pushed toward the camera (local +Z on the billboard) so it can draw over the lantern.
            glowRef.current.position.z = p.glowFront
        }
    })

    return (
        <>
            <group ref={glowGroupRef}>
                <Billboard>
                    <mesh ref={glowRef} material={glowMaterial} renderOrder={20}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>
                </Billboard>
            </group>
            <group ref={fireGroupRef}>
                <Billboard>
                    <mesh ref={fireRef} material={fireMaterial} renderOrder={21}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>
                </Billboard>
            </group>
        </>
    )
}
