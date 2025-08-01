import {
    uv, texture,
    uniform, clamp,
    vec2, vec3, vec4,
    sub, mul, add, mod, time, positionWorld, greaterThan
} from 'three/tsl'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three/webgpu'

export default function WaterMaterial(minBlue, maxBlue) {
    const flowMap = useLoader(THREE.TextureLoader, '/TerrainMap.png')
    flowMap.wrapS = flowMap.wrapT = THREE.RepeatWrapping
    const noiseTex = useLoader(THREE.TextureLoader, '/noiseTexture.png')
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping

    // 1) Wasseranteil (t)
    const uvNode  = vec2(uv().x, sub(1.0, uv().y))
    const blueVal = texture(flowMap, uvNode).b
    const b0 = uniform(minBlue)
    const b1 = uniform(maxBlue)
    const t  = clamp(blueVal.sub(b0).div(b1.sub(b0)), 0.0, 1.0)

    // 2) Zeit & Noise
    const stripeFreq      = uniform(10.0)
    const stripeSpeed     = uniform(0.05)
    const noiseFrequency  = uniform(0.1)     // kleiner Wert für Welt-UV-Noise
    const noiseStrength   = uniform(1)
    const threshold       = uniform(500)
    const stripeOffset    = time.mul(stripeSpeed)
    const noise = texture(noiseTex, positionWorld.xz.mul(noiseFrequency)).r

    // 3) Ripple mit „Noise vor mod()“
    const ripple = t
        .add(stripeOffset)
        .mul(stripeFreq)
        .mod(1.0)
        .sub(t.oneMinus())
        .add(noise)  // verschiebt lokale Phase
        .tran

    ripple.greaterThan(threshold).discard()

    // 4) Ausgabe
    const alpha = ripple.greaterThan(threshold)
    const colorNode = vec4(vec3(ripple), alpha)


    // 5) Material
    const m = new THREE.MeshStandardNodeMaterial()
    m.colorNode     = colorNode
    m.roughnessNode = uniform(0.8)
    m.metalnessNode = uniform(0.0)
    m.transparent = true


    return m
}
