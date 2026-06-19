export const stylizedDebugModes = Object.freeze({
    Final: 0,
    'Base Color': 1,
    'Painterly Alpha': 2,
})

export const painterlyTextureOptions = Object.freeze({
    paintaryAlpha_01: 'paintaryAlpha_01',
    paintaryAlpha_02: 'paintaryAlpha_02',
    paintaryAlpha_03: 'paintaryAlpha_03',
    paintaryAlpha_04: 'paintaryAlpha_04',
    watercolorBasic: 'watercolorBasic',
    watercolorBasicLarge: 'watercolorBasicLarge',
})

export const characterStylizedDefaults = Object.freeze({
    debugMode: stylizedDebugModes.Final,
    painterlyEnabled: false,
    painterlyTexture: painterlyTextureOptions.paintaryAlpha_01,
    painterlyScale: 0.05,
    painterlyContrast: 1.02,
    painterlyColor: '#ffffff',
    painterlyColorStrength: 0,
    painterlyBrightnessVariation: 0.56,
})
