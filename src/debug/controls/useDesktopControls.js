import { folder, useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'

export function useDesktopControls() {
    const cameraParameters = useStore((state) => state.cameraParameters)
    const musicStoneParameters = useStore((state) => state.musicStoneParameters)
    const gameUiParameters = useStore((state) => state.gameUiParameters)

    // ======================================================================================
    // Desktop — the desktop DOM-UI skin + camera distances.
    // ======================================================================================
    // The whole in-game UI skin (SpeechBubble + InteractionPrompt + SongGame HUD + key chips). Each
    // value is written to a CSS custom property on :root (see the effect above) so the DOM UI restyles
    // live.
    useControls('Desktop.UI', {
        'Text & scale': folder(
            {
                uiScale: { value: gameUiParameters.uiScale, min: 0.5, max: 3, step: 0.05, onChange: setParam('gameUiParameters', 'uiScale') },
                sizeFloor: { value: gameUiParameters.sizeFloor, min: 0, max: 16, step: 0.5, label: 'sizeFloor (px)', onChange: setParam('gameUiParameters', 'sizeFloor') },
                sizeCeil: { value: gameUiParameters.sizeCeil, min: 7, max: 40, step: 0.1, label: 'sizeCeil (px)', onChange: setParam('gameUiParameters', 'sizeCeil') },
                bubbleWidth: { value: gameUiParameters.bubbleWidth, min: 200, max: 1600, step: 10, onChange: setParam('gameUiParameters', 'bubbleWidth') },
            },
            { collapsed: false }
        ),
        'Corners & frame': folder(
            {
                panelRadius: { value: gameUiParameters.panelRadius, min: 0, max: 4, step: 0.02, label: 'panelRadius (vmin)', onChange: setParam('gameUiParameters', 'panelRadius') },
                chipRadius: { value: gameUiParameters.chipRadius, min: 0, max: 3, step: 0.02, label: 'chipRadius (vmin)', onChange: setParam('gameUiParameters', 'chipRadius') },
                borderWidth: { value: gameUiParameters.borderWidth, min: 0, max: 6, step: 0.5, onChange: setParam('gameUiParameters', 'borderWidth') },
            },
            { collapsed: false }
        ),
        'Sound HUD': folder(
            {
                soundControlSize: { value: gameUiParameters.soundControlSize, min: 2, max: 6, step: 0.05, label: 'button/counter size', onChange: setParam('gameUiParameters', 'soundControlSize') },
                volFrameHeight: { value: gameUiParameters.volFrameHeight, min: 3, max: 20, step: 0.1, label: 'frame height', onChange: setParam('gameUiParameters', 'volFrameHeight') },
                volSliderHeight: { value: gameUiParameters.volSliderHeight, min: 3, max: 18, step: 0.1, label: 'bar length', onChange: setParam('gameUiParameters', 'volSliderHeight') },
                volSliderTrack: { value: gameUiParameters.volSliderTrack, min: 0.1, max: 2, step: 0.05, label: 'bar width', onChange: setParam('gameUiParameters', 'volSliderTrack') },
                volSliderThumb: { value: gameUiParameters.volSliderThumb, min: 0.4, max: 3, step: 0.05, label: 'thumb size', onChange: setParam('gameUiParameters', 'volSliderThumb') },
                volEmptyOpacity: { value: gameUiParameters.volEmptyOpacity, min: 0, max: 1, step: 0.01, label: 'empty opacity', onChange: setParam('gameUiParameters', 'volEmptyOpacity') },
            },
            { collapsed: true }
        ),
        'Speech bubble': folder(
            {
                bubblePadX: { value: gameUiParameters.bubblePadX, min: 0, max: 8, step: 0.1, onChange: setParam('gameUiParameters', 'bubblePadX') },
                bubblePadY: { value: gameUiParameters.bubblePadY, min: 0, max: 8, step: 0.1, onChange: setParam('gameUiParameters', 'bubblePadY') },
            },
            { collapsed: true }
        ),
        'Countdown': folder(
            {
                countSize: { value: gameUiParameters.countSize, min: 2, max: 12, step: 0.1, onChange: setParam('gameUiParameters', 'countSize') },
                countBox: { value: gameUiParameters.countBox, min: 4, max: 20, step: 0.1, onChange: setParam('gameUiParameters', 'countBox') },
                countBorder: { value: gameUiParameters.countBorder, min: 0, max: 8, step: 0.5, label: 'countBorder (px)', onChange: setParam('gameUiParameters', 'countBorder') },
                countNudge: { value: gameUiParameters.countNudge, min: -0.25, max: 0.25, step: 0.005, onChange: setParam('gameUiParameters', 'countNudge') },
            },
            { collapsed: true }
        ),
        'Key chips': folder(
            {
                chipSize: { value: gameUiParameters.chipSize, min: 1, max: 6, step: 0.05, onChange: setParam('gameUiParameters', 'chipSize') },
                chipPadX: { value: gameUiParameters.chipPadX, min: 0, max: 3, step: 0.05, onChange: setParam('gameUiParameters', 'chipPadX') },
                chipBorder: { value: gameUiParameters.chipBorder, min: 0, max: 4, step: 0.25, onChange: setParam('gameUiParameters', 'chipBorder') },
                chipNudge: { value: gameUiParameters.chipNudge, min: -0.25, max: 0.25, step: 0.005, onChange: setParam('gameUiParameters', 'chipNudge') },
                chipNudgeX: { value: gameUiParameters.chipNudgeX, min: -0.25, max: 0.25, step: 0.005, onChange: setParam('gameUiParameters', 'chipNudgeX') },
            },
            { collapsed: true }
        ),
        'Start button': folder(
            {
                startBtnSize: { value: gameUiParameters.startBtnSize, min: 1, max: 5, step: 0.05, onChange: setParam('gameUiParameters', 'startBtnSize') },
                startBtnPadX: { value: gameUiParameters.startBtnPadX, min: 0, max: 8, step: 0.1, onChange: setParam('gameUiParameters', 'startBtnPadX') },
                startBtnPadY: { value: gameUiParameters.startBtnPadY, min: 0, max: 5, step: 0.1, onChange: setParam('gameUiParameters', 'startBtnPadY') },
            },
            { collapsed: true }
        ),
        'Credits buttons': folder(
            {
                creditsBtnSize: { value: gameUiParameters.creditsBtnSize, min: 1, max: 5, step: 0.05, onChange: setParam('gameUiParameters', 'creditsBtnSize') },
                creditsBtnPadX: { value: gameUiParameters.creditsBtnPadX, min: 0, max: 10, step: 0.1, onChange: setParam('gameUiParameters', 'creditsBtnPadX') },
                creditsBtnPadY: { value: gameUiParameters.creditsBtnPadY, min: 0, max: 5, step: 0.1, onChange: setParam('gameUiParameters', 'creditsBtnPadY') },
                creditsBtnOffset: { value: gameUiParameters.creditsBtnOffset, min: 0, max: 45, step: 0.5, label: 'creditsBtnOffset (%)', onChange: setParam('gameUiParameters', 'creditsBtnOffset') },
            },
            { collapsed: true }
        ),
        'Dialogue reveal': folder(
            {
                wordStagger: { value: gameUiParameters.wordStagger, min: 0, max: 300, step: 5, onChange: setParam('gameUiParameters', 'wordStagger') },
                wordFade: { value: gameUiParameters.wordFade, min: 80, max: 1200, step: 10, onChange: setParam('gameUiParameters', 'wordFade') },
            },
            { collapsed: true }
        ),
        'Tutorial': folder(
            {
                tutorialEnabled: { value: gameUiParameters.tutorialEnabled, label: 'enabled', onChange: setParam('gameUiParameters', 'tutorialEnabled') },
                tutorialImageSize: { value: gameUiParameters.tutorialImageSize, min: 15, max: 75, step: 1, label: 'imageSize (vh)', onChange: setParam('gameUiParameters', 'tutorialImageSize') },
                tutorialImageFrame: { value: gameUiParameters.tutorialImageFrame, label: 'image frame', onChange: setParam('gameUiParameters', 'tutorialImageFrame') },
                tutorialFrameRadius: { value: gameUiParameters.tutorialFrameRadius, min: 0, max: 40, step: 1, label: 'frameRadius (px)', onChange: setParam('gameUiParameters', 'tutorialFrameRadius') },
                tutorialImageRadius: { value: gameUiParameters.tutorialImageRadius, min: 0, max: 40, step: 1, label: 'imageRadius (px)', onChange: setParam('gameUiParameters', 'tutorialImageRadius') },
                tutorialPadding: { value: gameUiParameters.tutorialPadding, min: 0, max: 8, step: 0.1, label: 'image↔frame pad', onChange: setParam('gameUiParameters', 'tutorialPadding') },
                tutorialButtonOutside: { value: gameUiParameters.tutorialButtonOutside, label: 'button outside', onChange: setParam('gameUiParameters', 'tutorialButtonOutside') },
            },
            { collapsed: true }
        ),
    }, { collapsed: true })

    // ALL desktop camera distances in one place — gameplay walk, the two dialogue framings, and the
    // mini-game top-down shot (the minigame/talk values live in musicStoneParameters).
    useControls('Desktop.Camera', {
        followDistance: { value: cameraParameters.followDistance, label: 'walk distance', min: 6, max: 32, step: 0.1, onChange: setParam('cameraParameters', 'followDistance') },
        followHeight: { value: cameraParameters.followHeight, label: 'walk height', min: 4, max: 28, step: 0.1, onChange: setParam('cameraParameters', 'followHeight') },
        frontDistance: { value: cameraParameters.frontDistance, label: 'intro-talk dist', min: 6, max: 32, step: 0.1, onChange: setParam('cameraParameters', 'frontDistance') },
        frontHeight: { value: cameraParameters.frontHeight, label: 'intro-talk height', min: 0.5, max: 16, step: 0.1, onChange: setParam('cameraParameters', 'frontHeight') },
        minigameDistance: { value: musicStoneParameters.cameraDistance, label: 'minigame dist', min: 4, max: 30, step: 0.5, onChange: setParam('musicStoneParameters', 'cameraDistance') },
        minigameHeight: { value: musicStoneParameters.cameraHeight, label: 'minigame height', min: 2, max: 30, step: 0.5, onChange: setParam('musicStoneParameters', 'cameraHeight') },
        talkDistance: { value: musicStoneParameters.dialogueCameraDistance, label: 'char-talk dist', min: 2, max: 20, step: 0.5, onChange: setParam('musicStoneParameters', 'dialogueCameraDistance') },
        talkHeight: { value: musicStoneParameters.dialogueCameraHeight, label: 'char-talk height', min: 0.5, max: 14, step: 0.1, onChange: setParam('musicStoneParameters', 'dialogueCameraHeight') },
    }, { collapsed: true })
}
