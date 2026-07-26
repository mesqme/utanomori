import { useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'

export function useMobileControls() {
    const joystickParameters = useStore((state) => state.joystickParameters)
    const mobileCameraParameters = useStore((state) => state.mobileCameraParameters)
    const mobileStoneParameters = useStore((state) => state.mobileStoneParameters)
    const mobileUiParameters = useStore((state) => state.mobileUiParameters)

    // ======================================================================================
    // Mobile — everything specific to the touch experience.
    // ======================================================================================
    useControls('Mobile.UI', {
        uiScale: { value: mobileUiParameters.uiScale, min: 0.5, max: 4, step: 0.05, onChange: setParam('mobileUiParameters', 'uiScale') },
        sizeFloor: { value: mobileUiParameters.sizeFloor, min: 0, max: 12, step: 0.1, onChange: setParam('mobileUiParameters', 'sizeFloor') },
        sizeCeil: { value: mobileUiParameters.sizeCeil, min: 4, max: 24, step: 0.1, onChange: setParam('mobileUiParameters', 'sizeCeil') },
        promptPortraitX: { value: mobileUiParameters.promptPortraitX, min: 0, max: 100, step: 1, label: 'talk X (%)', onChange: setParam('mobileUiParameters', 'promptPortraitX') },
        promptPortraitY: { value: mobileUiParameters.promptPortraitY, min: 0, max: 100, step: 1, label: 'talk Y (%)', onChange: setParam('mobileUiParameters', 'promptPortraitY') },
        roundPortraitY: { value: mobileUiParameters.roundPortraitY, min: 0, max: 100, step: 1, label: 'round bottom (%)', onChange: setParam('mobileUiParameters', 'roundPortraitY') },
        bubbleWidthLandscape: { value: mobileUiParameters.bubbleWidthLandscape, min: 200, max: 1600, step: 10, label: 'bubble W landscape', onChange: setParam('mobileUiParameters', 'bubbleWidthLandscape') },
        nameTopLandscape: { value: mobileUiParameters.nameTopLandscape, min: 0, max: 45, step: 1, label: 'name top landscape (%)', onChange: setParam('mobileUiParameters', 'nameTopLandscape') },
        bubbleBottomLandscape: { value: mobileUiParameters.bubbleBottomLandscape, min: 0, max: 80, step: 1, label: 'bubble bottom L (%)', onChange: setParam('mobileUiParameters', 'bubbleBottomLandscape') },
        startOffsetLandscape: { value: mobileUiParameters.startOffsetLandscape, min: -200, max: 300, step: 2, label: 'start offset L (px)', onChange: setParam('mobileUiParameters', 'startOffsetLandscape') },
    })

    useControls('Mobile.Loader', {
        loaderRadius: { value: mobileUiParameters.loaderRadius, min: 20, max: 160, step: 1, onChange: setParam('mobileUiParameters', 'loaderRadius') },
        loaderRingWidth: { value: mobileUiParameters.loaderRingWidth, min: 2, max: 30, step: 0.5, onChange: setParam('mobileUiParameters', 'loaderRingWidth') },
        loaderCameraHeight: { value: mobileUiParameters.loaderCameraHeight, min: 10, max: 80, step: 0.5, onChange: setParam('mobileUiParameters', 'loaderCameraHeight') },
        loaderTargetX: { value: mobileUiParameters.loaderTargetX, min: -10, max: 20, step: 0.01, onChange: setParam('mobileUiParameters', 'loaderTargetX') },
        loaderTargetZ: { value: mobileUiParameters.loaderTargetZ, min: -10, max: 10, step: 0.01, onChange: setParam('mobileUiParameters', 'loaderTargetZ') },
    })

    useControls('Mobile.Stones', {
        lineWidth: { value: mobileStoneParameters.lineWidth, min: 1, max: 12, step: 0.1, onChange: setParam('mobileStoneParameters', 'lineWidth') },
        lineHeight: { value: mobileStoneParameters.lineHeight, min: 0, max: 8, step: 0.1, onChange: setParam('mobileStoneParameters', 'lineHeight') },
        scale: { value: mobileStoneParameters.scale, min: 0.1, max: 2, step: 0.02, onChange: setParam('mobileStoneParameters', 'scale') },
        arrowDrop: { value: mobileStoneParameters.arrowDrop, min: 0, max: 6, step: 0.05, onChange: setParam('mobileStoneParameters', 'arrowDrop') },
        colGap: { value: mobileStoneParameters.colGap, label: 'grid col gap', min: 0.5, max: 6, step: 0.1, onChange: setParam('mobileStoneParameters', 'colGap') },
        rowGap: { value: mobileStoneParameters.rowGap, label: 'grid row gap', min: 0.5, max: 6, step: 0.1, onChange: setParam('mobileStoneParameters', 'rowGap') },
        gridHeight: { value: mobileStoneParameters.gridHeight, label: 'grid height', min: 0, max: 8, step: 0.1, onChange: setParam('mobileStoneParameters', 'gridHeight') },
        gridScale: { value: mobileStoneParameters.gridScale, label: 'grid scale', min: 0.1, max: 2, step: 0.02, onChange: setParam('mobileStoneParameters', 'gridScale') },
    })

    useControls('Mobile.Camera', {
        followDistance: { value: mobileCameraParameters.followDistance, label: 'walk distance', min: 6, max: 40, step: 0.1, onChange: setParam('mobileCameraParameters', 'followDistance') },
        followHeight: { value: mobileCameraParameters.followHeight, label: 'walk height', min: 4, max: 34, step: 0.1, onChange: setParam('mobileCameraParameters', 'followHeight') },
        frontDistance: { value: mobileCameraParameters.frontDistance, label: 'intro-talk dist', min: 6, max: 40, step: 0.1, onChange: setParam('mobileCameraParameters', 'frontDistance') },
        frontHeight: { value: mobileCameraParameters.frontHeight, label: 'intro-talk height', min: 0.5, max: 20, step: 0.1, onChange: setParam('mobileCameraParameters', 'frontHeight') },
        cameraDistance: { value: mobileCameraParameters.cameraDistance, label: 'minigame dist', min: 4, max: 40, step: 0.5, onChange: setParam('mobileCameraParameters', 'cameraDistance') },
        cameraHeight: { value: mobileCameraParameters.cameraHeight, label: 'minigame height', min: 2, max: 34, step: 0.5, onChange: setParam('mobileCameraParameters', 'cameraHeight') },
        dialogueCameraDistance: { value: mobileCameraParameters.dialogueCameraDistance, label: 'char-talk dist', min: 2, max: 26, step: 0.5, onChange: setParam('mobileCameraParameters', 'dialogueCameraDistance') },
        dialogueCameraHeight: { value: mobileCameraParameters.dialogueCameraHeight, label: 'char-talk height', min: 0.5, max: 20, step: 0.1, onChange: setParam('mobileCameraParameters', 'dialogueCameraHeight') },
    })

    useControls('Mobile.Joystick', {
        side: { value: joystickParameters.side, options: ['left', 'right'], onChange: setParam('joystickParameters', 'side') },
        size: { value: joystickParameters.size, min: 60, max: 260, step: 2, onChange: setParam('joystickParameters', 'size') },
        knobSize: { value: joystickParameters.knobSize, min: 24, max: 140, step: 2, onChange: setParam('joystickParameters', 'knobSize') },
        marginX: { value: joystickParameters.marginX, min: 0, max: 200, step: 2, label: 'marginX (landscape)', onChange: setParam('joystickParameters', 'marginX') },
        marginY: { value: joystickParameters.marginY, min: 0, max: 200, step: 2, label: 'marginY (landscape)', onChange: setParam('joystickParameters', 'marginY') },
        marginYPortrait: { value: joystickParameters.marginYPortrait, min: 0, max: 200, step: 2, label: 'marginY (portrait)', onChange: setParam('joystickParameters', 'marginYPortrait') },
        opacity: { value: joystickParameters.opacity, min: 0.1, max: 1, step: 0.05, onChange: setParam('joystickParameters', 'opacity') },
        deadzone: { value: joystickParameters.deadzone, min: 0, max: 0.5, step: 0.01, onChange: setParam('joystickParameters', 'deadzone') },
        // max > 1 on purpose: the default 1.01 DISABLES run (mag caps at 1.0). A max of 1 would make
        // Leva clamp the initial value to 1.0 on registration → run re-engages at full stick push.
        runThreshold: { value: joystickParameters.runThreshold, min: 0.5, max: 1.2, step: 0.01, onChange: setParam('joystickParameters', 'runThreshold') },
        baseColor: { value: joystickParameters.baseColor, onChange: setParam('joystickParameters', 'baseColor') },
        knobColor: { value: joystickParameters.knobColor, onChange: setParam('joystickParameters', 'knobColor') },
    })
}
