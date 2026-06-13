import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import * as THREE from 'three'
import { cloneSceneStyleSection, defaultSceneStyle, defaultSceneStyleId } from '../config/sceneStyles.js'

const GRASS_STYLE_VERSION = 9
const CHARACTER_STYLIZED_VERSION = 2

const createStore = () =>
    create(
        subscribeWithSelector((set) => ({
            ballPosition: new THREE.Vector3(0, 0, 0),
            setBallPosition: (position) => {
                set({ ballPosition: position })
            },

            smoothedCircleCenter: new THREE.Vector3(0, 0, 0),
            setSmoothedCircleCenter: (position) => {
                set({ smoothedCircleCenter: position })
            },

            lanternPosition: new THREE.Vector3(0, 0, 0),
            setLanternPosition: (position) => {
                set({ lanternPosition: position })
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
            cameraParameters: {
                debugOrbit: false,
                debugOrbitAngle: 0,
                debugOrbitDistance: 12,
                debugOrbitHeight: 8,
                debugTargetYOffset: 0.4,
            },

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
        sceneStylePreset: state.sceneStylePreset === 'flatStyle' ? defaultSceneStyleId : state.sceneStylePreset ?? defaultSceneStyleId,
        grassStyleVersion: GRASS_STYLE_VERSION,
        characterStylizedVersion: CHARACTER_STYLIZED_VERSION,
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
        painterlyPostParameters: {
            ...defaultSceneStyle.painterlyPostParameters,
            ...state.painterlyPostParameters,
        },
        characterMaterialParameters,
    })
    import.meta.hot.data.store = useStore
}

export default useStore
