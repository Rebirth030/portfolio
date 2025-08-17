import {
    uv, texture, positionWorld, time,
    uniform, clamp, smoothstep, abs, normalize, length, mix, dot,
    vec2, vec3, sub, mul, add, mod
} from 'three/tsl'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three/webgpu'

export default function WaterMaterial(minBlue, maxBlue) {
    // Texturen
    const flowMap  = useLoader(THREE.TextureLoader, '/TerrainMap.png')
    const noiseTex = useLoader(THREE.TextureLoader, '/noiseTexture.png')
    flowMap.wrapS = flowMap.wrapT = THREE.RepeatWrapping
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping

    // --- Remap t ∈ [0,1] (ufernah≈0, tief≈1)
    const terrainUv = vec2(uv().x, sub(1.0, uv().y))
    const blueC     = texture(flowMap, terrainUv).b
    const uMinB     = uniform(minBlue)
    const uMaxB     = uniform(maxBlue)
    const t         = clamp( blueC.sub(uMinB).div(uMaxB.sub(uMinB)), 0.0, 1.0 )

    // --- korrekte Texelgröße (bitte an deine Map-Auflösung anpassen)
    const texelU = 1 / (flowMap.image?.width  ?? 1024)
    const texelV = 1 / (flowMap.image?.height ?? 1024)
    const uTexelU = uniform(texelU)
    const uTexelV = uniform(texelV)
    const du = vec2(uTexelU, 0.0)
    const dv = vec2(0.0, uTexelV)

    // zentraler Differenzen-Gradient ∇blue
    const blueR = texture(flowMap, terrainUv.add(du)).b
    const blueL = texture(flowMap, terrainUv.sub(du)).b
    const blueU = texture(flowMap, terrainUv.add(dv)).b
    const blueD = texture(flowMap, terrainUv.sub(dv)).b
    const grad  = vec2( blueR.sub(blueL).mul(0.5), blueU.sub(blueD).mul(0.5) )

    // Tangente (90° Drehung) = Flussrichtungskandidat
    let tangent = vec2( grad.y.mul(-1.0), grad.x )
    // Fallback mischen, wenn Gradient zu klein ist (verhindert „Einfrieren“)
    const gAmp     = clamp( length(grad).mul(200.0), 0.0, 1.0 ) // Gain tweaken
    const fallback = vec2(0.0, 1.0)
    tangent = normalize( mix(fallback, tangent, gAmp) )

    // optional: Flussrichtung invertieren, falls „falsch herum“
    const uFlipFlow = uniform(1.0) // +1 normal, -1 invertiert
    const flowDir = normalize(vec2(uniform(0.0), uniform(1.0))) // z.B. +Z
    const flowPhase = dot(flowDir, positionWorld.xz).mul(uniform(0.25))



    // --- Parameter (alle tweakbar)
    const uSlopeFrequency   = uniform(5.0)    // Wellenabstand
    const uTimeSpeed        = uniform(0.05)   // Basis-Puls (Expansion/Atmung)
    const uNoiseFreq        = uniform(0.05)   // Noise-Skalierung (Weltmaßstab)
    const uNoiseStrength    = uniform(0.40)   // Phasenstörung
    const uLineWidth        = uniform(0.4)   // Gischt-Liniendicke (klein halten!)
    const uBandStart        = uniform(0.0)   // Bandbeginn (Abstand vom Ufer)
    const uBandEnd          = uniform(0.80)   // Bandende (vor der Mitte)
    const uBandFeather      = uniform(0.25)   // weichere Bandkanten
    const uAdvectPhaseSpeed = uniform(20)   // Strömungsgeschw. (Phase)
    const uAdvectNoiseSpeed = uniform(0.35)   // Strömungsgeschw. (Noise)

    // --- Strömung:
    // 1) t NICHT advecten → bleibt stabiles Abstandsfeld
    // 2) Phase entlang flowDir verschieben (sichtbare „Fließ“-Bewegung)
    const phaseAdvect = dot(flowDir, positionWorld.xz).mul(uAdvectPhaseSpeed)

    // 3) Noise entlang flowDir verschieben, um „Fetzen“ mitzunehmen
    const noiseUV = positionWorld.xz
        .add( flowDir.mul(time).mul(uAdvectNoiseSpeed) )
        .mul(uNoiseFreq)
    const noise = texture(noiseTex, noiseUV).r.mul(uNoiseStrength)

    // Bruno-Phase (Noise vor mod), mit Strömungsadvektion in der Phase
    const base = t
        .add( time.mul(uTimeSpeed).add(flowPhase) )
        .add( noise )
        .mul( uSlopeFrequency )
        .mod(1.0)
        .sub( sub(1.0, t) )

    // Linienmaske (Gischt)
    const tri  = abs( base.sub(0.5) ).mul(2.0)
    const line = sub( 1.0, smoothstep(0.0, uLineWidth, tri) )

    // Bandpass in t (nicht am Ufer, nicht in der Mitte)
    const nearEdge = smoothstep(uBandStart, uBandStart.add(uBandFeather), t)
    const farEdge  = sub(1.0, smoothstep(uBandEnd.sub(uBandFeather), uBandEnd, t))
    const bandMask = mul(nearEdge, farEdge)

    const alpha = line.mul(bandMask)

    const m = new THREE.MeshStandardNodeMaterial()
    m.colorNode   = vec3(1.0)
    m.opacityNode = alpha
    m.transparent = true
    m.depthWrite  = false
    return m
}
