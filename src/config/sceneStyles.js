export const sceneStylePresets = Object.freeze({
    flatStyle: {
        label: 'Flat Style',
        terrainParameters: {
            color: '#454496',
            backgroundColor: '#44336c',
            segments: 19,
            scale: 0.08,
            amplitude: 0,
            groundTextureScale: 0.11,
            groundTextureContrast: 0,
            chunkSize: 9,
        },
        lanternGroundLightParameters: {
            radius: 3,
            edgeSoftness: 0,
            edgeNoiseScale: 0.28,
            edgeNoiseStrength: 0.39,
            innerBrightness: 0.26,
            outerDarkness: 0,
        },
        borderParameters: {
            noiseStrength: 0.22,
            noiseScale: 0.21,
            circleRadiusFactor: 0.9,
            groundFadeOffset: 0,
            groundOffset: -0.9,
        },
        ditheringParameters: {
            ditherMode: 'Bayer',
            pixelSize: 1,
        },
        characterParameters: {
            modelScale: 0.51,
            modelYOffset: 0.59,
            rotationOffset: 1.57,
            idleTimeScale: 1,
            runTimeScale: 1.2,
            runBlendInSpeed: 18,
            runBlendOutSpeed: 3,
        },
    },
})

export const defaultSceneStyleId = 'flatStyle'
export const defaultSceneStyle = sceneStylePresets[defaultSceneStyleId]
