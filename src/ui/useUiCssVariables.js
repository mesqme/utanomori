import { useEffect } from 'react'

import useStore from '../stores/useStore.jsx'
import { useIsMobile } from '../config/device.js'

/**
 * Drive the DOM UI's design tokens.
 *
 * PRODUCTION BEHAVIOUR, not debug. style.css keys every size, corner and border of the in-game UI
 * — speech bubbles, prompts, the HUD, the key chips, the tutorial cards, the volume slider, the
 * portrait joystick clearance — off these custom properties. Nothing sets them anywhere else, so
 * without this the whole DOM UI renders at its unstyled fallback sizes.
 *
 * It is called from the debug panel only because that is where the sliders that tune them live.
 */
export function useUiCssVariables() {
    const gameUiParameters = useStore((state) => state.gameUiParameters)
    const mobileUiParameters = useStore((state) => state.mobileUiParameters)
    const joystickParameters = useStore((state) => state.joystickParameters)
    const mobile = useIsMobile()

    // One effect writes the lot onto :root, so any slider change restyles the whole DOM UI at once.
    useEffect(() => {
        const root = document.documentElement.style
        const p = gameUiParameters
        // Sizes route through --ui-vmin (a floored vmin) so they re-evaluate live when --ui-scale or the
        // floor change, and never shrink past the floor at extreme aspect ratios.
        const vm = (n) => `calc(${n} * var(--ui-vmin) * var(--ui-scale))`
        // Mobile bumps the whole DOM UI up (bigger touch targets), tunable via mobileUi.uiScale.
        root.setProperty('--ui-scale', String(mobile ? mobileUiParameters.uiScale : p.uiScale ?? 1.3))
        // Speech-bubble max width: fixed on desktop, but on mobile it scales with the UI + caps to the
        // viewport so it doesn't overflow a narrow phone (the desktop 460px would).
        root.setProperty('--dlg-width', mobile ? 'min(92vw, calc(30 * var(--ui-vmin) * var(--ui-scale)))' : '460px')
        // Mobile uses its own floor/ceil (the desktop floor is too tall for a phone's small vmin).
        root.setProperty('--ui-size-floor', `${mobile ? mobileUiParameters.sizeFloor : p.sizeFloor ?? 6.5}px`)
        root.setProperty('--ui-size-ceil', `${mobile ? mobileUiParameters.sizeCeil : p.sizeCeil ?? 10.8}px`)
        root.setProperty('--ui-radius', vm(p.panelRadius ?? 0.93))
        root.setProperty('--ui-radius-chip', vm(p.chipRadius ?? 0.53))
        root.setProperty('--ui-border', `${p.borderWidth ?? 2}px`)
        root.setProperty('--ui-bubble-pad-y', vm(p.bubblePadY ?? 1.7))
        root.setProperty('--ui-bubble-pad-x', vm(p.bubblePadX ?? 2.5))
        root.setProperty('--ui-count-size', vm(p.countSize ?? 5.2))
        root.setProperty('--ui-count-box', vm(p.countBox ?? 9.2))
        root.setProperty('--ui-count-border', `${p.countBorder ?? 2}px`)
        root.setProperty('--ui-count-nudge', `${p.countNudge ?? 0.04}em`)
        root.setProperty('--ui-chip-size', vm(p.chipSize ?? 2.3))
        root.setProperty('--ui-chip-pad-x', vm(p.chipPadX ?? 0.6))
        root.setProperty('--ui-chip-border', `${p.chipBorder ?? 1}px`)
        root.setProperty('--ui-chip-nudge', `${p.chipNudge ?? 0.05}em`)
        root.setProperty('--ui-chip-nudge-x', `${p.chipNudgeX ?? 0}em`)
        root.setProperty('--start-btn-size', vm(p.startBtnSize ?? 2.0))
        root.setProperty('--start-btn-pad-y', vm(p.startBtnPadY ?? 0.7))
        root.setProperty('--start-btn-pad-x', vm(p.startBtnPadX ?? 2.0))
        root.setProperty('--credits-btn-size', vm(p.creditsBtnSize ?? 2.0))
        root.setProperty('--credits-btn-pad-y', vm(p.creditsBtnPadY ?? 1.2))
        root.setProperty('--credits-btn-pad-x', vm(p.creditsBtnPadX ?? 4.0))
        root.setProperty('--credits-btn-offset', `${p.creditsBtnOffset ?? 9}%`)
        // Tutorial tip cards. Image size is a vh (independent of --ui-vmin so it reads as "% of screen
        // height"); the image frame toggles by driving its border width to 0.
        root.setProperty('--tut-image-size', `${p.tutorialImageSize ?? 44}vh`)
        root.setProperty('--tut-image-border-width', `${(p.tutorialImageFrame ?? true) ? (p.borderWidth ?? 2) : 0}px`)
        root.setProperty('--tut-frame-radius', `${p.tutorialFrameRadius ?? 14}px`)
        root.setProperty('--tut-image-radius', `${p.tutorialImageRadius ?? 14}px`)
        root.setProperty('--tut-pad', vm(p.tutorialPadding ?? 2.0))
        // Top-left sound HUD.
        root.setProperty('--hud-ctrl', vm(p.soundControlSize ?? 3.8))
        root.setProperty('--vol-frame-h', vm(p.volFrameHeight ?? 10.5))
        root.setProperty('--vol-h', vm(p.volSliderHeight ?? 9))
        root.setProperty('--vol-track', vm(p.volSliderTrack ?? 0.5))
        root.setProperty('--vol-thumb', vm(p.volSliderThumb ?? 1.3))
        root.setProperty('--vol-empty', String(p.volEmptyOpacity ?? 0.25))
        // Height the bottom-centre PORTRAIT joystick occupies (margin + stick + a gap) — bottom-centre
        // UI (the "Talk to…" prompt) sits above this in portrait so they never overlap.
        root.setProperty('--joy-clearance', `${(joystickParameters.marginYPortrait ?? 70) + (joystickParameters.size ?? 130) + 24}px`)
        // Portrait-only touch UI positions (consumed inside `@media (orientation:portrait) and (pointer:coarse)`;
        // inert on desktop). "Talk to…" prompt centre + the "Round n/3" banner's bottom offset.
        root.setProperty('--prompt-x', `${mobileUiParameters.promptPortraitX ?? 50}%`)
        root.setProperty('--prompt-y', `${mobileUiParameters.promptPortraitY ?? 50}%`)
        root.setProperty('--round-y', `${mobileUiParameters.roundPortraitY ?? 16}%`)
        // Landscape-only intro tuning (consumed in `@media (orientation:landscape) and (pointer:coarse)`).
        root.setProperty('--dlg-width-landscape', `${mobileUiParameters.bubbleWidthLandscape ?? 560}px`)
        root.setProperty('--name-top-landscape', `${mobileUiParameters.nameTopLandscape ?? 7}%`)
        root.setProperty('--dlg-bottom-landscape', `${mobileUiParameters.bubbleBottomLandscape ?? 12}%`)
        root.setProperty('--dlg-start-offset-landscape', `${mobileUiParameters.startOffsetLandscape ?? 0}px`)
    }, [gameUiParameters, mobile, mobileUiParameters, joystickParameters])
}
