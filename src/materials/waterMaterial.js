import {
    uv, texture, positionWorld, time,
    uniform, clamp, smoothstep, abs, normalize, length, mix, dot,
    vec2, vec3, sub, mul,
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
    const uAdvectNoiseSpeed = uniform(0.35)   // Strömungsgeschw. (Noise)

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
