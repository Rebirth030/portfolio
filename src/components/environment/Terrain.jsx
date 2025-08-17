import { useMemo, useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { HeightfieldCollider } from '@react-three/rapier'
import * as THREE from 'three/webgpu'
import { useLoader } from '@react-three/fiber'
import {
    mix, smoothstep, texture, uv, vec3, vec2, sub, positionWorld,
    mul, clamp, time, abs, add
} from 'three/tsl'
import { folder, useControls } from 'leva'
import {InstancedFromRefs} from "../InstancedFromRefs.jsx";

export default function Terrain() {
    // ---------------- Controls ----------------
    const {
        darkGreenHex, sandHex, lightBlueHex, darkBlueHex,
        t1Min, t1Max, t2Min, t2Max, t3Min, t3Max,
        waterMax, waterMin, minBlue, maxBlue,
        slopeFrequency, timeSpeed, noiseFreq, noiseStrength, lineWidth,
        bandStart, bandEnd, bandFeather
    } = useControls('Terrain Material', {
        Colors: folder({
            darkGreenHex: { value: '#426f48' },
            sandHex:      { value: '#dab984' },
            lightBlueHex: { value: '#66b0af' },
            darkBlueHex:  { value: '#284159' }
        }, { collapsed: true }),
        Thresholds: folder({
            t1Min: { value: 0.18, min: 0, max: 1, step: 0.01 },
            t1Max: { value: 0.31, min: 0, max: 1, step: 0.01 },
            t2Min: { value: 0.33, min: 0, max: 1, step: 0.01 },
            t2Max: { value: 0.54, min: 0, max: 1, step: 0.01 },
            t3Min: { value: 0.11, min: 0, max: 1, step: 0.01 },
            t3Max: { value: 0.60, min: 0, max: 1, step: 0.01 },
            waterMin: { value: 0.61, min: 0, max: 1, step: 0.01 },
            waterMax: { value: 0.76, min: 0, max: 1, step: 0.01 },
            minBlue:  { value: 0.17, min: 0, max: 1, step: 0.01 },
            maxBlue:  { value: 0.95, min: 0, max: 1, step: 0.01 }
        }, { collapsed: true }),
        WaterFX: folder({
            slopeFrequency: { value: 4.3,  min: 0.5, max: 20,  step: 0.1 },
            timeSpeed:      { value: 0.03, min: 0.0, max: 0.5, step: 0.005 },
            noiseFreq:      { value: 0.02, min: 0.005, max: 0.2, step: 0.005 },
            noiseStrength:  { value: 0.25, min: 0.0, max: 1.0, step: 0.01 },
            lineWidth:      { value: 0.30, min: 0.02, max: 0.6, step: 0.005 },
            bandStart:      { value: 0.00, min: 0, max: 0.9, step: 0.01 },
            bandEnd:        { value: 0.73, min: 0.1, max: 2, step: 0.01 },
            bandFeather:    { value: 0.29, min: 0.0, max: 0.5, step: 0.005 },
        }, { collapsed: true })
    }, { collapsed: true })

    // ---------------- Plane & UV-Abbildung ----------------
    const PLANE_POS = new THREE.Vector3(0, -3, 0)
    const PLANE_W = 256
    const PLANE_H = 256
    const uvOffset = new THREE.Vector2(128, 128)
    const uvScale  = new THREE.Vector2(1 / 256, 1 / 256)

    // ---------------- Texturen (einmal laden) ----------------
    const terrainMapTex = useLoader(THREE.TextureLoader, '/TerrainMap.png')
    const noiseTex      = useLoader(THREE.TextureLoader, '/noiseTexture.png')
    const heightMapTex  = useLoader(THREE.TextureLoader, '/Heightmap.png')
    ;[terrainMapTex, noiseTex].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping })
    heightMapTex.wrapS = heightMapTex.wrapT = THREE.ClampToEdgeWrapping

    // ---------------- Terrain-Material ----------------
    const terrainMaterial = useMemo(() => {
        const uDarkG  = new THREE.Color(darkGreenHex)
        const uSand   = new THREE.Color(sandHex)
        const uLightB = new THREE.Color(lightBlueHex)
        const uDarkB  = new THREE.Color(darkBlueHex)

        const uvNode = uv()
        const blue   = texture(terrainMapTex, vec2(uvNode.x, sub(1, uvNode.y))).b

        const m1 = smoothstep(t1Min, t1Max, blue)
        const c1 = mix(uDarkG, uSand, m1)

        const posY      = positionWorld.y
        const waterMask = sub(1.0, smoothstep(waterMin, waterMax, posY))
        const m2        = smoothstep(t2Min, t2Max, blue)
        const c2        = mix(c1, uLightB, mul(m2, waterMask))

        const m3  = smoothstep(t3Min, t3Max, blue)
        const col = mix(c2, uDarkB, m3)

        const mat = new THREE.MeshStandardNodeMaterial()
        mat.colorNode = col
        mat.roughnessNode = 1.0
        mat.metalnessNode = 0
        return mat
    }, [
        terrainMapTex,
        darkGreenHex, sandHex, lightBlueHex, darkBlueHex,
        t1Min, t1Max, t2Min, t2Max, t3Min, t3Max, waterMin, waterMax
    ])

    // ---------------- Water-Uniform-Nodes (stabil) ----------------
    const uMinB            = minBlue
    const uMaxB            = maxBlue
    const uSlopeFrequency  = slopeFrequency
    const uTimeSpeed       = timeSpeed
    const uNoiseFreq       = noiseFreq
    const uNoiseStrength   = noiseStrength
    const uLineWidth       = lineWidth
    const uBandStart       = bandStart
    const uBandEnd         = bandEnd
    const uBandFeather     = bandFeather

    // ---------------- Water-Material (einmal bauen) ----------------
    const waterMat = useMemo(() => {
        const terrainUv = uv()                    // Plane-UVs (wir mappen sie korrekt)
        const blueC     = texture(terrainMapTex, terrainUv).b
        const t         = clamp( blueC.sub(uMinB).div(sub(uMaxB,uMinB)), 0.0, 1.0 )

        const noiseUV = positionWorld.xz.mul(uNoiseFreq)
        const noise   = texture(noiseTex, noiseUV).r.sub(0.5).mul(2.0).mul(uNoiseStrength)

        const base = t
            .add(time.mul(uTimeSpeed))
            .add(noise)
            .mul(uSlopeFrequency)
            .mod(1.0)
            .sub(sub(1.0, t))

        const tri  = abs(base.sub(0.5)).mul(2.0)
        const line = sub(1.0, smoothstep(0.0, uLineWidth, tri))

        const nearEdge = smoothstep(uBandStart, add(uBandStart, uBandFeather), t)
        const farEdge  = sub(1.0, smoothstep(sub(uBandEnd, uBandFeather), uBandEnd, t))
        const bandMask = mul(nearEdge, farEdge)

        const alpha = line.mul(bandMask)

        const m = new THREE.MeshStandardNodeMaterial()
        m.colorNode   = vec3(1.0)
        m.opacityNode = alpha
        m.transparent = true
        m.depthWrite  = false
        return m
        // ⚠️ Abhängig nur von Texturen & *Nodes*, nicht von deren Werten
    }, [terrainMapTex, noiseTex, uMinB, uMaxB, uSlopeFrequency, uTimeSpeed, uNoiseFreq, uNoiseStrength, uLineWidth, uBandStart, uBandEnd, uBandFeather])

    // ---------------- Plane-UVs → Bild-Ausschnitt ----------------
    const planeRef = useRef()
    useEffect(() => {
        if (!planeRef.current) return
        const uvAttr = planeRef.current.geometry.getAttribute('uv')
        if (!uvAttr) return

        const minX = PLANE_POS.x - PLANE_W * 0.5
        const maxX = PLANE_POS.x + PLANE_W * 0.5
        const minZ = PLANE_POS.z - PLANE_H * 0.5
        const maxZ = PLANE_POS.z + PLANE_H * 0.5

        // Bild-UV (kein extra Flip – der passiert im Terrain-Material)
        const minU = (minX + uvOffset.x) * uvScale.x
        const maxU = (maxX + uvOffset.x) * uvScale.x
        const minV = (minZ + uvOffset.y) * uvScale.y
        const maxV = (maxZ + uvOffset.y) * uvScale.y

        for (let i = 0; i < uvAttr.count; i++) {
            const u0 = uvAttr.getX(i), v0 = uvAttr.getY(i)
            uvAttr.setXY(i, minU + (maxU - minU) * u0, minV + (maxV - minV) * v0)
        }
        uvAttr.needsUpdate = true
    }, [])

    // ---------------- Collider + Terrain ----------------
    const { heights, widthSegs, maxX, minX, maxZ, minZ, mesh } = useMemo(() => {
        const { nodes } = useGLTF('/PortfolioTerrain.glb', true)
        const mesh = nodes.Plane

        const posAttr = mesh.geometry.attributes.position
        const total = posAttr.count
        const rows = Math.sqrt(total)
        let widthSegs = rows - 1

        mesh.geometry.computeBoundingBox()
        const bb = mesh.geometry.boundingBox
        const minX = bb.min.x, maxX = bb.max.x
        const minZ = bb.min.z, maxZ = bb.max.z

        const heights = new Float32Array(Math.round(rows * rows)).fill(bb.min.y)

        const deltaX = (maxX - minX) / widthSegs
        const deltaZ = (maxZ - minZ) / widthSegs

        for (let k = 0; k < total; k++) {
            const x = posAttr.array[k*3 + 0]
            const y = posAttr.array[k*3 + 1]
            const z = posAttr.array[k*3 + 2]
            let i = Math.round((x - minX) / deltaX)
            let j = Math.round((z - minZ) / deltaZ)
            const idx = Math.min(Math.max(i, 0), widthSegs) * rows + Math.min(Math.max(j, 0), widthSegs)
            heights[idx] = y
        }
        return { heights, widthSegs, maxX, minX, maxZ, minZ, mesh }
        // ⛳️ Collider 1× berechnen (nichts ändert sich daran)
    }, []) // <- vorher: [waterMin, waterMax]

    return (
        <>
            <InstancedFromRefs
                modelUrl="/Tree3Top.glb"         // Detail-Baum (ein Mesh, ein Material bevorzugt)
                refsUrl="/Tree3Instances.glb"       // Dummies/Empties mit Transforms
                filter={(o) => o.isMesh && o.name.startsWith('Tree3')}
                castShadow
                receiveShadow
                position-y={-20}
                wind={{
                    windDirectionX: -1.0,
                    windDirectionZ:  1.0,
                    windSpeed:       0.2,
                    windScale1:      0.06,
                    windScale2:      0.055,
                    heightDivisor:   0.25,
                    strength:        0.1,
                }}
            />
            <InstancedFromRefs
                modelUrl="/Tree3Stem.glb"         // Detail-Baum (ein Mesh, ein Material bevorzugt)
                refsUrl="/Tree3Instances.glb"       // Dummies/Empties mit Transforms
                filter={(o) => o.isMesh && o.name.startsWith('Tree3')}
                castShadow
                receiveShadow
                position-y={-20}
            />
            <mesh
                ref={planeRef}
                position={PLANE_POS.toArray()}
                rotation-x={-Math.PI * 0.5}
                receiveShadow
                // Frustum-Culling lieber anlassen, falls keine Probleme:
                // frustumCulled={false}
            >
                <planeGeometry args={[PLANE_W, PLANE_H, 1, 1]} />
                <primitive object={waterMat} attach="material" />
            </mesh>

            <group position={[0, -20, 0]}>
                <primitive object={mesh} material={terrainMaterial} />
                <HeightfieldCollider
                    args={[widthSegs, widthSegs, heights, new THREE.Vector3(maxX - minX, 1, maxZ - minZ)]}
                    type="fixed"
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                    friction={1.5}
                />
            </group>
        </>
    )
}