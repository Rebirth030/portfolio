import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three/webgpu'
import { mix, smoothstep, texture, uv, vec3, vec2, sub, positionWorld, mul, clamp, time, abs, add } from 'three/tsl'
import { folder, useControls } from 'leva'
import { useTerrainAssets } from './TerrainAssets.js'
import { PLANE_POS, PLANE_W, PLANE_H, uvOffset, uvScale } from './TerrainConstants.js'

export default function TerrainVisual() {
  const { terrainMapTex, noiseTex, heightMapTex: _heightMapTex, terrainPathTex, nodes } = useTerrainAssets()

  const {
    darkGreenHex, sandHex, lightBlueHex, darkBlueHex, bushColorHex: _bushColorHex,
    t1Min, t1Max, t2Min, t2Max, t3Min, t3Max,
    waterMax, waterMin, minBlue, maxBlue,
    slopeFrequency, timeSpeed, noiseFreq, noiseStrength, lineWidth,
    bandStart, bandEnd, bandFeather,
    pathMin, pathMax, pathFeather, pathNoiseFreq, pathNoiseAmp, pathCenterDark, pathEdgeGreen, pathRoughness,
    pathBaseHex, pathDustHex, pathWetHex,
  } = useControls('Terrain Material', {
    Colors: folder({
      darkGreenHex: { value: '#426f48' },
      sandHex:      { value: '#dab984' },
      lightBlueHex: { value: '#66b0af' },
      darkBlueHex:  { value: '#284159' },
      bushColorHex: { value: '#61803e' },
      pathBaseHex: { value: '#65573e' },
      pathDustHex: { value: '#867758' },
      pathWetHex:  { value: '#382c1e' },
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
    }, { collapsed: true }),
    Path: folder({
      pathMin:        { value: 0.00, min: 0,   max: 1,   step: 0.01 },
      pathMax:        { value: 0.95, min: 0,   max: 1,   step: 0.01 },
      pathFeather:    { value: 0.39, min: 0.0, max: 0.5, step: 0.005 },
      pathNoiseFreq:  { value: 0.03, min: 0.005, max: 0.1, step: 0.001 },
      pathNoiseAmp:   { value: 0.48,  min: 0.0,   max: 0.6, step: 0.01 },
      pathCenterDark: { value: 0.39,  min: 0.0,   max: 0.6, step: 0.01 },
      pathEdgeGreen:  { value: 0.50,  min: 0.0,   max: 0.6, step: 0.01 },
      pathRoughness:  { value: 0.85,  min: 0.3,   max: 1.0, step: 0.01 }
    }, { collapsed: true })
  }, { collapsed: true })

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
    let col = mix(c2, uDarkB, m3)

    const red = texture(terrainPathTex, vec2(uvNode.x, sub(1, uvNode.y))).r

    const pathMask = smoothstep(pathMin, add(pathMin, pathFeather), red)

    const pNoiseUV = positionWorld.xz.mul(pathNoiseFreq)
    const pNoise   = texture(noiseTex, pNoiseUV).r.sub(0.5).mul(2.0).mul(pathNoiseAmp)

    const pathBase    = new THREE.Color(pathBaseHex)
    const pathDust    = new THREE.Color(pathDustHex)
    const pathWet     = new THREE.Color(pathWetHex)

    const core = smoothstep(0.4, 0.95, red)
    const edge = sub(1.0, smoothstep(0.55, 0.95, red))

    let pathCol = mix(pathBase, pathDust, edge)
    pathCol     = mix(pathCol,  pathWet,  mul(core, pathCenterDark))

    pathCol     = pathCol.mul(add(1.0, pNoise))

    const greenEdge = mix(pathCol, uDarkG, mul(edge, pathEdgeGreen))
    const finalPath = mix(pathCol, greenEdge, 0.5)

    col = mix(col, finalPath, pathMask)

    const mat = new THREE.MeshStandardNodeMaterial()
    mat.colorNode     = col
    mat.roughnessNode = mix(1.0, pathRoughness, pathMask)
    mat.metalnessNode = 0.0
    return mat
  }, [
    terrainMapTex, terrainPathTex, noiseTex,
    darkGreenHex, sandHex, lightBlueHex, darkBlueHex,pathBaseHex, pathDustHex, pathWetHex,
    t1Min, t1Max, t2Min, t2Max, t3Min, t3Max, waterMin, waterMax,
    pathMin, pathMax, pathFeather, pathNoiseFreq, pathNoiseAmp, pathCenterDark, pathEdgeGreen, pathRoughness
  ])

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

  const waterMat = useMemo(() => {
    const terrainUv = uv()
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
  }, [terrainMapTex, noiseTex, uMinB, uMaxB, uSlopeFrequency, uTimeSpeed, uNoiseFreq, uNoiseStrength, uLineWidth, uBandStart, uBandEnd, uBandFeather])

  const planeRef = useRef()
  useEffect(() => {
    if (!planeRef.current) return
    const uvAttr = planeRef.current.geometry.getAttribute('uv')
    if (!uvAttr) return

    const minX = PLANE_POS.x - PLANE_W * 0.5
    const maxX = PLANE_POS.x + PLANE_W * 0.5
    const minZ = PLANE_POS.z - PLANE_H * 0.5
    const maxZ = PLANE_POS.z + PLANE_H * 0.5

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

  return (
    <>
      <mesh
        ref={planeRef}
        position={PLANE_POS.toArray()}
        rotation-x={-Math.PI * 0.5}
        receiveShadow
      >
        <planeGeometry args={[PLANE_W, PLANE_H, 1, 1]} />
        <primitive object={waterMat} attach="material" />
      </mesh>
      <group position={[0, -20, 0]}>
        <primitive object={nodes.Plane} material={terrainMaterial} />
      </group>
    </>
  )
}
