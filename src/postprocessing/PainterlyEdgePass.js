import * as THREE from 'three'
import { Pass } from 'postprocessing'

import fullscreenVertexShader from '../shaders/postprocessing/fullscreen.vert'
import kuwaharaFragmentShader from '../shaders/postprocessing/kuwahara.frag'
import compositeFragmentShader from '../shaders/postprocessing/composite.frag'

const copyFragmentShader = `
uniform sampler2D inputBuffer;
varying vec2 vUv;

void main() {
    gl_FragColor = vec4(clamp(texture2D(inputBuffer, vUv).rgb, 0.0, 1.0), 1.0);
}
`

const KUWAHARA_REFERENCE_PIXELS = 3840 * 2160

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function createRenderTarget(name) {
    const target = new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: false,
        stencilBuffer: false,
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
    })
    target.texture.name = name
    target.texture.generateMipmaps = false
    return target
}

function createMaterial(fragmentShader, uniforms) {
    return new THREE.ShaderMaterial({
        vertexShader: fullscreenVertexShader,
        fragmentShader,
        uniforms,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NoBlending,
        toneMapped: false,
    })
}

function getRadiusBucket(radius) {
    if (radius <= 4) return 4
    if (radius <= 8) return 8
    if (radius <= 12) return 12
    if (radius <= 16) return 16
    return 24
}

function createKuwaharaMaterial(radius, uniforms) {
    const maxRadius = getRadiusBucket(radius)
    const fragmentShader = kuwaharaFragmentShader.replace('#define MAX_RADIUS 24', `#define MAX_RADIUS ${maxRadius}`)
    const material = createMaterial(fragmentShader, uniforms)
    material.userData.maxRadius = maxRadius
    return material
}

// Painterly look: a single generalized-Kuwahara abstraction pass, optionally run at
// a reduced render scale, composited back over the original by filterStrength. The
// film grain now lives in the final SharpenPass so nothing filters it afterwards.
export default class PainterlyEdgePass extends Pass {
    constructor(settings) {
        super('PainterlyEdgePass')

        this.renderScale = settings.renderScale
        this.baseRadius = settings.radius
        this.effectiveRadius = settings.radius
        this.fullResolution = new THREE.Vector2(1, 1)
        this.scaledResolution = new THREE.Vector2(1, 1)
        this.scaledTexelSize = new THREE.Vector2(1, 1)

        this.kuwaharaTarget = createRenderTarget('Painterly.Kuwahara')

        this.kuwaharaMaterial = createKuwaharaMaterial(this.effectiveRadius, {
            colorBuffer: { value: null },
            texelSize: { value: this.scaledTexelSize },
            radius: { value: this.effectiveRadius },
        })
        this.compositeMaterial = createMaterial(compositeFragmentShader, {
            originalBuffer: { value: null },
            kuwaharaBuffer: { value: this.kuwaharaTarget.texture },
            filterStrength: { value: settings.filterStrength },
            debugMode: { value: settings.debugMode },
        })
        this.copyMaterial = createMaterial(copyFragmentShader, {
            inputBuffer: { value: null },
        })

        this.fullscreenMaterial = this.compositeMaterial
    }

    getEffectiveRadius(baseRadius = this.baseRadius) {
        if (this.fullResolution.x <= 1 && this.fullResolution.y <= 1) {
            return Math.round(clamp(baseRadius, 1, 24))
        }

        const pixelScale = (this.fullResolution.x * this.fullResolution.y) / KUWAHARA_REFERENCE_PIXELS
        return Math.round(clamp(baseRadius * pixelScale, 1, 24))
    }

    setKuwaharaRadius(radius) {
        const radiusBucket = getRadiusBucket(radius)
        if (this.kuwaharaMaterial.userData.maxRadius !== radiusBucket) {
            const previousMaterial = this.kuwaharaMaterial
            this.kuwaharaMaterial = createKuwaharaMaterial(radius, previousMaterial.uniforms)
            previousMaterial.dispose()
        }
        this.effectiveRadius = radius
        this.kuwaharaMaterial.uniforms.radius.value = radius
    }

    update(settings) {
        this.baseRadius = settings.radius

        if (this.renderScale !== settings.renderScale) {
            this.renderScale = settings.renderScale
            this.setSize(this.fullResolution.x, this.fullResolution.y)
        }

        this.setKuwaharaRadius(this.getEffectiveRadius(settings.radius))

        const composite = this.compositeMaterial.uniforms
        composite.filterStrength.value = settings.filterStrength
        composite.debugMode.value = settings.debugMode
    }

    renderMaterial(renderer, material, target) {
        this.fullscreenMaterial = material
        renderer.setRenderTarget(target)
        renderer.render(this.scene, this.camera)
    }

    renderCopy(renderer, texture, outputBuffer) {
        this.copyMaterial.uniforms.inputBuffer.value = texture
        this.renderMaterial(renderer, this.copyMaterial, this.renderToScreen ? null : outputBuffer)
    }

    render(renderer, inputBuffer, outputBuffer) {
        const debugMode = this.compositeMaterial.uniforms.debugMode.value
        if (debugMode === 1) {
            this.renderCopy(renderer, inputBuffer.texture, outputBuffer)
            return
        }

        this.compositeMaterial.uniforms.originalBuffer.value = inputBuffer.texture
        this.kuwaharaMaterial.uniforms.colorBuffer.value = inputBuffer.texture

        this.renderMaterial(renderer, this.kuwaharaMaterial, this.kuwaharaTarget)
        if (debugMode === 2) {
            this.renderCopy(renderer, this.kuwaharaTarget.texture, outputBuffer)
            return
        }

        this.renderMaterial(renderer, this.compositeMaterial, this.renderToScreen ? null : outputBuffer)
    }

    setSize(width, height) {
        const safeWidth = Math.max(1, width)
        const safeHeight = Math.max(1, height)
        const scaledWidth = Math.max(1, Math.round(safeWidth * this.renderScale))
        const scaledHeight = Math.max(1, Math.round(safeHeight * this.renderScale))

        this.fullResolution.set(safeWidth, safeHeight)
        this.scaledResolution.set(scaledWidth, scaledHeight)
        this.scaledTexelSize.set(1 / scaledWidth, 1 / scaledHeight)
        this.kuwaharaTarget.setSize(scaledWidth, scaledHeight)
        this.setKuwaharaRadius(this.getEffectiveRadius())
    }

    dispose() {
        this.kuwaharaTarget.dispose()
        this.kuwaharaMaterial.dispose()
        this.compositeMaterial.dispose()
        this.copyMaterial.dispose()
    }
}
