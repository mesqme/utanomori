function hexToLinearRgb(hex) {
    const normalized = hex.replace('#', '')
    const value = normalized.length === 3 ? normalized.replace(/(.)/g, '$1$1') : normalized
    const r = Number.parseInt(value.slice(0, 2), 16) / 255
    const g = Number.parseInt(value.slice(2, 4), 16) / 255
    const b = Number.parseInt(value.slice(4, 6), 16) / 255

    return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]
}

function srgbToLinear(value) {
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(value) {
    const clamped = Math.min(1, Math.max(0, value))
    return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055
}

function acesApprox(value) {
    const a = 2.51
    const b = 0.03
    const c = 2.43
    const d = 0.59
    const e = 0.14
    return Math.min(1, Math.max(0, (value * (a * value + b)) / (value * (c * value + d) + e)))
}

function toHexByte(value) {
    return Math.round(linearToSrgb(value) * 255)
        .toString(16)
        .padStart(2, '0')
}

export function toneMappedCssColor(hex) {
    const [r, g, b] = hexToLinearRgb(hex).map(acesApprox)
    return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
}
