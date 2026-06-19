// Shared paintery/watercolor texture choices, used by the scene-texture controls
// (terrain bake → ground/grass/border, props, …). Add a file here + an id and it
// shows up in every selector.
import paintaryAlpha01Url from '../assets/textures/paintaryAlpha_01.png'
import paintaryAlpha02Url from '../assets/textures/paintaryAlpha_02.png'
import paintaryAlpha03Url from '../assets/textures/paintaryAlpha_03.png'
import paintaryAlpha04Url from '../assets/textures/paintaryAlpha_04.png'
import watercolorBasicUrl from '../assets/textures/watercolorBasic.png'
import watercolorBasicLargeUrl from '../assets/textures/watercolorBasicLarge.png'

export const PAINTERY_TEXTURE_IDS = ['paintaryAlpha_01', 'paintaryAlpha_02', 'paintaryAlpha_03', 'paintaryAlpha_04', 'watercolorBasic', 'watercolorBasicLarge']

export const PAINTERY_TEXTURE_URLS = {
    paintaryAlpha_01: paintaryAlpha01Url,
    paintaryAlpha_02: paintaryAlpha02Url,
    paintaryAlpha_03: paintaryAlpha03Url,
    paintaryAlpha_04: paintaryAlpha04Url,
    watercolorBasic: watercolorBasicUrl,
    watercolorBasicLarge: watercolorBasicLargeUrl,
}

// Parallel list (same order as the ids) for drei's useTexture, which preloads all so
// switching selection is instant.
export const PAINTERY_TEXTURE_URL_LIST = PAINTERY_TEXTURE_IDS.map((id) => PAINTERY_TEXTURE_URLS[id])

export function painteryTextureIndex(name) {
    const index = PAINTERY_TEXTURE_IDS.indexOf(name)
    return index < 0 ? 0 : index
}
