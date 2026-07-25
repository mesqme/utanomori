// The two parameter groups the LOADER needs — kept in their own module purely so the entry chunk
// can reach them without importing parameterDefaults.js.
//
// Why that matters: useLoaderShell.jsx ships in the tiny three-free entry chunk, and
// parameterDefaults.js ends with `DEFAULT_GAME_UI_PARAMETERS = defaultSceneStyle.gameUiParameters`,
// which hard-links the whole painteryStyle object. Importing anything from there therefore dragged
// the ENTIRE scene catalogue — grass tints, prop colours, sheep params — into the chunk whose only
// job is painting a loading ring.
//
// These stay the single definition: parameterDefaults.js re-exports them, so every other import
// site (and the "one home for defaults" story) is unchanged. Edit values HERE.

export const DEFAULT_LOADER_DEBUG_PARAMETERS = {
    enabled: false,
    targetX: 5.71,
    targetZ: 0.04,
    nudgeStep: 0.02,
    circleRadius: 106,
    ringWidth: 15.5,
    cameraHeight: 18,
}

// Mobile UI tweaks: the overall DOM UI scale (bigger on a phone) + a smaller loading ring, with the
// initial hat-shot camera zoomed out to match the smaller ring (the ring must keep covering the hat).
export const DEFAULT_MOBILE_UI_PARAMETERS = {
    uiScale: 2.45, // multiplies --ui-scale on the mobile experience (desktop uses gameUi.uiScale)
    // --ui-vmin = clamp(sizeFloor, 1vmin, sizeCeil). The desktop floor (6.5px) is too tall for a phone
    // (props the whole UI up); 0 lets the intro bubble / button / title scale down with the small vmin.
    sizeFloor: 0,
    sizeCeil: 10.8,
    loaderRadius: 83, // loading-ring radius on mobile (desktop is loaderDebug.circleRadius ~106)
    loaderRingWidth: 12.5, // loading-ring thickness on mobile
    loaderCameraHeight: 22.8, // zoom the initial top-down hat shot out so the smaller ring still covers it
    // Camera look-at for the hat shot on mobile (its own so the desktop illusion isn't nudged — the
    // slightly different height/aspect projects the hat to a slightly different spot). Desktop uses
    // loaderDebugParameters.targetX/Z.
    loaderTargetX: 5.71,
    loaderTargetZ: 0.06,
    // Portrait-only placement (%, viewport-relative) for touch UI that can't share the desktop spots.
    // "Talk to…" interaction prompt: centred by default (clear of the bottom joystick).
    promptPortraitX: 50, // % from left, centred on this point
    promptPortraitY: 64, // % from top, centred on this point
    // "Round n/3" banner: dropped near the bottom (≈ the joystick zone) instead of the top-left counter.
    roundPortraitY: 20, // % from the bottom edge
    // Landscape-only intro layout: the short viewport crams the title and the speech bubble together
    // over the hero. Narrow the bubble (uses less width) and raise the title (further from the bubble).
    bubbleWidthLandscape: 570, // px — speech-bubble max width on landscape phones
    nameTopLandscape: 7, // % from the top — the intro title's vertical position on landscape phones
    bubbleBottomLandscape: 5, // % from the bottom — vertical position of the bubble block on landscape
    startOffsetLandscape: -4, // px — extra gap above the Start button (down = +, up toward bubble = −)
}
