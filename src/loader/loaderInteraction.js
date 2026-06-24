// Shared, render-free flag: is the GO circle (loader) currently hovered? Written by the
// Loader (DOM) and read each frame by Terrain, which previews a larger world-reveal circle
// on hover so the player sees the 3D scene grow out from under the GO button.
export const loaderInteraction = { hovered: false }
