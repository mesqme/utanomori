export const stylizedDebugModes = Object.freeze({
    Final: 0,
    'Base Color': 1,
    'Painterly Alpha': 2,
})

export const painterlyTextureOptions = Object.freeze({
    paintaryAlpha: 'paintaryAlpha',
    watercolor: 'watercolor',
})

export const characterStylizedDefaults = Object.freeze({
    debugMode: stylizedDebugModes.Final,
    painterlyEnabled: false,
    painterlyTexture: painterlyTextureOptions.paintaryAlpha,
    painterlyScale: 0.05,
    painterlyContrast: 1.02,
    painterlyColor: '#ffffff',
    painterlyColorStrength: 0,
    painterlyBrightnessVariation: 0.56,
})
