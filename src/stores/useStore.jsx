import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import * as THREE from 'three'
import { mainCharacterMaterialDefaults } from '../config/mainCharacterMaterials.js'
import { defaultSceneStyle, defaultSceneStyleId } from '../config/sceneStyles.js'

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

            /**
             * Terrain parameters
             */
            terrainParameters: { ...defaultSceneStyle.terrainParameters },

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
             * Character parameters
             */
            characterParameters: { ...defaultSceneStyle.characterParameters },

            /**
             * Character toon material parameters
             */
            characterMaterialParameters: {
                palettePreset: 'previous',
                lightDirectionX: 1,
                lightDirectionY: 0.21,
                lightDirectionZ: 0.22,
                threshold: 0,
                softness: 0,
                materials: mainCharacterMaterialDefaults,
            },

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
    import.meta.hot.data.store = useStore
}

export default useStore
