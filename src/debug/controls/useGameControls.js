import { button, folder, useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'

export function useGameControls() {
    const introCameraParameters = useStore((state) => state.introCameraParameters)
    const replayIntro = useStore((state) => state.replayIntro)
    const arrowParameters = useStore((state) => state.arrowParameters)
    const songGameParameters = useStore((state) => state.songGameParameters)
    const musicStoneParameters = useStore((state) => state.musicStoneParameters)

    // ======================================================================================
    // Game — the song mini-game staging, companion notes/emotes, the target arrow, and the
    // intro camera travel.
    // ======================================================================================
    useControls('Game.Minigame', {
        'Note colours': folder(
            {
                note1: { value: musicStoneParameters.color0, onChange: setParam('musicStoneParameters', 'color0') },
                note2: { value: musicStoneParameters.color1, onChange: setParam('musicStoneParameters', 'color1') },
                note3: { value: musicStoneParameters.color2, onChange: setParam('musicStoneParameters', 'color2') },
                note4: { value: musicStoneParameters.color3, onChange: setParam('musicStoneParameters', 'color3') },
                note5: { value: musicStoneParameters.color4, onChange: setParam('musicStoneParameters', 'color4') },
                note6: { value: musicStoneParameters.color5, onChange: setParam('musicStoneParameters', 'color5') },
            },
            { collapsed: true }
        ),
        // Desktop rainbow-arc staging (mobile line/grid staging lives under Mobile → Stones).
        Stones: folder(
            {
                radius: { value: musicStoneParameters.radius, min: 1, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'radius') },
                scale: { value: musicStoneParameters.scale, min: 0.1, max: 3, step: 0.05, onChange: setParam('musicStoneParameters', 'scale') },
                yOffset: { value: musicStoneParameters.yOffset, min: -2, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'yOffset') },
                hoverHeight: { value: musicStoneParameters.hoverHeight, min: 0, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'hoverHeight') },
                bobAmount: { value: musicStoneParameters.bobAmount, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'bobAmount') },
                bobSpeed: { value: musicStoneParameters.bobSpeed, min: 0, max: 5, step: 0.05, onChange: setParam('musicStoneParameters', 'bobSpeed') },
                floatRotate: { value: musicStoneParameters.floatRotate, onChange: setParam('musicStoneParameters', 'floatRotate') },
                floatRotateAmount: { value: musicStoneParameters.floatRotateAmount, min: 0, max: 0.6, step: 0.01, onChange: setParam('musicStoneParameters', 'floatRotateAmount') },
            },
            { collapsed: true }
        ),
        Reactions: folder(
            {
                flashBoost: { value: musicStoneParameters.flashBoost, min: 0, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'flashBoost') },
                flashDuration: { value: musicStoneParameters.flashDuration, min: 0.05, max: 2, step: 0.01, onChange: setParam('musicStoneParameters', 'flashDuration') },
                hoverBoost: { value: musicStoneParameters.hoverBoost, min: 0, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'hoverBoost') },
                hoverScale: { value: musicStoneParameters.hoverScale, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'hoverScale') },
                hoverProxyRadius: { value: musicStoneParameters.hoverProxyRadius, min: 0.5, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'hoverProxyRadius') },
            },
            { collapsed: true }
        ),
        Flow: folder(
            {
                listenTempo: { value: musicStoneParameters.listenTempo, min: 0.5, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'listenTempo') },
                notePlayDuration: { value: musicStoneParameters.notePlayDuration, min: 0.2, max: 3, step: 0.05, onChange: setParam('musicStoneParameters', 'notePlayDuration') },
                roundClearPause: { value: musicStoneParameters.roundClearPause, min: 0, max: 4, step: 0.1, onChange: setParam('musicStoneParameters', 'roundClearPause') },
                countdownFrom: { value: musicStoneParameters.countdownFrom, min: 1, max: 5, step: 1, onChange: setParam('musicStoneParameters', 'countdownFrom') },
                countdownStep: { value: musicStoneParameters.countdownStep, min: 0.3, max: 1.5, step: 0.05, onChange: setParam('musicStoneParameters', 'countdownStep') },
                staggerDelay: { value: musicStoneParameters.staggerDelay, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'staggerDelay') },
                scaleInDuration: { value: musicStoneParameters.scaleInDuration, min: 0.1, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'scaleInDuration') },
                scaleOutDuration: { value: musicStoneParameters.scaleOutDuration, min: 0.1, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'scaleOutDuration') },
            },
            { collapsed: true }
        ),
        // Camera lerp + look-at during the game; distances live in Desktop/Mobile → Camera.
        'Camera & Pointer': folder(
            {
                cameraLerp: { value: musicStoneParameters.cameraLerp, min: 0.5, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'cameraLerp') },
                dialogueTargetY: { value: musicStoneParameters.dialogueTargetY, min: 0, max: 4, step: 0.1, onChange: setParam('musicStoneParameters', 'dialogueTargetY') },
                pointerRadius: { value: musicStoneParameters.pointerRadius, min: 0, max: 6, step: 0.05, onChange: setParam('musicStoneParameters', 'pointerRadius') },
                seeThroughEnabled: { value: musicStoneParameters.seeThroughEnabled, onChange: setParam('musicStoneParameters', 'seeThroughEnabled') },
                seeThroughRadius: { value: musicStoneParameters.seeThroughRadius, min: 1, max: 14, step: 0.1, onChange: setParam('musicStoneParameters', 'seeThroughRadius') },
            },
            { collapsed: true }
        ),
    }, { collapsed: true })

    // Floating notes over a singing companion + the ♥/❗ feedback emotes.
    useControls('Game.Notes & Emotes', {
        interactRadius: { value: songGameParameters.interactRadius, min: 1, max: 12, step: 0.1, onChange: setParam('songGameParameters', 'interactRadius') },
        noteDuration: { value: songGameParameters.noteDuration, min: 0.4, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteDuration') },
        noteGrow: { value: songGameParameters.noteGrow, min: 0.5, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteGrow') },
        noteScale: { value: songGameParameters.noteScale, min: 0.02, max: 1, step: 0.01, onChange: setParam('songGameParameters', 'noteScale') },
        noteRiseWorld: { value: songGameParameters.noteRiseWorld, min: 0, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteRiseWorld') },
        noteWobbleWorld: { value: songGameParameters.noteWobbleWorld, min: 0, max: 1.5, step: 0.01, onChange: setParam('songGameParameters', 'noteWobbleWorld') },
        heartScale: { value: songGameParameters.heartScale, min: 0.02, max: 1, step: 0.01, onChange: setParam('songGameParameters', 'heartScale') },
        markScale: { value: songGameParameters.markScale, min: 0.02, max: 1, step: 0.01, onChange: setParam('songGameParameters', 'markScale') },
    }, { collapsed: true })

    useControls('Game.Target Arrow', {
        distance: { value: arrowParameters.distance, min: 0.5, max: 12, step: 0.1, onChange: setParam('arrowParameters', 'distance') },
        yOffset: { value: arrowParameters.yOffset, min: 0, max: 4, step: 0.05, onChange: setParam('arrowParameters', 'yOffset') },
        scale: { value: arrowParameters.scale, min: 0.05, max: 2, step: 0.01, onChange: setParam('arrowParameters', 'scale') },
        modelYaw: { value: arrowParameters.modelYaw, min: 0, max: 360, step: 1, onChange: setParam('arrowParameters', 'modelYaw') },
        closeRadius: { value: arrowParameters.closeRadius, min: 0, max: 20, step: 0.1, onChange: setParam('arrowParameters', 'closeRadius') },
        closeBand: { value: arrowParameters.closeBand, min: 0.1, max: 12, step: 0.1, onChange: setParam('arrowParameters', 'closeBand') },
        overheadHeight: { value: arrowParameters.overheadHeight, min: 0, max: 8, step: 0.1, onChange: setParam('arrowParameters', 'overheadHeight') },
        spinSpeed: { value: arrowParameters.spinSpeed, min: 0, max: 8, step: 0.05, onChange: setParam('arrowParameters', 'spinSpeed') },
        floatAmount: { value: arrowParameters.floatAmount, min: 0, max: 2, step: 0.02, onChange: setParam('arrowParameters', 'floatAmount') },
        floatSpeed: { value: arrowParameters.floatSpeed, min: 0, max: 8, step: 0.1, onChange: setParam('arrowParameters', 'floatSpeed') },
        color: { value: arrowParameters.color, onChange: setParam('arrowParameters', 'color') },
    }, { collapsed: true })

    useControls('Game.Intro Camera', {
        'redo the animation': button(() => replayIntro()),
        spiralDuration: { value: introCameraParameters.spiralDuration, min: 0.3, max: 8, step: 0.05, onChange: setParam('introCameraParameters', 'spiralDuration') },
        orbitDistance: { value: introCameraParameters.orbitDistance, min: 3, max: 40, step: 0.5, onChange: setParam('introCameraParameters', 'orbitDistance') },
    }, { collapsed: true })
}
