// Selectable textures for the GROUND detail (Terrain) and the BACKGROUND sphere — two independent
// lists, since they want different choices. drei's useTexture preloads each list so switching the
// selection in Leva is instant.
import groundUrl from '../assets/textures/ground.png'
import paintaryAlphaUrl from '../assets/textures/paintaryAlpha.png'
import watercolorUrl from '../assets/textures/watercolor.png'

// --- Ground detail: the original ground texture + the paintery brush. ---
export const GROUND_TEXTURE_IDS = ['ground', 'paintaryAlpha']
const GROUND_TEXTURE_URLS = { ground: groundUrl, paintaryAlpha: paintaryAlphaUrl }
export const GROUND_TEXTURE_URL_LIST = GROUND_TEXTURE_IDS.map((id) => GROUND_TEXTURE_URLS[id])
export function groundTextureIndex(name) {
    const index = GROUND_TEXTURE_IDS.indexOf(name)
    return index < 0 ? 0 : index
}

// --- Background sphere: watercolor (default) + the paintery brush as an alternative. ---
export const BACKGROUND_TEXTURE_IDS = ['watercolor', 'paintaryAlpha']
const BACKGROUND_TEXTURE_URLS = { watercolor: watercolorUrl, paintaryAlpha: paintaryAlphaUrl }
export const BACKGROUND_TEXTURE_URL_LIST = BACKGROUND_TEXTURE_IDS.map((id) => BACKGROUND_TEXTURE_URLS[id])
export function backgroundTextureIndex(name) {
    const index = BACKGROUND_TEXTURE_IDS.indexOf(name)
    return index < 0 ? 0 : index
}
