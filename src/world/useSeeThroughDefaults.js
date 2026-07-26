import { useEffect } from 'react'

import { defaultSceneStyle } from '../config/sceneStyles.js'
import { applySeeThroughParameters } from './state/seeThrough.js'

/**
 * Seed the shared see-through settings from the scene style.
 *
 * PRODUCTION BEHAVIOUR, not debug. `world/state/seeThrough.js` is a module-scope singleton that
 * every see-through writer and both the grass and prop shaders read; it ships with placeholder
 * values until something pushes the real ones in. Without this the hole behind the hero is wrong.
 *
 * It is called from the debug panel only because that is where the See-Through sliders live.
 */
export function useSeeThroughDefaults() {
    useEffect(() => {
        const params = defaultSceneStyle.seeThroughParameters
        if (!params) return
        applySeeThroughParameters(params)
    }, [])
}
