// Colours shared between the DOM (loader, UI) and a couple of materials. Scene colours proper
// live in config/sceneStyles.js and the themes.
export const palette = Object.freeze({
    background: '#44336c',
    uiPrimary: '#fff8ff',
    // Dark navy loader curtain — matched to the graded scene background base (backgroundColor at
    // skyMixAmount 0, eyedropped from the rendered scene).
    loaderBackground: '#010011',
    loaderHero: '#af0a08',
    uiPanel: 'rgba(9, 8, 34, 0.42)',
    uiPanelHover: 'rgba(255, 248, 255, 0.18)',
    uiPanelActive: 'rgba(255, 248, 255, 0.34)',
    uiRingTrack: 'rgba(255, 248, 255, 0.12)',
})

export function applyPaletteCssVariables(root = document.documentElement) {
    root.style.setProperty('--sj-loader-background', palette.loaderBackground)
    root.style.setProperty('--sj-loader-hero', palette.loaderHero)
    root.style.setProperty('--sj-ui-primary', palette.uiPrimary)
    root.style.setProperty('--sj-ui-panel', palette.uiPanel)
    root.style.setProperty('--sj-ui-panel-hover', palette.uiPanelHover)
    root.style.setProperty('--sj-ui-panel-active', palette.uiPanelActive)
    root.style.setProperty('--sj-ui-ring-track', palette.uiRingTrack)
}
