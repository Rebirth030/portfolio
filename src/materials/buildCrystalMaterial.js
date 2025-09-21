// src/materials/buildCrystalMaterial.js
import * as THREE from 'three/webgpu'
import {
    // Basis-Nodes/Typen
    vec3, float, color, uniform,
    // Mathe/Utility
    add, sub, mul, div, max, min, clamp, mix, pow, sin, fract, abs, exp,
    dot, length, step, smoothstep, fwidth, normalize,
    // Geometrie/Spaces
    uv, positionWorld, normalWorld, normalGeometry, cameraPosition,
    // Zeit & Instanzen
    time, instanceIndex,
} from 'three/tsl'

import buildNodeMaterialFromExisting from '../utils/buildNodeMaterialFromExisting.js'

/**
 * Kristall-NodeMaterial
 * Pipeline: UV-Maske → Konturlinien → Ground-Bounce → Soft-Knee (Luma) → Emission (Fresnel/Dispersion) + sanfter Puls
 *
 * Erweiterte Puls-Parameter (ruhige Defaults):
 *   pulseEnable=true
 *   pulseBaseHz=0.10          // ≈ 10s Grundperiode
 *   pulseSpeedJitter=0.30     // ±30% Geschwindigkeitsstreuung
 *   pulsePhaseJitter=1.0      // 0..1 Anteil von 2π
 *   pulseMin=0.92             // untere Modulationsklemme
 *   pulseMax=1.10             // obere Modulationsklemme
 *   pulseAmpJitter=0.25       // ±25% Amplitudenstreuung
 */
