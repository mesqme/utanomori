import * as THREE from 'three'
import { Pass } from 'postprocessing'

import fullscreenVertexShader from '../shaders/postprocessing/fullscreen.vert'
import displacementFragmentShader from '../shaders/postprocessing/displacement.frag'
import tensorFragmentShader from '../shaders/postprocessing/tensor.frag'
import kuwaharaFragmentShader from '../shaders/postprocessing/kuwahara.frag'
import compositeFragmentShader from '../shaders/postprocessing/composite.frag'

const copyFragmentShader = `
uniform sampler2D inputBuffer;
varying vec2 vUv;

void main() {
    gl_FragColor = vec4(clamp(texture2D(inputBuffer, vUv).rgb, 0.0, 1.0), 1.0);
}
`

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

export default class PainterlyEdgePass extends Pass {
    constructor(settings) {
        super('PainterlyEdgePass')

        this.renderScale = settings.renderScale
        this.fullResolution = new THREE.Vector2(1, 1)
        this.scaledResolution = new THREE.Vector2(1, 1)
        this.scaledTexelSize = new THREE.Vector2(1, 1)

        this.displacedTarget = createRenderTarget('Painterly.Displaced')
        this.tensorTarget = createRenderTarget('Painterly.Tensor')
        this.kuwaharaTarget = createRenderTarget('Painterly.Kuwahara')

        this.displacementMaterial = createMaterial(displacementFragmentShader, {
            inputBuffer: { value: null },
            resolution: { value: this.fullResolution },
            largeNoiseScale: { value: settings.largeNoiseScale },
            largeNoiseStrength: { value: settings.largeNoiseStrength },
            fineNoiseScale: { value: settings.fineNoiseScale },
            fineNoiseStrength: { value: settings.fineNoiseStrength },
            noiseSeed: { value: settings.noiseSeed },
        })
        this.tensorMaterial = createMaterial(tensorFragmentShader, {
            inputBuffer: { value: this.displacedTarget.texture },
            texelSize: { value: this.scaledTexelSize },
        })
        this.kuwaharaMaterial = createKuwaharaMaterial(settings.radius, {
            tensorBuffer: { value: this.tensorTarget.texture },
            colorBuffer: { value: this.displacedTarget.texture },
            texelSize: { value: this.scaledTexelSize },
            radius: { value: settings.radius },
            anisotropyStrength: { value: settings.anisotropy },
            eccentricity: { value: settings.eccentricity },
        })
        this.compositeMaterial = createMaterial(compositeFragmentShader, {
            originalBuffer: { value: null },
            displacedBuffer: { value: this.displacedTarget.texture },
            tensorBuffer: { value: this.tensorTarget.texture },
            kuwaharaBuffer: { value: this.kuwaharaTarget.texture },
            filterStrength: { value: settings.filterStrength },
            edgeRestoreStrength: { value: settings.edgeRestoreStrength },
            edgeRestoreThreshold: { value: settings.edgeRestoreThreshold },
            debugMode: { value: settings.debugMode },
            sensorNoiseEnabled: { value: settings.sensorNoiseEnabled ? 1 : 0 },
            luminanceNoise: { value: settings.luminanceNoise },
            chromaNoise: { value: settings.chromaNoise },
            sensorNoiseScale: { value: settings.sensorNoiseScale },
            resolution: { value: this.fullResolution },
            texelSize: { value: new THREE.Vector2(1, 1) },
            noiseSeed: { value: settings.noiseSeed },
        })
        this.copyMaterial = createMaterial(copyFragmentShader, {
            inputBuffer: { value: null },
        })

        this.fullscreenMaterial = this.compositeMaterial
    }

    update(settings) {
        if (this.renderScale !== settings.renderScale) {
            this.renderScale = settings.renderScale
            this.setSize(this.fullResolution.x, this.fullResolution.y)
        }

        const displacement = this.displacementMaterial.uniforms
        displacement.largeNoiseScale.value = settings.largeNoiseScale
        displacement.largeNoiseStrength.value = settings.largeNoiseStrength
        displacement.fineNoiseScale.value = settings.fineNoiseScale
        displacement.fineNoiseStrength.value = settings.fineNoiseStrength
        displacement.noiseSeed.value = settings.noiseSeed

        const radiusBucket = getRadiusBucket(settings.radius)
        if (this.kuwaharaMaterial.userData.maxRadius !== radiusBucket) {
            const previousMaterial = this.kuwaharaMaterial
            this.kuwaharaMaterial = createKuwaharaMaterial(settings.radius, previousMaterial.uniforms)
            previousMaterial.dispose()
        }

        const kuwahara = this.kuwaharaMaterial.uniforms
        kuwahara.radius.value = settings.radius
        kuwahara.anisotropyStrength.value = settings.anisotropy
        kuwahara.eccentricity.value = settings.eccentricity

        const composite = this.compositeMaterial.uniforms
        composite.filterStrength.value = settings.filterStrength
        composite.edgeRestoreStrength.value = settings.edgeRestoreStrength
        composite.edgeRestoreThreshold.value = settings.edgeRestoreThreshold
        composite.debugMode.value = settings.debugMode
        composite.sensorNoiseEnabled.value = settings.sensorNoiseEnabled ? 1 : 0
        composite.luminanceNoise.value = settings.luminanceNoise
        composite.chromaNoise.value = settings.chromaNoise
        composite.sensorNoiseScale.value = settings.sensorNoiseScale
        composite.noiseSeed.value = settings.noiseSeed
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

        this.displacementMaterial.uniforms.inputBuffer.value = inputBuffer.texture
        this.compositeMaterial.uniforms.originalBuffer.value = inputBuffer.texture

        const displacement = this.displacementMaterial.uniforms
        const displacementEnabled =
            displacement.largeNoiseStrength.value !== 0 || displacement.fineNoiseStrength.value !== 0
        const displacedTexture = displacementEnabled ? this.displacedTarget.texture : inputBuffer.texture

        if (displacementEnabled) {
            this.renderMaterial(renderer, this.displacementMaterial, this.displacedTarget)
        }
        if (debugMode === 2) {
            this.renderCopy(renderer, displacedTexture, outputBuffer)
            return
        }

        this.tensorMaterial.uniforms.inputBuffer.value = displacedTexture
        this.kuwaharaMaterial.uniforms.colorBuffer.value = displacedTexture
        this.compositeMaterial.uniforms.displacedBuffer.value = displacedTexture

        this.renderMaterial(renderer, this.tensorMaterial, this.tensorTarget)
        if (debugMode === 3) {
            this.renderCopy(renderer, this.tensorTarget.texture, outputBuffer)
            return
        }

        this.renderMaterial(renderer, this.kuwaharaMaterial, this.kuwaharaTarget)
        if (debugMode === 4) {
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
        this.compositeMaterial.uniforms.texelSize.value.set(1 / safeWidth, 1 / safeHeight)
        this.scaledResolution.set(scaledWidth, scaledHeight)
        this.scaledTexelSize.set(1 / scaledWidth, 1 / scaledHeight)
        this.displacedTarget.setSize(scaledWidth, scaledHeight)
        this.tensorTarget.setSize(scaledWidth, scaledHeight)
        this.kuwaharaTarget.setSize(scaledWidth, scaledHeight)
    }

    dispose() {
        this.displacedTarget.dispose()
        this.tensorTarget.dispose()
        this.kuwaharaTarget.dispose()
        this.displacementMaterial.dispose()
        this.tensorMaterial.dispose()
        this.kuwaharaMaterial.dispose()
        this.compositeMaterial.dispose()
        this.copyMaterial.dispose()
    }
}
