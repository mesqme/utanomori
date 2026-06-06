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
    grassPatchDebugColors: ['#2db9e8', '#a06be8', '#efb04e', '#79bd78'],
    uiPrimary: '#fff8ff',
    loaderBackground: '#17113a',
    loaderHover: '#fff8ff',
    uiPanel: 'rgba(9, 8, 34, 0.42)',
    uiPanelHover: 'rgba(255, 248, 255, 0.18)',
    uiPanelActive: 'rgba(255, 248, 255, 0.34)',
    uiRingTrack: 'rgba(255, 248, 255, 0.12)',
})

export function applySoundJourneyCssVariables(root = document.documentElement) {
    root.style.setProperty('--sj-background', soundJourneyPalette.background)
    root.style.setProperty('--sj-loader-background', soundJourneyPalette.loaderBackground)
    root.style.setProperty('--sj-loader-hover', soundJourneyPalette.loaderHover)
    root.style.setProperty('--sj-loader-hover-text', soundJourneyPalette.loaderBackground)
    root.style.setProperty('--sj-ui-primary', soundJourneyPalette.uiPrimary)
    root.style.setProperty('--sj-ui-panel', soundJourneyPalette.uiPanel)
    root.style.setProperty('--sj-ui-panel-hover', soundJourneyPalette.uiPanelHover)
    root.style.setProperty('--sj-ui-panel-active', soundJourneyPalette.uiPanelActive)
    root.style.setProperty('--sj-ui-ring-track', soundJourneyPalette.uiRingTrack)
}
