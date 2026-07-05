import * as THREE from 'three'
import { Pass } from 'postprocessing'

import fullscreenVertexShader from '../shaders/postprocessing/fullscreen.vert'
import sharpenFragmentShader from '../shaders/postprocessing/sharpen.frag'
import { themeMaskUniforms } from '../world/utils/themeMask.js'

// Final pass of the painterly pipeline: an optional cheap sharpen, then the film
// grain applied last so nothing (kuwahara, bloom, AA) filters the grain afterwards.
export default class SharpenPass extends Pass {
    constructor(settings) {
        super('PainterlySharpenPass')
        this.material = new THREE.ShaderMaterial({
            vertexShader: fullscreenVertexShader,
            fragmentShader: sharpenFragmentShader,
            uniforms: {
                inputBuffer: { value: null },
                texelSize: { value: new THREE.Vector2(1, 1) },
                resolution: { value: new THREE.Vector2(1, 1) },
                enabled: { value: settings.sharpenEnabled ? 1 : 0 },
                strength: { value: settings.sharpenStrength },
                sensorNoiseEnabled: { value: settings.sensorNoiseEnabled ? 1 : 0 },
                luminanceNoise: { value: settings.luminanceNoise },
                chromaNoise: { value: settings.chromaNoise },
                sensorNoiseScale: { value: settings.sensorNoiseScale },
                noiseSeed: { value: settings.noiseSeed },
                uSaturation: { value: settings.saturation ?? 1 },
                uWarmth: { value: settings.warmth ?? 0 },
                uBrightness: { value: settings.brightness ?? 1 },
                // Outgoing theme's grade + the transition mask (PainterlyPostProcessing drives these).
                uSaturationOld: { value: settings.saturation ?? 1 },
                uWarmthOld: { value: settings.warmth ?? 0 },
                uBrightnessOld: { value: settings.brightness ?? 1 },
                ...themeMaskUniforms,
            },
            depthTest: false,
            depthWrite: false,
            blending: THREE.NoBlending,
            toneMapped: false,
        })
        this.fullscreenMaterial = this.material
    }

    update(settings) {
        const u = this.material.uniforms
        u.enabled.value = settings.sharpenEnabled ? 1 : 0
        u.strength.value = settings.sharpenStrength
        u.sensorNoiseEnabled.value = settings.sensorNoiseEnabled ? 1 : 0
        u.luminanceNoise.value = settings.luminanceNoise
        u.chromaNoise.value = settings.chromaNoise
        u.sensorNoiseScale.value = settings.sensorNoiseScale
        u.noiseSeed.value = settings.noiseSeed
        u.uSaturation.value = settings.saturation ?? 1
        u.uWarmth.value = settings.warmth ?? 0
        u.uBrightness.value = settings.brightness ?? 1
        // Outgoing grade during a masked theme transition — identity (= live) otherwise.
        u.uSaturationOld.value = settings.oldSaturation ?? u.uSaturation.value
        u.uWarmthOld.value = settings.oldWarmth ?? u.uWarmth.value
        u.uBrightnessOld.value = settings.oldBrightness ?? u.uBrightness.value
    }

    render(renderer, inputBuffer, outputBuffer) {
        this.material.uniforms.inputBuffer.value = inputBuffer.texture
        renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
        renderer.render(this.scene, this.camera)
    }

    setSize(width, height) {
        const safeWidth = Math.max(width, 1)
        const safeHeight = Math.max(height, 1)
        this.material.uniforms.texelSize.value.set(1 / safeWidth, 1 / safeHeight)
        this.material.uniforms.resolution.value.set(safeWidth, safeHeight)
    }

    dispose() {
        this.material.dispose()
    }
}
