export const soundJourneyPalette = Object.freeze({
    background: '#44336c',
    terrain: '#454496',
    stone: '#8f7bd8',
    leaves: '#111c62',
    trunkLight: '#e8d9ff',
    trunkDark: '#221642',
    hero: '#c93a2d',
    lantern: '#ff9a35',
    fresnel: '#7658ff',
    grassPatchColors: ['#2294c4', '#7b64c9', '#d09a55', '#8ba45f'],
    uiPrimary: '#fff8ff',
    // Dark navy loader curtain — matched to the graded scene background base (backgroundColor at
    // gradient intensity 0, eyedropped from the rendered scene).
    loaderBackground: '#010011',
    loaderHover: '#fff8ff',
    loaderHero: '#af0a08',
    uiPanel: 'rgba(9, 8, 34, 0.42)',
    uiPanelHover: 'rgba(255, 248, 255, 0.18)',
    uiPanelActive: 'rgba(255, 248, 255, 0.34)',
    uiRingTrack: 'rgba(255, 248, 255, 0.12)',
})

export function applySoundJourneyCssVariables(root = document.documentElement) {
    root.style.setProperty('--sj-background', soundJourneyPalette.background)
    root.style.setProperty('--sj-loader-background', soundJourneyPalette.loaderBackground)
    root.style.setProperty('--sj-loader-hero', soundJourneyPalette.loaderHero)
    root.style.setProperty('--sj-loader-hover', soundJourneyPalette.loaderHover)
    root.style.setProperty('--sj-loader-hover-text', soundJourneyPalette.loaderBackground)
    root.style.setProperty('--sj-ui-primary', soundJourneyPalette.uiPrimary)
    root.style.setProperty('--sj-ui-panel', soundJourneyPalette.uiPanel)
    root.style.setProperty('--sj-ui-panel-hover', soundJourneyPalette.uiPanelHover)
    root.style.setProperty('--sj-ui-panel-active', soundJourneyPalette.uiPanelActive)
    root.style.setProperty('--sj-ui-ring-track', soundJourneyPalette.uiRingTrack)
}
