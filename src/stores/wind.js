import * as THREE from 'three'
import { Fn, texture, time, uniform, clamp, negate, vec3, float } from 'three/tsl'

export const defaultWind = {
    windDirectionX: -1.0,
    windDirectionZ:  1.0,
    windSpeed:       0.2,
    windScale1:      0.06,
    windScale2:      0.055,
    heightDivisor:   0.25,
    strength:        1.0,
}


export const windFn = Fn(([spatialVariation, noiseTex, worldPos, direction, speed, scale1, scale2]) => {
    const uv1 = worldPos.xz.mul(scale1).add(direction.mul(time.mul(speed))).add(spatialVariation.mul(4))
    const n1  = texture(noiseTex, uv1).r.sub(0.5)
    const uv2 = worldPos.xz.mul(scale2).add(direction.mul(time.mul(speed.mul(0.3))))
    const n2  = texture(noiseTex, uv2).r
    return direction.mul(n1.mul(n2))
})

export function buildWindOffsetNode({ noiseTex, worldPos, offsetNode, params = {}, mapXZTo = 'xz->(x,z)' }) {
    const {
        windDirectionX,
        windDirectionZ,
        windSpeed,
        windScale1,
        windScale2,
        heightDivisor = defaultWind.heightDivisor,
        strength      = 1.0,
    } = { ...defaultWind, ...params }

    const timeNoise = texture(noiseTex, worldPos.xy.mul(0.0001)).r
    const bladeHeightInfluence = clamp(offsetNode.y.div(float(heightDivisor)), float(0), float(1))

    const dirNode = uniform(new THREE.Vector2(windDirectionX, windDirectionZ).normalize())

    const windA = windFn([
        timeNoise, noiseTex, worldPos, dirNode,
        uniform(windSpeed), uniform(windScale1), uniform(windScale2)
    ]).mul(bladeHeightInfluence)

    const windB = windFn([
        timeNoise, noiseTex, worldPos, negate(dirNode),
        uniform(windSpeed), uniform(windScale1), uniform(windScale2)
    ]).mul(bladeHeightInfluence)

    const mapped = mapXZTo === 'xz->(x,z)'
        ? vec3(windB.x, float(0), windA.y)
        : vec3(windA.x, windB.y, float(0))

    return mapped.mul(float(strength))
}
