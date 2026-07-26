import { useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'

export function useAudioControls() {
    const musicParameters = useStore((state) => state.musicParameters)
    const ambientSoundParameters = useStore((state) => state.ambientSoundParameters)

    // ======================================================================================
    // Audio — backing-track mixing + the ambient one-shots. (Note SOUNDS belong to the game
    // characters; only volumes/distances live here.)
    // ======================================================================================
    useControls('Audio.Music', {
        hearNear: { value: musicParameters.hearNear, min: 0, max: 30, step: 0.5, onChange: setParam('musicParameters', 'hearNear') },
        hearFar: { value: musicParameters.hearFar, min: 5, max: 100, step: 1, onChange: setParam('musicParameters', 'hearFar') },
        nearVolume: { value: musicParameters.nearVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'nearVolume') },
        farVolume: { value: musicParameters.farVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'farVolume') },
        distanceFalloff: { value: musicParameters.distanceFalloff, min: 1, max: 5, step: 0.1, onChange: setParam('musicParameters', 'distanceFalloff') },
        collectedVolume: { value: musicParameters.collectedVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'collectedVolume') },
        creditsVolume: { value: musicParameters.creditsVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'creditsVolume') },
        volumeLerp: { value: musicParameters.volumeLerp, min: 0.2, max: 10, step: 0.1, onChange: setParam('musicParameters', 'volumeLerp') },
    })

    useControls('Audio.Ambient SFX', {
        cicadaVolume: { value: ambientSoundParameters.cicadaVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'cicadaVolume') },
        owlVolume: { value: ambientSoundParameters.owlVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'owlVolume') },
        owlGapMin: { value: ambientSoundParameters.owlGapMin, min: 0, max: 30, step: 0.5, onChange: setParam('ambientSoundParameters', 'owlGapMin') },
        owlGapMax: { value: ambientSoundParameters.owlGapMax, min: 1, max: 60, step: 0.5, onChange: setParam('ambientSoundParameters', 'owlGapMax') },
        owlFade: { value: ambientSoundParameters.owlFade, min: 0.1, max: 5, step: 0.1, onChange: setParam('ambientSoundParameters', 'owlFade') },
        footstepVolume: { value: ambientSoundParameters.footstepVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'footstepVolume') },
        footstepInterval: { value: ambientSoundParameters.footstepInterval, min: 0.12, max: 0.8, step: 0.01, onChange: setParam('ambientSoundParameters', 'footstepInterval') },
        footstepSpeedThreshold: { value: ambientSoundParameters.footstepSpeedThreshold, min: 0, max: 4, step: 0.05, onChange: setParam('ambientSoundParameters', 'footstepSpeedThreshold') },
        mumbleVolume: { value: ambientSoundParameters.mumbleVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'mumbleVolume') },
        sadVolume: { value: ambientSoundParameters.sadVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'sadVolume') },
        sighVolume: { value: ambientSoundParameters.sighVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'sighVolume') },
    })
}
