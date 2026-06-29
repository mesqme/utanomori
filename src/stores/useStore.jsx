import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import * as THREE from 'three'
import { cloneSceneStyleSection, defaultSceneStyle } from '../config/sceneStyles.js'
import {
    cloneSheepCharacters,
    GRASS_STYLE_VERSION,
    CHARACTER_STYLIZED_VERSION,
    OBJECT_STYLE_VERSION,
    LOADER_DEBUG_VERSION,
    GAME_UI_VERSION,
    DEFAULT_CAMERA_PARAMETERS,
    DEFAULT_LOADER_DEBUG_PARAMETERS,
    DEFAULT_LANTERN_FIRE_PARAMETERS,
    DEFAULT_LANTERN_GRASS_PARAMETERS,
    DEFAULT_INTRO_CAMERA_PARAMETERS,
    DEFAULT_ARROW_PARAMETERS,
    DEFAULT_SONG_GAME_PARAMETERS,
    DEFAULT_MUSIC_STONE_PARAMETERS,
    DEFAULT_MUSIC_PARAMETERS,
    DEFAULT_AMBIENT_SOUND_PARAMETERS,
    DEFAULT_CHARACTER_EYES_PARAMETERS,
    DEFAULT_TREE_EYES_PARAMETERS,
    DEFAULT_SHEEP_PARAMETERS,
    DEFAULT_SHEEP_MATERIAL_PARAMETERS,
    DEFAULT_PAINTERY_TEXTURE_PARAMETERS,
    DEFAULT_GAME_UI_PARAMETERS,
} from '../config/parameterDefaults.js'

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

            // World positions of the flame and the glow halo (lantern bone origin + their own
            // local offsets, see MainCharacter) — independent so they can sit apart.
            lanternFirePosition: new THREE.Vector3(0, 0, 0),
            setLanternFirePosition: (position) => {
                get().lanternFirePosition.copy(position)
            },
            lanternGlowPosition: new THREE.Vector3(0, 0, 0),
            setLanternGlowPosition: (position) => {
                get().lanternGlowPosition.copy(position)
            },

            grassStyleVersion: GRASS_STYLE_VERSION,
            characterStylizedVersion: CHARACTER_STYLIZED_VERSION,
            objectStyleVersion: OBJECT_STYLE_VERSION,
            loaderDebugVersion: LOADER_DEBUG_VERSION,

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
            loaderDebugParameters: { ...DEFAULT_LOADER_DEBUG_PARAMETERS },
            lanternFireParameters: { ...DEFAULT_LANTERN_FIRE_PARAMETERS },
            lanternGrassParameters: { ...DEFAULT_LANTERN_GRASS_PARAMETERS },
            introCameraParameters: { ...DEFAULT_INTRO_CAMERA_PARAMETERS },
            // Bump to replay the intro camera travel live (GameDirector watches this).
            introReplayNonce: 0,
            replayIntro: () => set((s) => ({ introReplayNonce: s.introReplayNonce + 1 })),
            arrowParameters: { ...DEFAULT_ARROW_PARAMETERS },
            songGameParameters: { ...DEFAULT_SONG_GAME_PARAMETERS },
            musicStoneParameters: { ...DEFAULT_MUSIC_STONE_PARAMETERS },
            musicParameters: { ...DEFAULT_MUSIC_PARAMETERS },
            ambientSoundParameters: { ...DEFAULT_AMBIENT_SOUND_PARAMETERS },
            characterEyesParameters: { ...DEFAULT_CHARACTER_EYES_PARAMETERS },
            treeEyesParameters: { ...DEFAULT_TREE_EYES_PARAMETERS },
            sheepParameters: { ...DEFAULT_SHEEP_PARAMETERS },
            sheepMaterialParameters: { ...DEFAULT_SHEEP_MATERIAL_PARAMETERS, characters: cloneSheepCharacters() },

            /**
             * Paintery brush texture stylization (baked once)
             */
            painteryTextureParameters: { ...DEFAULT_PAINTERY_TEXTURE_PARAMETERS },

            /**
             * Stylized silhouette edge (option A) — tree leaves only
             */
            edgeParameters: { ...defaultSceneStyle.edgeParameters },

            /**
             * Fresnel colour rim — hard-surface props (trunks / stones / mushrooms)
             */
            propRimParameters: { ...defaultSceneStyle.propRimParameters },

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
    const applyObjectStyleDefaults = state.objectStyleVersion !== OBJECT_STYLE_VERSION
    const applyLoaderDebugDefaults = state.loaderDebugVersion !== LOADER_DEBUG_VERSION
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
        grassStyleVersion: GRASS_STYLE_VERSION,
        characterStylizedVersion: CHARACTER_STYLIZED_VERSION,
        gameUiVersion: GAME_UI_VERSION,
        objectStyleVersion: OBJECT_STYLE_VERSION,
        loaderDebugVersion: LOADER_DEBUG_VERSION,
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
        objectParameters: applyObjectStyleDefaults ? { ...defaultSceneStyle.objectParameters } : { ...defaultSceneStyle.objectParameters, ...state.objectParameters },
        windParameters: state.windParameters ?? { ...defaultSceneStyle.windParameters },
        lanternGroundLightParameters: applyGrassStyleDefaults ? { ...defaultSceneStyle.lanternGroundLightParameters } : state.lanternGroundLightParameters,
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
        loaderDebugParameters: applyLoaderDebugDefaults ? { ...DEFAULT_LOADER_DEBUG_PARAMETERS } : { ...DEFAULT_LOADER_DEBUG_PARAMETERS, ...state.loaderDebugParameters },
        lanternFireParameters: { ...DEFAULT_LANTERN_FIRE_PARAMETERS, ...state.lanternFireParameters },
        lanternGrassParameters: { ...DEFAULT_LANTERN_GRASS_PARAMETERS, ...state.lanternGrassParameters },
        introCameraParameters: { ...DEFAULT_INTRO_CAMERA_PARAMETERS, ...state.introCameraParameters },
        // Re-inject the replay action/nonce on HMR (the preserved store keeps its old actions,
        // so a freshly-added action would otherwise be missing → the "redo" button no-ops).
        introReplayNonce: state.introReplayNonce ?? 0,
        replayIntro: () => useStore.setState((s) => ({ introReplayNonce: (s.introReplayNonce ?? 0) + 1 })),
        arrowParameters: { ...DEFAULT_ARROW_PARAMETERS, ...state.arrowParameters },
        songGameParameters: { ...DEFAULT_SONG_GAME_PARAMETERS, ...state.songGameParameters },
        musicStoneParameters: { ...DEFAULT_MUSIC_STONE_PARAMETERS, ...state.musicStoneParameters },
        musicParameters: { ...DEFAULT_MUSIC_PARAMETERS, ...state.musicParameters },
        ambientSoundParameters: { ...DEFAULT_AMBIENT_SOUND_PARAMETERS, ...state.ambientSoundParameters },
        characterEyesParameters: { ...DEFAULT_CHARACTER_EYES_PARAMETERS, ...state.characterEyesParameters },
        treeEyesParameters: { ...DEFAULT_TREE_EYES_PARAMETERS, ...state.treeEyesParameters },
        sheepParameters: { ...DEFAULT_SHEEP_PARAMETERS, ...state.sheepParameters },
        sheepMaterialParameters: {
            ...DEFAULT_SHEEP_MATERIAL_PARAMETERS,
            ...state.sheepMaterialParameters,
            characters: { ...cloneSheepCharacters(), ...state.sheepMaterialParameters?.characters },
        },
        painteryTextureParameters: { ...DEFAULT_PAINTERY_TEXTURE_PARAMETERS, ...state.painteryTextureParameters },
        edgeParameters: applyObjectStyleDefaults ? { ...defaultSceneStyle.edgeParameters } : { ...defaultSceneStyle.edgeParameters, ...state.edgeParameters },
        propRimParameters: applyObjectStyleDefaults ? { ...defaultSceneStyle.propRimParameters } : { ...defaultSceneStyle.propRimParameters, ...state.propRimParameters },
        gameUiParameters: applyGameUiDefaults ? { ...DEFAULT_GAME_UI_PARAMETERS } : { ...DEFAULT_GAME_UI_PARAMETERS, ...state.gameUiParameters },
    })
    import.meta.hot.data.store = useStore
}

export default useStore
