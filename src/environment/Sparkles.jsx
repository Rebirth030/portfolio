// Sparkles.js
import * as React from 'react'
import * as THREE from 'three'
import { useThree, useFrame, useLoader } from '@react-three/fiber'
import { PointsNodeMaterial } from 'three/webgpu'
import {
    attribute, uniform, float, vec2, vec3, vec4,
    add, sub, mul, div, sin, cos, clamp, mix, step, texture,
    positionLocal, modelViewMatrix, modelWorldMatrix, modelWorldMatrixInverse
} from 'three/tsl'

// ---------- Helfer ----------
const isFloat32Array = (def) => def && def.constructor === Float32Array
const expandColor = (c) => [c.r, c.g, c.b]
const isVector = (v) =>
    v instanceof THREE.Vector2 || v instanceof THREE.Vector3 || v instanceof THREE.Vector4
const normalizeVector = (v) => {
    if (Array.isArray(v)) return v
    if (isVector(v)) return v.toArray()
    return [v, v, v]
}

function usePropAsIsOrAsAttribute(count, prop, setDefault) {
    return React.useMemo(() => {
        if (prop !== undefined) {
            if (isFloat32Array(prop)) return prop
            if (prop instanceof THREE.Color) {
                const a = Array.from({ length: count * 3 }, () => expandColor(prop)).flat()
                return Float32Array.from(a)
            } else if (isVector(prop) || Array.isArray(prop)) {
                const a = Array.from({ length: count * 3 }, () => normalizeVector(prop)).flat()
                return Float32Array.from(a)
            }
            return Float32Array.from({ length: count }, () => prop)
        }
        return Float32Array.from({ length: count }, setDefault)
    }, [prop, count, setDefault])
}

