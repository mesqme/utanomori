import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import * as THREE from 'three'
import { cloneSceneStyleSection, defaultSceneStyle, defaultSceneStyleId } from '../config/sceneStyles.js'

const GRASS_STYLE_VERSION = 18
const CHARACTER_STYLIZED_VERSION = 3
const DEFAULT_CAMERA_PARAMETERS = {
    debugOrbit: false,
    debugOrbitAngle: 0,
    debugOrbitDistance: 18.9,
    debugOrbitHeight: 15.1,
    debugTargetYOffset: 0.4,
}

// Flat ground arrow pointing from the hero toward the hidden companion (TargetArrow).
const DEFAULT_ARROW_PARAMETERS = {
    width: 0.12, // line thickness (world units)
    size: 1.1, // arm length
    distance: 3.0, // how far in front of the hero it sits (keep < terrain radius)
    yOffset: 0.08, // lift above the ground
    fadeNear: 6, // distance to the target where it is fully opaque
    fadeFar: 26, // distance where it fades to minOpacity
    minOpacity: 0.18,
    maxOpacity: 0.95,
    color: '#ffffff',
}

// Song mini-game UI (the note wheel) + the spatial singing voices.
const DEFAULT_SONG_GAME_PARAMETERS = {
    wheelRadius: 150, // px from the wheel centre to each note button
    buttonSize: 64, // px diameter of each note button
    songVolume: 0.12, // base loudness of a companion's looping song
    hearNear: 4, // distance (world units) at which a song is at full volume
    hearFar: 28, // distance at which it fades to silence
}

// One-time stylization baked into the paintery brush texture (blur + levels +
// contrast + posterize) so its small details merge into larger painterly regions,
// replacing the per-frame Kuwahara abstraction.
const DEFAULT_PAINTERY_TEXTURE_PARAMETERS = {
    enabled: true,
    textureName: 'paintaryAlpha_01', // source paintery texture for the terrain bake (ground/grass/border)
    blur: 2.0,
    levelsLow: 0.0,
    levelsHigh: 1.0,
    contrast: 1.15,
    posterize: 0,
}

// Stylized silhouette edge (option A): the contour dissolves into the background
// through the brush noise for a thin painterly oil/pastel outline. Defined per scene
// style (see edgeParameters in sceneStyles.js).

// Stylized "blot" UI (speech bubble + buttons): a solid painted patch with an
// organic brushy edge (feTurbulence displacement). No border.
const GAME_UI_VERSION = 4
const DEFAULT_GAME_UI_PARAMETERS = {
    bubbleShape: 'Rect', // Rect | Ellipse | Circle
    buttonShape: 'Rect',
    roughness: 8.5, // edge displacement amount (px)
    detail: 29, // turbulence frequency (x0.001)
    cornerRadius: 55, // rect corner rounding (px)
    bubbleWidth: 760, // bubble max width (px)
    textSize: 24, // dialogue text size (px)
    padding: 43, // bubble inner padding (px)
    buttonWidth: 180, // shared button background width (px)
    buttonHeight: 58, // shared button background height (px)
    textureStrength: 1, // subtle painted fill variation
    textureScale: 600, // painted texture tile size (px)
    fillColor: '#fef4ef', // painted patch colour
    textColor: '#26285a', // text colour
}

const createStore = () =>
    create(
        subscribeWithSelector((set, get) => ({
            ballPosition: new THREE.Vector3(0, 0, 0),
            setBallPosition: (position) => {
                get().ballPosition.copy(position)
            },

            smoothedCircleCenter: new THREE.Vector3(0, 0, 0),
            setSmoothedCircleCenter: (position) => {
                get().smoothedCircleCenter.copy(position)
            },

            lanternPosition: new THREE.Vector3(0, 0, 0),
            setLanternPosition: (position) => {
                get().lanternPosition.copy(position)
            },

            sceneStylePreset: defaultSceneStyleId,
            grassStyleVersion: GRASS_STYLE_VERSION,
            characterStylizedVersion: CHARACTER_STYLIZED_VERSION,

            /**
             * Terrain parameters
             */
            terrainParameters: { ...defaultSceneStyle.terrainParameters },

            /**
             * Grass and wind parameters
             */
            grassParameters: { ...defaultSceneStyle.grassParameters },
            grassPatchParameters: { ...defaultSceneStyle.grassPatchParameters },
            roadParameters: { ...defaultSceneStyle.roadParameters },
            windParameters: { ...defaultSceneStyle.windParameters },

            /**
             * Scattered object groups (trees, stones, mushrooms)
             */
            objectParameters: { ...defaultSceneStyle.objectParameters },

            /**
             * Lantern ground light parameters
             */
            lanternGroundLightParameters: { ...defaultSceneStyle.lanternGroundLightParameters },

            /**Border parameters */
            borderParameters: { ...defaultSceneStyle.borderParameters },
            setBorderParameters: (parameters) => {
                set({ borderParameters: parameters })
            },

            /**
             * Dithering parameters
             */
            ditheringParameters: { ...defaultSceneStyle.ditheringParameters },

            /**
             * Background parameters
             */
            backgroundParameters: { ...defaultSceneStyle.backgroundParameters },

            /**
             * Global painterly postprocessing parameters
             */
            painterlyPostParameters: { ...defaultSceneStyle.painterlyPostParameters },

            /**
             * Character parameters
             */
            characterParameters: { ...defaultSceneStyle.characterParameters },

            /**
             * Character stylized material parameters
             */
            characterMaterialParameters: cloneSceneStyleSection(defaultSceneStyle.characterMaterialParameters),

            /**
             * Camera debug parameters
             */
            cameraParameters: { ...DEFAULT_CAMERA_PARAMETERS },
            arrowParameters: { ...DEFAULT_ARROW_PARAMETERS },
            songGameParameters: { ...DEFAULT_SONG_GAME_PARAMETERS },

            /**
             * Paintery brush texture stylization (baked once)
             */
            painteryTextureParameters: { ...DEFAULT_PAINTERY_TEXTURE_PARAMETERS },

            /**
             * Stylized silhouette edge (option A) — props only
             */
            edgeParameters: { ...defaultSceneStyle.edgeParameters },

            /**
             * Stylized game UI (speech bubble + buttons)
             */
            gameUiVersion: GAME_UI_VERSION,
            gameUiParameters: { ...DEFAULT_GAME_UI_PARAMETERS },

            /**
             * Performance & Debug parameters
             */
            perfVisible: false,
            setPerfVisible: (visible) => {
                set({ perfVisible: visible })
            },

            backgroundWireframe: false,
            setBackgroundWireframe: (visible) => {
                set({ backgroundWireframe: visible })
            },

            /**
             * Controls
             */
            controls: {
                forward: false,
                backward: false,
                leftward: false,
                rightward: false,
                jump: false,
            },
            setControl: (name, value) => {
                set((state) => ({
                    controls: {
                        ...state.controls,
                        [name]: value,
                    },
                }))
            },
        }))
    )

