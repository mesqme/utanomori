import { useEffect, useMemo } from 'react'
import { Bloom, EffectComposer } from '@react-three/postprocessing'

import useStore from '../stores/useStore.jsx'
import PainterlyEdgePass from './PainterlyEdgePass.js'
import SharpenPass from './SharpenPass.js'

export default function PainterlyPostProcessing() {
    const settings = useStore((state) => state.painterlyPostParameters)
    const painterlyPass = useMemo(() => new PainterlyEdgePass(settings), [])
    const sharpenPass = useMemo(() => new SharpenPass(settings), [])

    useEffect(() => {
        painterlyPass.update(settings)
        sharpenPass.update(settings)
    }, [painterlyPass, settings, sharpenPass])

    useEffect(
        () => () => {
            painterlyPass.dispose()
            sharpenPass.dispose()
        },
        [painterlyPass, sharpenPass]
    )

    if (!settings.enabled) return null

    return (
        <EffectComposer multisampling={4}>
            <primitive object={painterlyPass} dispose={null} />
            {settings.bloomEnabled && (
                <Bloom
                    intensity={settings.bloomIntensity}
                    luminanceThreshold={settings.bloomThreshold}
                    luminanceSmoothing={settings.bloomSmoothing}
                    radius={settings.bloomRadius}
                    mipmapBlur
                />
            )}
            <primitive object={sharpenPass} dispose={null} />
        </EffectComposer>
    )
}