// ---------- Component ----------
export default function Sparkles({
                                     count = 100,
                                     speed = 1,
                                     opacity = 1,
                                     scale = 1,
                                     size,
                                     color,
                                     noise = 1,

                                     // Terrain/Heightmap
                                     heightMapUrl   = '/Heightmap.png',
                                     terrainMapUrl  = '/TerrainColoring0000.png',
                                     fogMaskUrl     = '/AlphaMap.png',
                                     uvOffset       = [128, 128],
                                     uvScale        = [1 / 256, 1 / 256],
                                     heightScale    = 22.4135,
                                     heightOffset   = 0.8,

                                     // Wasser
                                     waterThreshold = 0.25,
                                     hideHeight     = 200.0,

                                     // Kanten-Stopp
                                     fogCutoff      = 0.5,

                                     // Flip
                                     heightFlipV    = 1.0,

                                     // Emission (Bloom)
                                     emissionStrength = 2.0,
                                     emissionColor    = new THREE.Color(0xFFFFFF),

                                     children,
                                     ...props
                                 }) {
    const dpr = useThree((s) => s.viewport.dpr)

    // Texturen laden & klonen
    const baseHeightTex  = useLoader(THREE.TextureLoader, heightMapUrl)
    const baseTerrainTex = useLoader(THREE.TextureLoader, terrainMapUrl)
    const baseFogTex     = useLoader(THREE.TextureLoader, fogMaskUrl)

    const heightMapTex = React.useMemo(() => {
        const t = baseHeightTex.clone()
        t.needsUpdate = true
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.magFilter = THREE.LinearFilter
        t.wrapS = THREE.ClampToEdgeWrapping
        t.wrapT = THREE.ClampToEdgeWrapping
        t.colorSpace = THREE.NoColorSpace
        return t
    }, [baseHeightTex])

    const terrainMapTex = React.useMemo(() => {
        const t = baseTerrainTex.clone()
        t.needsUpdate = true
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.magFilter = THREE.LinearFilter
        t.wrapS = THREE.RepeatWrapping
        t.wrapT = THREE.RepeatWrapping
        t.colorSpace = THREE.NoColorSpace
        return t
    }, [baseTerrainTex])

    const fogMaskTex = React.useMemo(() => {
        const t = baseFogTex.clone()
        t.needsUpdate = true
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.magFilter = THREE.LinearFilter
        t.wrapS = THREE.RepeatWrapping
        t.wrapT = THREE.RepeatWrapping
        t.colorSpace = THREE.NoColorSpace
        return t
    }, [baseFogTex])

    // Partikel-Geometrie
    const _scale = normalizeVector(scale)
    const positions = React.useMemo(
        () =>
            Float32Array.from(
                Array.from({ length: count }, () => _scale.map(THREE.MathUtils.randFloatSpread)).flat()
            ),
        [count, ..._scale]
    )

    const sizes     = usePropAsIsOrAsAttribute(count, size, Math.random)
    const opacities = usePropAsIsOrAsAttribute(count, opacity)
    const speeds    = usePropAsIsOrAsAttribute(count, speed)
    const noises    = usePropAsIsOrAsAttribute(count * 3, noise)
    const colors    = usePropAsIsOrAsAttribute(
        color === undefined ? count * 3 : count,
        !isFloat32Array(color) ? new THREE.Color(color) : color,
        () => 1
    )

    // Uniforms
    const timeU           = React.useMemo(() => uniform(0), [])
    const dprU            = React.useMemo(() => uniform(dpr), [dpr])
    const uvOffsetU       = React.useMemo(() => uniform(vec2(uvOffset[0], uvOffset[1])), [])
    const uvScaleU        = React.useMemo(() => uniform(vec2(uvScale[0], uvScale[1])), [])
    const heightScaleU    = React.useMemo(() => uniform(heightScale), [])
    const heightOffsetU   = React.useMemo(() => uniform(heightOffset), [])
    const heightFlipVU    = React.useMemo(() => uniform(heightFlipV), [])
    const waterThresholdU = React.useMemo(() => uniform(waterThreshold), [])
    const hideHeightU     = React.useMemo(() => uniform(hideHeight), [])
    const fogCutoffU      = React.useMemo(() => uniform(fogCutoff), [])

    // Emission uniforms
    const emissionStrengthU = React.useMemo(() => uniform(emissionStrength), [])
    const emissionColorU    = React.useMemo(
        () => uniform(emissionColor.convertSRGBToLinear()),
        []
    )

    React.useEffect(() => {
        emissionStrengthU.value = emissionStrength
        emissionColorU.value.set(emissionColor.convertSRGBToLinear())
    }, [emissionStrength, emissionColor])

    // kleine runde Alpha-Map
    const alphaTex = React.useMemo(() => {
        const N = 64
        const data = new Uint8Array(N * N)
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const u = (x + 0.5) / N, v = (y + 0.5) / N
                const dx = u - 0.5, dy = v - 0.5
                const d = Math.sqrt(dx * dx + dy * dy)
                const strength = Math.max(0, Math.min(1, 0.05 / Math.max(d, 1e-4) - 0.1))
                data[y * N + x] = Math.round(255 * strength)
            }
        }
        const tex = new THREE.DataTexture(data, N, N, THREE.AlphaFormat)
        tex.magFilter = THREE.LinearFilter
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.generateMipmaps = true
        tex.needsUpdate = true
        return tex
    }, [])

    // Material
    const material = React.useMemo(() => {
        const mat = new PointsNodeMaterial({ transparent: false, depthWrite: true })

        const aSize    = attribute('size', 'float')
        const aSpeed   = attribute('speed', 'float')
        const aOpacity = attribute('opacity', 'float')
        const aNoise   = attribute('noise', 'vec3')
        const aColor   = attribute('color', 'vec3')

        const pLocal = positionLocal.toVar()

        // Animationsphasen
        const phaseX = add(mul(timeU, aSpeed), mul(pLocal.x, mul(aNoise.x, float(100.0))))
        const phaseY = add(mul(timeU, aSpeed), mul(pLocal.x, mul(aNoise.y, float(100.0))))
        const phaseZ = add(mul(timeU, aSpeed), mul(pLocal.x, mul(aNoise.z, float(100.0))))

        const motionOffset = vec3(
            mul(cos(phaseZ), float(0.2)),
            mul(sin(phaseX), float(0.2)),
            mul(cos(phaseY), float(0.2))
        )

        // Basisposition lokal
        const localPos = add(pLocal.xyz, motionOffset).toVar()

        // Weltposition
        const worldPos = mul(modelWorldMatrix, vec4(localPos, 1.0)).toVar()

        // UV
        const uv0 = mul(add(worldPos.xz, uvOffsetU), uvScaleU).toVar()
        const vFlipped = mix(uv0.y, sub(1.0, uv0.y), heightFlipVU)
        const uv = clamp(vec2(uv0.x, vFlipped), vec2(0.0, 0.0), vec2(1.0, 1.0))

        // Höhe & Wasser
        const h         = mul(texture(heightMapTex, uv).r, heightScaleU)
        const waterMask = texture(terrainMapTex, uv).b
        const isWater   = step(waterThresholdU, waterMask)

        const baseWorldY   = add(h, heightOffsetU)
        const raisedWorldY = mix(baseWorldY, hideHeightU, isWater)
        const targetWorld  = vec3(worldPos.x, raisedWorldY, worldPos.z)

        const targetLocal = mul(modelWorldMatrixInverse, vec4(targetWorld, 1.0)).xyz.toVar()
        mat.positionNode  = add(targetLocal, vec3(0.0, -17.0, 0.0))

        // Kanten-Stopp
        const fogR    = texture(fogMaskTex, uv).r
        const fogKeep = step(fogCutoffU, fogR)

        // Punktgröße
        const viewPos = mul(modelViewMatrix, vec4(mat.positionNode, 1.0)).toVar()
        mat.pointSizeNode = mul(
            mul(aSize, float(25.0)),
            dprU,
            div(float(1.0), sub(float(0.0), viewPos.z))
        )

        // Farbe & Alpha
        mat.colorNode   = aColor
        mat.opacityNode = clamp(mul(aOpacity, fogKeep), 0.0, 1.0)
        mat.alphaMap    = alphaTex
        mat.alphaTest   = 0.15
        mat.transparent = false
        mat.depthWrite  = true

        // Emission für Bloom
        mat.emissiveNode = mul(emissionColorU, emissionStrengthU)

        return mat
    }, [
        alphaTex, dprU, timeU,
        heightMapTex, terrainMapTex, fogMaskTex,
        uvOffsetU, uvScaleU, heightScaleU, heightOffsetU, heightFlipVU,
        waterThresholdU, hideHeightU, fogCutoffU,
        emissionStrengthU, emissionColorU
    ])

    useFrame((state) => {
        timeU.value = state.clock.elapsedTime
    })

    return (
        <points {...props} key={`sparkles-${count}-${JSON.stringify(scale)}`}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
                <bufferAttribute attach="attributes-opacity" args={[opacities, 1]} />
                <bufferAttribute attach="attributes-speed" args={[speeds, 1]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
                <bufferAttribute attach="attributes-noise" args={[noises, 3]} />
            </bufferGeometry>
            {children ? children : <primitive object={material} />}
        </points>
    )
}
