import * as THREE from 'three'
import { Pass } from 'postprocessing'

import fullscreenVertexShader from '../shaders/postprocessing/fullscreen.vert'
import sharpenFragmentShader from '../shaders/postprocessing/sharpen.frag'

export default class SharpenPass extends Pass {
    constructor(strength = 0.35) {
        super('PainterlySharpenPass')
        this.material = new THREE.ShaderMaterial({
            vertexShader: fullscreenVertexShader,
            fragmentShader: sharpenFragmentShader,
            uniforms: {
                inputBuffer: { value: null },
                texelSize: { value: new THREE.Vector2(1, 1) },
                strength: { value: strength },
            },
            depthTest: false,
            depthWrite: false,
            blending: THREE.NoBlending,
            toneMapped: false,
        })
        this.fullscreenMaterial = this.material
    }

    update(strength) {
        this.material.uniforms.strength.value = strength
    }

    render(renderer, inputBuffer, outputBuffer) {
        this.material.uniforms.inputBuffer.value = inputBuffer.texture
        renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
        renderer.render(this.scene, this.camera)
    }

    setSize(width, height) {
        this.material.uniforms.texelSize.value.set(1 / Math.max(width, 1), 1 / Math.max(height, 1))
    }

    dispose() {
        this.material.dispose()
    }
}
