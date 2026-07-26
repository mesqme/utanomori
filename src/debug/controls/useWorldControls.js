import { useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'
import { GROUND_TEXTURE_IDS, BACKGROUND_TEXTURE_IDS } from '../../config/surfaceTextures.js'

export function useWorldControls() {
    const terrainParameters = useStore((state) => state.terrainParameters)
    const roadParameters = useStore((state) => state.roadParameters)
    const objectParameters = useStore((state) => state.objectParameters)
    const backgroundParameters = useStore((state) => state.backgroundParameters)
    const windParameters = useStore((state) => state.windParameters)
    const borderParameters = useStore((state) => state.borderParameters)

    // ======================================================================================
    // World — terrain, sky, world border, roads, wind.
    // ======================================================================================
    useControls('World.Terrain', {
        groundTexture: { value: terrainParameters.groundTextureEnabled, onChange: setParam('terrainParameters', 'groundTextureEnabled') },
        groundTextureName: { value: terrainParameters.groundTextureName, options: GROUND_TEXTURE_IDS, onChange: setParam('terrainParameters', 'groundTextureName') },
        color: { value: terrainParameters.color, onChange: setParam('terrainParameters', 'color') },
        baseBrightness: { value: terrainParameters.baseBrightness, min: 0, max: 2, step: 0.01, onChange: setParam('terrainParameters', 'baseBrightness') },
        shadowRadius: { value: terrainParameters.shadowRadius, min: 0.2, max: 4, step: 0.05, onChange: setParam('terrainParameters', 'shadowRadius') },
        shadowSoftness: { value: terrainParameters.shadowSoftness, min: 0, max: 1, step: 0.01, onChange: setParam('terrainParameters', 'shadowSoftness') },
        shadowDarkness: { value: terrainParameters.shadowDarkness, min: 0, max: 3, step: 0.05, onChange: setParam('terrainParameters', 'shadowDarkness') },
        segments: { value: terrainParameters.segments, min: 1, max: 100, step: 1, onChange: setParam('terrainParameters', 'segments') },
        groundTextureScale: { value: terrainParameters.groundTextureScale, min: 0.01, max: 2.0, step: 0.01, onChange: setParam('terrainParameters', 'groundTextureScale') },
        groundTextureContrast: { value: terrainParameters.groundTextureContrast, min: 0, max: 4.0, step: 0.01, onChange: setParam('terrainParameters', 'groundTextureContrast') },
        chunkSize: { value: terrainParameters.chunkSize, min: 2, max: 50, step: 1, onChange: setParam('terrainParameters', 'chunkSize') },
    })

    useControls('World.Background', {
        backgroundColor: { value: backgroundParameters.backgroundColor, onChange: setParam('backgroundParameters', 'backgroundColor') },
        textureEnabled: { value: backgroundParameters.textureEnabled, onChange: setParam('backgroundParameters', 'textureEnabled') },
        backgroundTexture: { value: backgroundParameters.textureName, options: BACKGROUND_TEXTURE_IDS, onChange: setParam('backgroundParameters', 'textureName') },
        colorMode: { value: backgroundParameters.colorMode, options: ['Intensity', 'Color Mix', 'Both'], onChange: setParam('backgroundParameters', 'colorMode') },
        mixColor: { value: backgroundParameters.skyMixColor, onChange: setParam('backgroundParameters', 'skyMixColor') },
        mixAmount: { value: backgroundParameters.skyMixAmount, min: 0, max: 1, step: 0.01, onChange: setParam('backgroundParameters', 'skyMixAmount') },
        textureSize: { value: backgroundParameters.textureSize, min: 20, max: 2000, step: 1, onChange: setParam('backgroundParameters', 'textureSize') },
        textureLayer2: { value: backgroundParameters.textureLayer2, min: 0, max: 6, step: 0.05, onChange: setParam('backgroundParameters', 'textureLayer2') },
        textureYawParallax: { value: backgroundParameters.textureYawParallax ?? 400, min: -1500, max: 1500, step: 10, onChange: setParam('backgroundParameters', 'textureYawParallax') },
        texturePitchParallax: { value: backgroundParameters.texturePitchParallax ?? 400, min: -1500, max: 1500, step: 10, onChange: setParam('backgroundParameters', 'texturePitchParallax') },
        textureContrast: { value: backgroundParameters.textureContrast, min: 0, max: 6, step: 0.05, onChange: setParam('backgroundParameters', 'textureContrast') },
        textureBrightness: { value: backgroundParameters.textureBrightness, min: 0, max: 4, step: 0.01, onChange: setParam('backgroundParameters', 'textureBrightness') },
        textureMix: { value: backgroundParameters.textureMixIntensity, min: 0, max: 2, step: 0.01, onChange: setParam('backgroundParameters', 'textureMixIntensity') },
    })

    useControls('World.Stars', {
        starsEnabled: { value: backgroundParameters.starsEnabled, onChange: setParam('backgroundParameters', 'starsEnabled') },
        starColor: { value: backgroundParameters.starColor, onChange: setParam('backgroundParameters', 'starColor') },
        starCellSize: { value: backgroundParameters.starCellSize, min: 8, max: 120, step: 1, onChange: setParam('backgroundParameters', 'starCellSize') },
        starDensity: { value: backgroundParameters.starDensity, min: 0, max: 1, step: 0.01, onChange: setParam('backgroundParameters', 'starDensity') },
        starSize: { value: backgroundParameters.starSize, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('backgroundParameters', 'starSize') },
        starBrightness: { value: backgroundParameters.starBrightness, min: 0, max: 4, step: 0.05, onChange: setParam('backgroundParameters', 'starBrightness') },
        starTwinkle: { value: backgroundParameters.starTwinkleSpeed, min: 0, max: 6, step: 0.05, onChange: setParam('backgroundParameters', 'starTwinkleSpeed') },
        starRays: { value: backgroundParameters.starRays, min: 0, max: 2, step: 0.01, onChange: setParam('backgroundParameters', 'starRays') },
        starsFadeStart: { value: backgroundParameters.starsFadeStart, min: -1, max: 1, step: 0.01, onChange: setParam('backgroundParameters', 'starsFadeStart') },
        starsFadeWidth: { value: backgroundParameters.starsFadeWidth, min: 0.01, max: 1.5, step: 0.01, onChange: setParam('backgroundParameters', 'starsFadeWidth') },
        skyRotation: { value: backgroundParameters.rotationEnabled, onChange: setParam('backgroundParameters', 'rotationEnabled') },
        skyRotationSpeed: { value: backgroundParameters.rotationSpeed, min: -0.1, max: 0.1, step: 0.001, onChange: setParam('backgroundParameters', 'rotationSpeed') },
    })

    useControls('World.Border', {
        fadeMode: { value: borderParameters.fadeMode, options: ['Dither', 'Paintery'], onChange: setParam('borderParameters', 'fadeMode') },
        nStrength: { value: borderParameters.noiseStrength, min: 0, max: 1, step: 0.01, onChange: setParam('borderParameters', 'noiseStrength') },
        nScale: { value: borderParameters.noiseScale, min: 0.01, max: 1.0, step: 0.01, onChange: setParam('borderParameters', 'noiseScale') },
        radius: { value: borderParameters.circleRadiusFactor, min: 0.1, max: 1.0, step: 0.01, onChange: setParam('borderParameters', 'circleRadiusFactor') },
        edgeFade: { value: borderParameters.groundFadeOffset, min: 0, max: 3.0, step: 0.01, onChange: setParam('borderParameters', 'groundFadeOffset') },
        grassFade: { value: borderParameters.grassFadeOffset, min: 0.01, max: 5, step: 0.01, onChange: setParam('borderParameters', 'grassFadeOffset') },
        groundOffset: { value: borderParameters.groundOffset, min: -3.0, max: 3.0, step: 0.001, onChange: setParam('borderParameters', 'groundOffset') },
        pSize: { value: borderParameters.painterySize, min: 20, max: 2000, step: 1, onChange: setParam('borderParameters', 'painterySize') },
        pScreenBlend: { value: borderParameters.painteryScreenBlend, min: 0, max: 1, step: 0.01, onChange: setParam('borderParameters', 'painteryScreenBlend') },
        pDrift: { value: borderParameters.painteryDrift, min: 0, max: 1, step: 0.01, onChange: setParam('borderParameters', 'painteryDrift') },
        pLayer2: { value: borderParameters.painteryLayer2Scale, min: 0, max: 6, step: 0.05, onChange: setParam('borderParameters', 'painteryLayer2Scale') },
    })

    useControls('World.Roads', {
        enabled: { value: roadParameters.enabled, onChange: setParam('roadParameters', 'enabled') },
        worldSeed: { value: roadParameters.worldSeed, step: 1, onChange: setParam('roadParameters', 'worldSeed') },
        laneSpacing: { value: roadParameters.laneSpacing, min: 6, max: 80, step: 0.5, onChange: setParam('roadParameters', 'laneSpacing') },
        nodeSpacing: { value: roadParameters.nodeSpacing, min: 3, max: 40, step: 0.5, onChange: setParam('roadParameters', 'nodeSpacing') },
        meander: { value: roadParameters.meanderStrength, min: 0, max: 20, step: 0.1, onChange: setParam('roadParameters', 'meanderStrength') },
        width: { value: roadParameters.width, min: 0.1, max: 8, step: 0.05, onChange: setParam('roadParameters', 'width') },
        softness: { value: roadParameters.softness, min: 0.01, max: 4, step: 0.01, onChange: setParam('roadParameters', 'softness') },
        grassMinScale: { value: roadParameters.grassMinScale, min: 0, max: 1, step: 0.01, onChange: setParam('roadParameters', 'grassMinScale') },
        groundBrightness: { value: roadParameters.groundBrightness, min: -1, max: 2, step: 0.01, onChange: setParam('roadParameters', 'groundBrightness') },
        groundNoiseScale: { value: roadParameters.groundNoiseScale, min: 0.01, max: 2, step: 0.01, onChange: setParam('roadParameters', 'groundNoiseScale') },
        groundNoiseStrength: { value: roadParameters.groundNoiseStrength, min: 0, max: 2, step: 0.01, onChange: setParam('roadParameters', 'groundNoiseStrength') },
        groundEdgeSharpness: { value: roadParameters.groundEdgeSharpness, min: 0, max: 1, step: 0.01, onChange: setParam('roadParameters', 'groundEdgeSharpness') },
    })

    // One wind home: the grass field wind + the tree sway (different systems, same weather).
    useControls('World.Wind', {
        direction: { value: windParameters.direction, min: -Math.PI, max: Math.PI, step: 0.01, onChange: setParam('windParameters', 'direction') },
        scale: { value: windParameters.scale, min: 0, max: 3, step: 0.01, onChange: setParam('windParameters', 'scale') },
        strength: { value: windParameters.strength, min: 0, max: 2, step: 0.01, onChange: setParam('windParameters', 'strength') },
        speed: { value: windParameters.speed, min: 0, max: 5, step: 0.01, onChange: setParam('windParameters', 'speed') },
        treeStrength: { value: objectParameters.treeWindStrength, min: 0, max: 0.008, step: 0.0001, onChange: setParam('objectParameters', 'treeWindStrength') },
        treeSpeed: { value: objectParameters.treeWindSpeed, min: 0, max: 4, step: 0.05, onChange: setParam('objectParameters', 'treeWindSpeed') },
        treeGust: { value: objectParameters.treeWindGust, min: 0, max: 1, step: 0.02, onChange: setParam('objectParameters', 'treeWindGust') },
    })
}
