import { folder, useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'
import { PAINTERY_TEXTURE_IDS } from '../../config/painteryTextures.js'

export function usePostControls() {
    const ditheringParameters = useStore((state) => state.ditheringParameters)
    const painterlyPostParameters = useStore((state) => state.painterlyPostParameters)
    const colorGradeParameters = useStore((state) => state.colorGradeParameters)
    const painteryTextureParameters = useStore((state) => state.painteryTextureParameters)

    // ======================================================================================
    // Post — everything applied to the rendered image: colour grade, painterly camera FX,
    // the shared paintery brush texture bake, and dithering.
    // ======================================================================================
    useControls('Post.Color Grade', {
        highBrightnessMode: {
            value: colorGradeParameters.highBrightnessMode,
            label: '☀ HIGH brightness',
            onChange: setParam('colorGradeParameters', 'highBrightnessMode'),
        },
        'LOW (eye-safety)': folder(
            {
                lowSaturation: { value: colorGradeParameters.lowSaturation, min: 0, max: 2, step: 0.01, onChange: setParam('colorGradeParameters', 'lowSaturation') },
                lowWarmth: { value: colorGradeParameters.lowWarmth, min: -0.3, max: 0.3, step: 0.005, onChange: setParam('colorGradeParameters', 'lowWarmth') },
                lowBrightness: { value: colorGradeParameters.lowBrightness, min: 0.5, max: 1.5, step: 0.01, onChange: setParam('colorGradeParameters', 'lowBrightness') },
            },
            { collapsed: true }
        ),
        'HIGH (normal display)': folder(
            {
                highSaturation: { value: colorGradeParameters.highSaturation, min: 0, max: 2, step: 0.01, onChange: setParam('colorGradeParameters', 'highSaturation') },
                highWarmth: { value: colorGradeParameters.highWarmth, min: -0.3, max: 0.3, step: 0.005, onChange: setParam('colorGradeParameters', 'highWarmth') },
                highBrightness: { value: colorGradeParameters.highBrightness, min: 0.5, max: 1.5, step: 0.01, onChange: setParam('colorGradeParameters', 'highBrightness') },
            },
            { collapsed: false }
        ),
    })

    useControls('Post.Painterly FX', {
        enabled: { value: painterlyPostParameters.enabled, onChange: setParam('painterlyPostParameters', 'enabled') },
        noiseSeed: { value: painterlyPostParameters.noiseSeed, min: 0, max: 100, step: 1, onChange: setParam('painterlyPostParameters', 'noiseSeed') },
        sensorNoise: { value: painterlyPostParameters.sensorNoiseEnabled, onChange: setParam('painterlyPostParameters', 'sensorNoiseEnabled') },
        lumaNoise: { value: painterlyPostParameters.luminanceNoise, min: 0, max: 0.2, step: 0.001, onChange: setParam('painterlyPostParameters', 'luminanceNoise') },
        chromaNoise: { value: painterlyPostParameters.chromaNoise, min: 0, max: 0.1, step: 0.001, onChange: setParam('painterlyPostParameters', 'chromaNoise') },
        sensorScale: { value: painterlyPostParameters.sensorNoiseScale, min: 1, max: 8, step: 1, onChange: setParam('painterlyPostParameters', 'sensorNoiseScale') },
    })

    useControls('Post.Brush Texture', {
        enabled: { value: painteryTextureParameters.enabled, onChange: setParam('painteryTextureParameters', 'enabled') },
        texture: { value: painteryTextureParameters.textureName, options: PAINTERY_TEXTURE_IDS, onChange: setParam('painteryTextureParameters', 'textureName') },
        blur: { value: painteryTextureParameters.blur, min: 0, max: 6, step: 0.1, onChange: setParam('painteryTextureParameters', 'blur') },
        levelsLow: { value: painteryTextureParameters.levelsLow, min: 0, max: 1, step: 0.01, onChange: setParam('painteryTextureParameters', 'levelsLow') },
        levelsHigh: { value: painteryTextureParameters.levelsHigh, min: 0, max: 1, step: 0.01, onChange: setParam('painteryTextureParameters', 'levelsHigh') },
        contrast: { value: painteryTextureParameters.contrast, min: 0.2, max: 12, step: 0.05, onChange: setParam('painteryTextureParameters', 'contrast') },
        posterize: { value: painteryTextureParameters.posterize, min: 0, max: 12, step: 1, onChange: setParam('painteryTextureParameters', 'posterize') },
    })

    useControls('Post.Dithering', {
        pixelSize: { value: ditheringParameters.pixelSize, min: 1, max: 10, step: 1, onChange: setParam('ditheringParameters', 'pixelSize') },
    })
}
