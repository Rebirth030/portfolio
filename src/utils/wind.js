// utils/wind.js
import {
    texture, time,
    vec2, vec3, float,
    add, sub, mul, negate, normalize, dot, sin, clamp
} from 'three/tsl'

export const defaultWind = {
    windDirectionX: -1.0,
    windDirectionZ:  1.0,
    windSpeed:       0.2,
    windScale1:      0.06,
    windScale2:      0.055,
    heightDivisor:   0.25,
    strength:        1.0,
}

/**
 * Erzeugt einen 3D-Windversatz (Node) aus 2 überlagerten 2D-Feldern.
 * - robust ohne Fn(), nur deklarative Nodes
 * - prozeduraler Noise-Fallback (falls keine Textur)
 * - Amplitudenquelle wählbar (offsetNode/worldY/konstant)
 */
export function buildWindOffsetNode({
                                        noiseTex = null,            // THREE.Texture oder null
                                        worldPos,                   // TSL-Node, z.B. positionWorld
                                        offsetNode = null,          // TSL-Node (lokale Höhe), optional
                                        params = {},
                                        mapXZTo = 'xz->(x,z)',      // 'xz->(x,z)' | '(x,y,0)'
                                        amplitudeFrom = 'auto',     // 'auto' | 'worldY' | 'none'
                                    } = {}) {

    const {
        windDirectionX, windDirectionZ,
        windSpeed, windScale1, windScale2,
        heightDivisor = defaultWind.heightDivisor,
        strength      = 1.0
    } = { ...defaultWind, ...params }

    // Fallback-Nodes (niemals undefined in Node-Operationen!)
    const wp   = worldPos   ?? vec3(float(0), float(0), float(0))
    const offs = offsetNode ?? vec3(float(0), float(0), float(0))

    // Richtung als reiner Node-Vektor
    const dir = normalize(vec2(float(windDirectionX), float(windDirectionZ)))

    // Hilfsgrößen
    const xz   = vec2(wp.x, wp.z)
    const spd  = float(windSpeed)
    const sc1  = float(windScale1)
    const sc2  = float(windScale2)

    // UVs für 2 Schichten, je einmal mit +dir und -dir
    const uv1a = add( mul(xz, sc1), mul(dir, mul(time, spd)) )
    const uv2a = add( mul(xz, sc2), mul(dir, mul(time, mul(spd, float(0.3)))) )

    const nDir = negate(dir)
    const uv1b = add( mul(xz, sc1), mul(nDir, mul(time, spd)) )
    const uv2b = add( mul(xz, sc2), mul(nDir, mul(time, mul(spd, float(0.3)))) )

    // Prozeduraler Noise (0..1) – Fallback wenn keine Textur
    const pnoise = (uv) => {
        const h = mul( dot(uv, vec2(float(12.9898), float(78.233))), float(43758.5453) )
        return add( mul(sin(h), float(0.5)), float(0.5) )
    }
    const sample = (uv) => (noiseTex ? texture(noiseTex, uv).r : pnoise(uv))

    // [-0.5..0.5] * [0..1] → 2D-Windkomponenten
    const n1a = sub(sample(uv1a), float(0.5))
    const n2a = sample(uv2a)
    const a2  = mul(dir, mul(n1a, n2a))

    const n1b = sub(sample(uv1b), float(0.5))
    const n2b = sample(uv2b)
    const b2  = mul(nDir, mul(n1b, n2b))

    // Amplitudenwahl
    const invHD = float(1.0 / heightDivisor)
    const amp =
        amplitudeFrom === 'worldY'
            ? clamp( mul(wp.y,   invHD), float(0), float(1) )
            : amplitudeFrom === 'none'
                ? float(1.0)
                : (offsetNode
                    ? clamp( mul(offs.y, invHD), float(0), float(1) )
                    : float(1.0))

    // 2D → 3D Mapping
    const mapped = (mapXZTo === 'xz->(x,z)')
        ? vec3(b2.x, float(0), a2.y)
        : vec3(a2.x, b2.y, float(0))

    return mul( mapped, mul(amp, float(strength)) )
}
