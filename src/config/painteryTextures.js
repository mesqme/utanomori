// Shared paintery/watercolor texture choices, used by the scene-texture controls
// (terrain bake → ground/grass/border, props, …). Add a file here + an id and it
// shows up in every selector.
import paintaryAlphaUrl from '../assets/textures/paintaryAlpha.png'
import watercolorUrl from '../assets/textures/watercolor.png'

// The two paintery brush textures. paintaryAlpha is the default every material uses; watercolor is
// the alternative.
export const PAINTERY_TEXTURE_IDS = ['paintaryAlpha', 'watercolor']

export const PAINTERY_TEXTURE_URLS = {
    paintaryAlpha: paintaryAlphaUrl,
    watercolor: watercolorUrl,
}

// Parallel list (same order as the ids) for drei's useTexture, which preloads all so
// switching selection is instant.
export const PAINTERY_TEXTURE_URL_LIST = PAINTERY_TEXTURE_IDS.map((id) => PAINTERY_TEXTURE_URLS[id])

export function painteryTextureIndex(name) {
    const index = PAINTERY_TEXTURE_IDS.indexOf(name)
    return index < 0 ? 0 : index
}
