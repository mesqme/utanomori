function cloneMaterials(materials) {
    return Object.fromEntries(Object.entries(materials).map(([id, colors]) => [id, { ...colors }]))
}

const painteryStyle = {
    label: 'Paintery',
    terrainParameters: {
        color: '#747dff',
        baseBrightness: 0.66,
        groundTextureEnabled: true,
        groundTextureName: 'ground', // ground-detail texture: 'ground' | 'paintaryAlpha'
        segments: 19,
        scale: 0.08,
        amplitude: 0,
        groundTextureScale: 0.05,
        groundTextureContrast: 0.45,
        chunkSize: 9,
        shadowRadius: 1.0, // character ground-shadow size multiplier
        shadowSoftness: 0.65, // 0 = hard edge, 1 = very soft falloff
        shadowDarkness: 1.0, // character ground-shadow strength multiplier
    },
    grassParameters: {
        enabled: true,
        count: 1600,
        segmentsCount: 4,
        width: 0.28,
        height: 1.25,
        colorBase: '#028600',
        baseBrightness: 2,
        leanFactor: 0,
        trampleEnabled: true,
        trailStrength: 0.7,
        dissolveEnabled: true,
        dissolveSource: 'Radius',
        dissolveRadius: 4.7,
        dissolveStart: 0,
        dissolveEnd: 0.88,
        dissolveRate: 2.15,
        dissolveAmount: 1.08,
        dissolveMode: 'Alpha',
        lightenEnabled: true,
        lightenSource: 'Trail',
        lightenRadius: 2.25,
        lightenStart: 0.02,
        lightenEnd: 0.47,
        lightenRate: 0.6,
        lightenAmount: 0.3,
        lightenColor: '#ff00e6',
        scaleEnabled: true,
        scaleSource: 'Trail',
        scaleRadius: 2.75,
        scaleStart: 0.27,
        scaleEnd: 1,
        scaleRate: 0.8,
        scaleAmount: 0.59,
        leanEnabled: true,
        leanSource: 'Radius',
        leanRadius: 2,
        leanStart: 0,
        leanEnd: 0.67,
        leanRate: 0.8,
        leanAmount: 0.52,
        baseColor: '#6aa1a1',
    },
    grassPatchParameters: {
        worldSeed: 9187,
        spacing: 2.6,
        jitter: 0.07,
        domainWarpScale: 0.46,
        domainWarpStrength: 1.23,
        patchHeightVariation: 0.25,
        patchWidthVariation: 0.19,
        patchColorVariation: 0.28,
        internalNoiseScale: 0.54,
        internalHeightVariation: 0.28,
        internalWidthVariation: 0.4,
        internalColorVariation: 1,
        internalLeanVariation: 0.08,
        radialLeanStrength: 0.16,
        cameraFacingStrength: 0.08,
        orientationVariation: 0.14,
        borderWidth: 0.75,
        borderMinScale: 0.75,
        tintColorCyan: '#1d55ff',
        tintColorViolet: '#2843eb',
        tintColorYellow: '#6e35ff',
        tintColorGreen: '#5130ff',
        debugCenters: false,
        debugBorders: false,
        debugPatchColors: false,
    },
    roadParameters: {
        enabled: true,
        worldSeed: 4242,
        laneSpacing: 24,
        nodeSpacing: 10,
        meanderStrength: 11.6,
        width: 1.5,
        softness: 1.85,
        grassMinScale: 0,
        groundBrightness: -0.15,
        groundNoiseScale: 2,
        groundNoiseStrength: 2,
        groundEdgeSharpness: 1,
    },
    objectParameters: {
        enabled: true,
        textureName: 'paintaryAlpha',
        worldSeed: 7777,
        cellSize: 7,
        groupJitter: 0.52,
        density: 0.54,
        roadClearance: 2.4,
        groupScale: 1,
        minObjectSpacing: 0.75,
        treeSize: 0.65,
        treeYOffset: 0,
        treeColor: '#575ac2',
        treeTrunkColor: '#877fb9',
        stoneSize: 0.55,
        stoneYOffset: -0.3,
        stoneTint: '#767ef3',
        stoneGradientEnabled: true, // darken + tint the bottom of stones, fading up to the colour above
        stoneGradientDark: 0.45, // brightness at the base (0 = black, 1 = no darkening)
        stoneGradientColor: '#5638c2', // tint blended into the base
        stoneGradientColorStrength: 1.0, // how strongly the tint applies at the base (0 = none)
        stoneGradientHeight: 1.03, // normalised height (0..1) by which the stone reaches full colour
        mushroomSize: 0.75,
        mushroomYOffset: -0.1,
        mushroomCapColor: '#b53c3c',
        mushroomLegColor: '#ecdcc4',
        stoneColorVariation: 0.32,
        mushroomColorVariation: 0.25,
        mushroomLegColorVariation: 0.25,
        treeColorVariation: 0.1,
        grassFadeDistance: 0,
        grassLean: 0.45,
        mushroomGrassRadius: 0.45,
        mushroomGrassFade: 0.4,
        mushroomGrassLean: 0.45,
        mushroomWiggleRadius: 1.2,
        mushroomWiggleAngle: 0.4,
        mushroomWiggleSpeed: 12,
        mushroomWiggleDecay: 3,
        mushroomLitBoost: 3.0, // how much a mushroom brightens when the hero touches it (rides the wiggle)
        mushroomSoundVolume: 0.35, // gain of the soft wind one-shot played on touch (0 = silent)
        treeWindStrength: 0.01,
        treeWindSpeed: 0.65,
        treeWindGust: 1.0,
        debugAnchors: false,
        painterlyEnabled: true,
        painterlyScale: 0.13,
        painterlyContrast: 0.35,
        painterlyBrightness: 0.52,
        painterlyColorStrength: 0.46,
        fadeOffset: 2.6,
    },
    windParameters: {
        direction: 0.65,
        scale: 0.35,
        strength: 0.2,
        speed: 1.1,
    },
    lanternGroundLightParameters: {
        radius: 3,
        edgeSoftness: 3.26,
        edgeNoiseScale: 0.39,
        edgeNoiseStrength: 0,
        innerBrightness: 0.47,
        outerDarkness: 0.44,
    },
    borderParameters: {
        fadeMode: 'Paintery',
        noiseStrength: 0.57,
        noiseScale: 0.3,
        circleRadiusFactor: 1,
        groundFadeOffset: 3,
        groundOffset: -3,
        grassFadeOffset: 3.66,
        painterySize: 1120,
        painteryScreenBlend: 1,
        painteryDrift: 0.16,
        painteryLayer2Scale: 0.8,
        painteryBleed: 0,
    },
    ditheringParameters: {
        ditherMode: 'Bayer',
        pixelSize: 1,
    },
    backgroundParameters: {
        backgroundColor: '#070258',
        gradientTopColor: '#3d1f95',
        horizonColor: '#0093ff',
        gradientIntensity: 0.47,
        gradientHeight: -0.9,
        gradientPower: 3.1,
        textureEnabled: true,
        textureName: 'watercolor', // background image: 'watercolor' | 'paintaryAlpha'
        colorMode: 'Both',
        textureSize: 1322,
        textureLayer2: 1.1,
        textureContrast: 1,
        textureBrightness: 4,
        textureMixIntensity: 1.04,
        starsEnabled: true,
        starStyle: 'Stylized',
        starCellSize: 92,
        starDensity: 0.05,
        starSize: 0.08,
        starBrightness: 4,
        starTwinkleSpeed: 2,
        starRays: 2,
        starColor: '#ffffff',
        starsFadeStart: -0.9,
        starsFadeWidth: 0.57,
        constellationsEnabled: false,
        constellationDensity: 0.36,
        constellationBrightness: 2.02,
        constellationWidth: 0.1,
        rotationEnabled: true,
        rotationSpeed: -0.003,
        textureYawParallax: 1000, // CSS px/radian: horizontal cloud drift vs camera yaw (signed)
        texturePitchParallax: 1000, // CSS px/radian: vertical cloud drift vs camera pitch (signed)
    },
    painterlyPostParameters: {
        enabled: true,
        noiseSeed: 0,
        sensorNoiseEnabled: true,
        luminanceNoise: 0.02,
        chromaNoise: 0.02,
        sensorNoiseScale: 1,
        bloomEnabled: false,
        bloomIntensity: 0,
        bloomThreshold: 0.34,
        bloomSmoothing: 0.36,
        bloomRadius: 0.5,
        sharpenEnabled: false,
        sharpenStrength: 0.28,
    },
    edgeParameters: {
        enabled: true,
        mode: 'Dither',
        color: '#9b62d0',
        tint: 1,
        width: 40,
        bias: 0.42,
        softness: 0.18,
        noiseScale: 0.5,
        sharpness: 2.9,
    },
    propRimParameters: {
        enabled: true,
        // A separate fresnel-rim colour per prop type (music stones use their own material).
        stoneColor: '#7a80ff',
        trunkColor: '#8f8ffd',
        mushroomColor: '#84afff',
        musicStoneColor: '#84afff',
        strength: 3,
        power: 4.4,
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
    characterMaterialParameters: {
        debugMode: 0,
        painterlyEnabled: true,
        painterlyTexture: 'paintaryAlpha',
        painterlyScale: 0.11,
        painterlyContrast: 0.66,
        painterlyColor: '#ffffff',
        painterlyColorStrength: 0,
        painterlyBrightnessVariation: 0.48,
        materials: {
            red: { baseColor: '#cc2d2d', toonColor: '#5c1028' },
            black: { baseColor: '#191919', toonColor: '#05030b' },
            darkBrown: { baseColor: '#7a4159', toonColor: '#241229' },
            blue: { baseColor: '#3661da', toonColor: '#15206a' },
            lightBrown: { baseColor: '#b5777d', toonColor: '#4d263c' },
            metal: { baseColor: '#91a2ff', toonColor: '#34419c' },
            lantern: { baseColor: '#ffbf00', toonColor: '#7a3d18' },
        },
    },
    // The whole in-game UI skin (speech bubble + prompts + HUD + chips). Every value here is written
    // to a CSS custom property on :root by Controls.jsx, so the DOM UI restyles live. The old
    // textured/Blot-bubble params (shape, roughness, texture, colours, button sizes) are gone.
    gameUiParameters: {
        // Global multiplier on ALL in-game UI text (sized in vmin → constant proportion at any
        // resolution); written to --ui-scale.
        uiScale: 1.4,
        sizeFloor: 6.5, // px → --ui-size-floor: floor under the vmin unit so the UI stops shrinking
        //                  at extreme aspect ratios (vmin tracks the shorter viewport side)
        sizeCeil: 10.8, // px → --ui-size-ceil: ceiling on the vmin unit so the UI doesn't balloon on 4K
        //                   (≈ Full-HD's 1vmin → big screens cap at the Full-HD look)
        bubbleWidth: 1500, // max width (px) of the speech bubble
        bubblePadY: 1.7, // vmin·scale → --ui-bubble-pad-y: speech-bubble vertical padding
        bubblePadX: 2.5, // vmin·scale → --ui-bubble-pad-x: speech-bubble horizontal padding
        // Unified corner rounding (the "complete mess" of mixed radii is gone — two tokens now):
        panelRadius: 14, // px → --ui-radius: panels, bubbles, banners, buttons, counter, round
        chipRadius: 8, // px → --ui-radius-chip: the little key chips (E, ESC, WASD)
        borderWidth: 2, // px → --ui-border: panel border thickness
        // 3·2·1 countdown — now a square frame. Sized in vmin·scale so it tracks the page like text.
        countSize: 3.2, // vmin·scale → --ui-count-size: the digit font-size
        countBox: 4.9, // vmin·scale → --ui-count-box: the square frame side
        countBorder: 2, // px → --ui-count-border: countdown frame thickness
        countNudge: 0.06, // em → --ui-count-nudge: digit vertical centering (Bebas caps sit high)
        // Key chips (E / ESC). Sized in vmin·scale (consistent at any resolution) + full positioning.
        chipSize: 2.25, // vmin·scale → --ui-chip-size: chip height (E chip = square)
        chipPadX: 0.65, // vmin·scale → --ui-chip-pad-x: multi-letter chip (ESC) horizontal padding
        chipBorder: 2, // px → --ui-chip-border: chip frame thickness
        chipNudge: 0.05, // em → --ui-chip-nudge: chip glyph vertical centering
        chipNudgeX: 0, // em → --ui-chip-nudge-x: chip glyph horizontal centering
        // Mini-game "Start" button (size + padding; no offset — it's centred). Tighter padding default.
        startBtnSize: 2.0, // vmin·scale → --start-btn-size: button text
        startBtnPadX: 2.0, // vmin·scale → --start-btn-pad-x
        startBtnPadY: 0.7, // vmin·scale → --start-btn-pad-y
        // End-screen "Continue"/"Restart" buttons + how far they sit from the centred title.
        creditsBtnSize: 2.0, // vmin·scale → --credits-btn-size
        creditsBtnPadX: 4.0, // vmin·scale → --credits-btn-pad-x
        creditsBtnPadY: 1.2, // vmin·scale → --credits-btn-pad-y
        creditsBtnOffset: 9, // % → --credits-btn-offset: side gap from the centre (bigger = further out)
        // Dialogue word-by-word reveal.
        wordStagger: 90, // ms between each word fading in
        wordFade: 420, // ms each word takes to fade + rise into place
        // DEBUG: force every UI overlay (bubble, prompt, HUD, countdown, chips…) on at once so the
        // values above can be dialed in live. Turn off (or remove UIPreview) when done.
        previewUI: false,
    },
    seeThroughParameters: {
        enabled: true,
        grassEnabled: false,
        worldRadius: 2.2,
        inner: 0.46,
        depthBias: 0,
        opacityIntensity: 1.0,
        textureContrast: 0.7,
        textureScale: 480,
    },
}

export const defaultSceneStyle = painteryStyle

export function cloneSceneStyleSection(section) {
    if (!section) return section
    if (!section.materials) return { ...section }

    return {
        ...section,
        materials: cloneMaterials(section.materials),
    }
}
