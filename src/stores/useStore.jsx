import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import * as THREE from 'three'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'
import { mainCharacterMaterialDefaults } from '../config/mainCharacterMaterials.js'

const PALETTE = soundJourneyPalette

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

            /**
             * Terrain parameters
             */
            terrainParameters: {
                color: PALETTE.terrain,
                backgroundColor: PALETTE.background,
                chunkSize: 9,
                segments: 19,
                scale: 0.08,
                amplitude: 0.7,
                groundTextureScale: 0.11,
                groundTextureContrast: 0.34,
            },

            /**Border parameters */
            borderParameters: {
                noiseStrength: 0.45,
                noiseScale: 0.35,
                circleRadiusFactor: 0.9,
                groundOffset: -0.75,
                groundFadeOffset: 1.0,
            },
            setBorderParameters: (parameters) => {
                set({ borderParameters: parameters })
            },

            /**
             * Dithering parameters
             */
            ditheringParameters: {
                ditherMode: 'Diamond', // 'Diamond' | 'Bayer'
                pixelSize: 1,
            },

            /**
             * Character parameters
             */
            characterParameters: {
                modelScale: 0.51,
                modelYOffset: 0.59,
                rotationOffset: 1.57,
                idleTimeScale: 1,
                runTimeScale: 1.2,
                runBlendInSpeed: 18,
                runBlendOutSpeed: 3,
            },

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
