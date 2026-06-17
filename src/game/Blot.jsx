import { useId, useLayoutEffect, useRef, useState } from 'react'

import useStore from '../stores/useStore.jsx'
import paintaryUrl from '../assets/textures/paintaryAlpha_01.png'
import './blot.css'

const SEED = 7

// Renders a stylized "blot" shape (rounded rect / ellipse / circle) with an organic
// brushy edge. Used for the speech bubble and every button so they share one
// painted look.
function shapeElement(shape, w, h, inset, cornerRadius, extra) {
    if (shape === 'Circle') {
        const r = Math.max(0, Math.min(w, h) / 2 - inset)
        return <circle cx={w / 2} cy={h / 2} r={r} {...extra} />
    }
    if (shape === 'Ellipse') {
        return <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - inset)} ry={Math.max(0, h / 2 - inset)} {...extra} />
    }
    return (
        <rect
            x={inset}
            y={inset}
            width={Math.max(0, w - inset * 2)}
            height={Math.max(0, h - inset * 2)}
            rx={cornerRadius}
            ry={cornerRadius}
            {...extra}
        />
    )
}

export default function Blot({ as = 'div', variant = 'panel', className = '', style, onClick, children }) {
    const ui = useStore((state) => state.gameUiParameters)
    const shape = variant === 'button' ? ui.buttonShape : ui.bubbleShape

    const wrapRef = useRef(null)
    const [size, setSize] = useState({ w: 0, h: 0 })
    const rawId = useId()
    const uid = rawId.replace(/[:]/g, '')

    useLayoutEffect(() => {
        const el = wrapRef.current
        if (!el) return
        const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight })
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const { w, h } = size
    const inset = ui.roughness + 2
    const textureScale = Math.max(1, ui.textureScale ?? 600)
    const textureOpacity = Math.min(1, Math.max(0, ui.textureStrength ?? 0))
    const sizingStyle =
        variant === 'bubble'
            ? {
                  maxWidth: `${ui.bubbleWidth ?? 480}px`,
                  minWidth: `${Math.min(ui.bubbleWidth ?? 480, 300)}px`,
                  padding: `${ui.padding ?? 32}px ${Math.round((ui.padding ?? 32) * 1.25)}px`,
                  '--blot-bubble-width': `${ui.bubbleWidth ?? 480}px`,
                  '--blot-text-size': `${ui.textSize ?? 20}px`,
              }
            : variant === 'button'
              ? {
                    minWidth: `${ui.buttonWidth ?? 180}px`,
                    minHeight: `${ui.buttonHeight ?? 58}px`,
                }
            : {}

    const Tag = as

    return (
        <Tag
            ref={wrapRef}
            className={`blot blot--${variant} ${className}`}
            style={{ color: ui.textColor, ...sizingStyle, ...style }}
            onClick={onClick}
        >
            {w > 0 && h > 0 && (
                <svg
                    className="blot__bg"
                    width={w}
                    height={h}
                    viewBox={`0 0 ${w} ${h}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <defs>
                        <filter id={`blotEdge-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
                            <feTurbulence type="fractalNoise" baseFrequency={ui.detail / 1000} numOctaves="2" seed={SEED} result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale={ui.roughness * 2} xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                        <pattern id={`blotTex-${uid}`} patternUnits="userSpaceOnUse" width={textureScale} height={textureScale}>
                            <image href={paintaryUrl} x="0" y="0" width={textureScale} height={textureScale} preserveAspectRatio="xMidYMid slice" />
                        </pattern>
                    </defs>

                    {shapeElement(shape, w, h, inset, ui.cornerRadius, {
                        fill: ui.fillColor,
                        filter: `url(#blotEdge-${uid})`,
                    })}
                    {textureOpacity > 0 &&
                        shapeElement(shape, w, h, inset, ui.cornerRadius, {
                            fill: `url(#blotTex-${uid})`,
                            opacity: textureOpacity * 0.16,
                            filter: `url(#blotEdge-${uid})`,
                            style: { mixBlendMode: 'multiply' },
                        })}
                </svg>
            )}
            <span className="blot__content">{children}</span>
        </Tag>
    )
}
