import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'

import fullscreenVertexShader from '../../shaders/fullscreen/vertex.glsl'
import stylizeFragmentShader from '../../shaders/painteryStylize/fragment.glsl'

// Bakes a stylized copy of the paintery brush texture (blur + levels + contrast +
// posterize) into a render target, once at load and whenever the params change.
// Shaders sample the baked texture instead of running an expensive per-frame
// abstraction (e.g. Kuwahara) over the whole image.
export function useBakedPainteryTexture(sourceTexture, params) {
    const gl = useThree((state) => state.gl)

    const bake = useMemo(() => {
        const target = new THREE.WebGLRenderTarget(1, 1, {
            depthBuffer: false,
            stencilBuffer: false,
            type: THREE.UnsignedByteType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
        })
        target.texture.generateMipmaps = false
        target.texture.colorSpace = THREE.NoColorSpace
        target.texture.name = 'PainteryStylized'

        const scene = new THREE.Scene()
        const camera = new THREE.Camera()
        const material = new THREE.ShaderMaterial({
            vertexShader: fullscreenVertexShader,
            fragmentShader: stylizeFragmentShader,
            uniforms: {
                uSource: { value: null },
                uTexel: { value: new THREE.Vector2(1 / 1254, 1 / 1254) },
                uBlur: { value: 0 },
                uLevelsLow: { value: 0 },
                uLevelsHigh: { value: 1 },
                uContrast: { value: 1 },
                uPosterize: { value: 0 },
            },
            depthTest: false,
            depthWrite: false,
        })
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
        quad.frustumCulled = false
        scene.add(quad)
        return { target, scene, camera, material, quad }
    }, [])

    useEffect(
        () => () => {
            bake.target.dispose()
            bake.material.dispose()
            bake.quad.geometry.dispose()
        },
        [bake]
    )

    // Layout effect so the first scene render already samples the baked result.
    useLayoutEffect(() => {
        if (!sourceTexture?.image) return

        const width = sourceTexture.image.width || 1254
        const height = sourceTexture.image.height || 1254
        bake.target.setSize(width, height)

        const u = bake.material.uniforms
        const on = params.enabled !== false
        u.uSource.value = sourceTexture
        u.uTexel.value.set(1 / width, 1 / height)
        u.uBlur.value = on ? params.blur : 0
        u.uLevelsLow.value = on ? params.levelsLow : 0
        u.uLevelsHigh.value = on ? params.levelsHigh : 1
        u.uContrast.value = on ? params.contrast : 1
        u.uPosterize.value = on ? params.posterize : 0

        const previousTarget = gl.getRenderTarget()
        gl.setRenderTarget(bake.target)
        gl.render(bake.scene, bake.camera)
        gl.setRenderTarget(previousTarget)
    }, [bake, gl, sourceTexture, params])

    return bake.target.texture
}