const useStore = import.meta?.hot?.data?.store ?? createStore()
if (import.meta?.hot) {
    const state = useStore.getState()
    const applyGrassStyleDefaults = state.grassStyleVersion !== GRASS_STYLE_VERSION
    const applyCharacterStylizedDefaults = state.characterStylizedVersion !== CHARACTER_STYLIZED_VERSION
    const applyGameUiDefaults = state.gameUiVersion !== GAME_UI_VERSION
    const characterMaterialParameters = applyCharacterStylizedDefaults
        ? cloneSceneStyleSection(defaultSceneStyle.characterMaterialParameters)
        : {
              ...defaultSceneStyle.characterMaterialParameters,
              ...state.characterMaterialParameters,
              materials: Object.fromEntries(
                  Object.entries(defaultSceneStyle.characterMaterialParameters.materials).map(([id, colors]) => [
                      id,
                      {
                          ...colors,
                          ...state.characterMaterialParameters?.materials?.[id],
                      },
                  ])
              ),
          }

    delete characterMaterialParameters.palettePreset

    useStore.setState({
        sceneStylePreset: applyGrassStyleDefaults
            ? defaultSceneStyleId
            : state.sceneStylePreset === 'flatStyle'
              ? defaultSceneStyleId
              : state.sceneStylePreset ?? defaultSceneStyleId,
        grassStyleVersion: GRASS_STYLE_VERSION,
        characterStylizedVersion: CHARACTER_STYLIZED_VERSION,
        gameUiVersion: GAME_UI_VERSION,
        terrainParameters: {
            ...defaultSceneStyle.terrainParameters,
            ...state.terrainParameters,
        },
        grassParameters: applyGrassStyleDefaults ? { ...defaultSceneStyle.grassParameters } : state.grassParameters ?? { ...defaultSceneStyle.grassParameters },
        grassPatchParameters: {
            ...defaultSceneStyle.grassPatchParameters,
            ...(applyGrassStyleDefaults ? {} : state.grassPatchParameters),
            debugCenters: false,
            debugBorders: false,
            debugPatchColors: false,
        },
        roadParameters: {
            ...defaultSceneStyle.roadParameters,
            ...state.roadParameters,
        },
        objectParameters: {
            ...defaultSceneStyle.objectParameters,
            ...state.objectParameters,
        },
        windParameters: state.windParameters ?? { ...defaultSceneStyle.windParameters },
        lanternGroundLightParameters: applyGrassStyleDefaults
            ? { ...defaultSceneStyle.lanternGroundLightParameters }
            : state.lanternGroundLightParameters,
        borderParameters: applyGrassStyleDefaults
            ? { ...defaultSceneStyle.borderParameters }
            : {
                  ...defaultSceneStyle.borderParameters,
                  ...state.borderParameters,
              },
        ditheringParameters: applyGrassStyleDefaults ? { ...defaultSceneStyle.ditheringParameters } : state.ditheringParameters,
        backgroundParameters: {
            ...defaultSceneStyle.backgroundParameters,
            ...state.backgroundParameters,
        },
        painterlyPostParameters: {
            ...defaultSceneStyle.painterlyPostParameters,
            ...state.painterlyPostParameters,
        },
        characterMaterialParameters,
        cameraParameters: { ...DEFAULT_CAMERA_PARAMETERS },
        arrowParameters: { ...DEFAULT_ARROW_PARAMETERS, ...state.arrowParameters },
        songGameParameters: { ...DEFAULT_SONG_GAME_PARAMETERS, ...state.songGameParameters },
        painteryTextureParameters: { ...DEFAULT_PAINTERY_TEXTURE_PARAMETERS, ...state.painteryTextureParameters },
        edgeParameters: { ...defaultSceneStyle.edgeParameters, ...state.edgeParameters },
        gameUiParameters: applyGameUiDefaults ? { ...DEFAULT_GAME_UI_PARAMETERS } : { ...DEFAULT_GAME_UI_PARAMETERS, ...state.gameUiParameters },
    })
    import.meta.hot.data.store = useStore
}

export default useStore
