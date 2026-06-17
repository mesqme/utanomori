export const painterlyPostDebugModes = Object.freeze({
    Final: 0,
    Original: 1,
    Kuwahara: 2,
})

export const painterlyPostDefaults = Object.freeze({
    enabled: false,
    debugMode: painterlyPostDebugModes.Final,
    renderScale: 0.5,
    noiseSeed: 0,
    radius: 4,
    filterStrength: 1,
    sensorNoiseEnabled: true,
    luminanceNoise: 0.012,
    chromaNoise: 0.004,
    sensorNoiseScale: 1,
    bloomEnabled: true,
    bloomIntensity: 0.12,
    bloomThreshold: 0.4,
    bloomSmoothing: 0.1,
    bloomRadius: 0.5,
    sharpenEnabled: true,
    sharpenStrength: 0.35,
})