export default function buildCrystalMaterial(oldMesh, matParams = {}) {
    const p = (k, v) => (matParams[k] !== undefined ? matParams[k] : v)
    const F = (x) => uniform(float(x))
    const C = (x) => uniform(color(x))

    const mat = buildNodeMaterialFromExisting(oldMesh.material)

    // -------------------------------------------------
    // 1) UV-Kantenmaske (pro Dreieck) → s in [0..1]
    // -------------------------------------------------
    const puv = uv()
    const g = clamp(
        mul(
            min(min(sub(float(1.0), puv.y), sub(puv.y, puv.x)), puv.x),
            float(3.0)
        ),
        float(0.0), float(1.0)
    )
    const s = smoothstep(
        sub(F(p('uvThreshold', 0.01)), F(p('uvSoftness', 0.2))),
        add(F(p('uvThreshold', 0.01)), F(p('uvSoftness', 0.2))),
        g
    )

    // -------------------------------------------------
    // 2) Basisfarbe aus Position (abs) + Bias; optionaler Center-Fallback auf Normalfarbe
    // -------------------------------------------------
    const eps = float(1e-6)
    const isCenter = step(length(positionWorld), eps)

    const baseBias = vec3(p('baseBias', 0.12))
    const edgeCol  = add(mul(abs(positionWorld), F(p('edgeGain',   1.4))), baseBias)
    const midCol   = add(mul(abs(positionWorld), F(p('centerGain', 0.6))), baseBias)
    const nCol     = add(mul(normalGeometry, float(0.5)), vec3(0.5)) // [0..1]

    const useNFallback = !!p('useNormalFallback', true)
    const baseA = useNFallback ? mix(edgeCol, nCol, isCenter) : edgeCol
    const baseB = useNFallback ? mix(midCol,  nCol, isCenter) : midCol

    // Künstlerische Tints
    const tintEdge   = C(p('tintEdge',   '#8F00FF'))
    const tintCenter = C(p('tintCenter', '#00F0FF'))
    const tintMix    = F(p('tintMix', 0.0))

    let outColor = mix(baseA, baseB, s)
    outColor = mix(outColor, mix(tintEdge, tintCenter, s), tintMix)

    // Facetten-Konturen (UV/fwidth), anti-aliast
    const edgeWidth    = F(p('edgeWidth', 0.9))
    const edgeStrength = F(p('edgeStrength', 0.25))
    const edgeTint     = C(p('edgeTint', '#FFEFFF'))
    const aaSafe       = max(fwidth(g), float(1e-6)) // stabil bei kleinen Triangles
    const line01       = sub(float(1.0), smoothstep(float(0.0), mul(edgeWidth, aaSafe), g)) // 1 = Linie
    outColor = mix(outColor, edgeTint, clamp(mul(line01, edgeStrength), float(0.0), float(1.0)))

    // Ground-Bounce (Up-Tint), in der Mitte (s) stärker
    const upBias  = clamp(dot(normalize(normalWorld), vec3(0.0, 1.0, 0.0)), float(0.0), float(1.0))
    const bounceC = C(p('groundTint', '#9FCCB3'))
    const bounceI = F(p('groundIntensity', 0.15))
    outColor = mix(outColor, add(outColor, mul(bounceC, mul(upBias, bounceI))), s)

    // Soft-Knee (nur auf Luma der Basisfarbe; Emission bleibt separat)
    const kneeStart    = F(p('kneeStart', 0.7))
    const kneeMax      = F(p('kneeMax',   1.5))
    const kneeStrength = F(p('kneeStrength', 1.2))
    const luma   = dot(outColor, vec3(0.2126, 0.7152, 0.0722))
    const over   = step(kneeStart, luma)
    const x      = max(sub(luma, kneeStart), float(0.0))
    const range  = max(sub(kneeMax, kneeStart), eps)
    const yOver  = add(kneeStart, mul(range, sub(float(1.0), exp(div(mul(mul(float(-1.0), kneeStrength), x), range)))))
    const y      = mix(luma, yOver, over)
    const scale  = div(y, add(luma, eps))
    const toned  = mul(outColor, scale)

    // -------------------------------------------------
    // 3) Emission: Fresnel/Rim + sanftes, instanz-variierendes Pulsieren
    // -------------------------------------------------
    const V   = normalize(sub(cameraPosition, positionWorld))
    const N   = normalize(normalWorld)
    const ndv = clamp(dot(N, V), float(0.0), float(1.0))

    const rimPow = F(p('rimPower', 3.0))
    const rimInt = F(p('rimIntensity', 0.6))
    const disp   = F(p('dispersion', 0.12))
    const one    = float(1.0)

    // Dispersion-Fresnel pro Kanal
    const rimR = pow(sub(one, ndv), mul(rimPow, add(one, disp)))
    const rimG = pow(sub(one, ndv), rimPow)
    const rimB = pow(sub(one, ndv), mul(rimPow, sub(one, disp)))
    const rimRGBBase = mul(vec3(rimR, rimG, rimB), rimInt)

    // Ruhiger Puls (pro Instanz leicht anders) — ohne HDR-Boost, angenehm dezent
    let rimRGB = rimRGBBase
    if (p('pulseEnable', true)) {
        const TAU = float(6.283185307179586)

        // *** WICHTIG: instanceIndex -> float casten, sonst u32-Path ***
        const idxF = float(instanceIndex)

        // Seeds aus idxF (alles in f32, keine u32-Literale)
        const seedA = fract( mul( sin( add( mul(idxF, float(12.9898)), float(78.233) ) ), float(43758.5453) ) )
        const seedB = fract( mul( sin( add( mul(idxF, float( 0.1543)), float( 0.4177) ) ), float(15731.743 ) ) )
        const seedC = fract( mul( sin( add( mul(idxF, float( 0.3120)), float( 0.7300) ) ), float(  951.135 ) ) )

        // Geschwindigkeit (Hz) mit ±Jitter
        const baseHz      = F(p('pulseBaseHz', 0.1))         // ~10 s
        const spJitter    = F(p('pulseSpeedJitter', 0.30))    // ±30 %
        const speedFactor = mix(sub(float(1.0), spJitter), add(float(1.0), spJitter), seedA)
        const speedHz     = mul(baseHz, speedFactor)

        // Phase (0..2π * phaseJitter)
        const phaseJit    = F(p('pulsePhaseJitter', 2))
        const phase       = mul(mul(TAU, phaseJit), seedB)

        // Sinus in [0..1]
        const angle = add(mul(mul(time, TAU), speedHz), phase)
        const s01   = add(mul(sin(angle), float(0.5)), float(0.5))

        // Amplituden-Streuung um 1.0, plus globale Klemmen
        const minMod = F(p('pulseMin', 0.92))
        const maxMod = F(p('pulseMax', 3))
        const ampJit = F(p('pulseAmpJitter', 0.1))

        const spanAbove1 = mul(sub(maxMod, float(1.0)), mix(sub(float(1.0), ampJit), add(float(1.0), ampJit), seedC))
        const minEff     = sub(float(1.0), spanAbove1)
        const maxEff     = add(float(1.0), spanAbove1)

        const modFactor  = clamp(mix(minEff, maxEff, s01), minMod, maxMod)
        rimRGB = mul(rimRGBBase, modFactor)
    }

    // Material-Outputs
    mat.colorNode    = toned
    mat.emissiveNode = add(mat.emissiveNode ?? vec3(0.0), rimRGB)

    return mat
}
