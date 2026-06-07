import * as THREE from 'three'
import { Pass } from 'postprocessing'

import fullscreenVertexShader from '../shaders/postprocessing/fullscreen.vert'
import displacementFragmentShader from '../shaders/postprocessing/displacement.frag'
import tensorFragmentShader from '../shaders/postprocessing/tensor.frag'
import kuwaharaFragmentShader from '../shaders/postprocessing/kuwahara.frag'
import compositeFragmentShader from '../shaders/postprocessing/composite.frag'

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
        this.kuwaharaMaterial = createMaterial(kuwaharaFragmentShader, {
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

    render(renderer, inputBuffer, outputBuffer) {
        this.displacementMaterial.uniforms.inputBuffer.value = inputBuffer.texture
        this.compositeMaterial.uniforms.originalBuffer.value = inputBuffer.texture

        this.renderMaterial(renderer, this.displacementMaterial, this.displacedTarget)
        this.renderMaterial(renderer, this.tensorMaterial, this.tensorTarget)
        this.renderMaterial(renderer, this.kuwaharaMaterial, this.kuwaharaTarget)
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
    }
}
