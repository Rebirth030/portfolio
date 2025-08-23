import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three/webgpu';
import { uv, texture, vec2, sub, positionWorld, smoothstep, mix, mul, clamp, time, abs, add, vec3 } from 'three/tsl';
import { folder, useControls } from 'leva';
import { useTerrainTextures, usePortfolioTerrain } from './TerrainAssets.js';
import { PLANE_POS, PLANE_W, PLANE_H, UV_OFFSET, UV_SCALE, TERRAIN_CONTROLS_DEFAULTS } from './TerrainConstants.js';

export default function TerrainVisual({ expose } = {}) {
  const { terrainMapTex, noiseTex, terrainPathTex } = useTerrainTextures();
  const { mesh: terrainMesh } = usePortfolioTerrain();

  const {
    darkGreenHex, sandHex, lightBlueHex, darkBlueHex,
    t1Min, t1Max, t2Min, t2Max, t3Min, t3Max,
    waterMax, waterMin, minBlue, maxBlue,
    slopeFrequency, timeSpeed, noiseFreq, noiseStrength, lineWidth,
    bandStart, bandEnd, bandFeather,
    pathMin, pathMax, pathFeather, pathNoiseFreq, pathNoiseAmp, pathCenterDark, pathEdgeGreen, pathRoughness,
    pathBaseHex, pathDustHex, pathWetHex,
  } = useControls('Terrain Material', {
    Colors: folder({
      darkGreenHex: { value: TERRAIN_CONTROLS_DEFAULTS.darkGreenHex },
      sandHex:      { value: TERRAIN_CONTROLS_DEFAULTS.sandHex },
      lightBlueHex: { value: TERRAIN_CONTROLS_DEFAULTS.lightBlueHex },
      darkBlueHex:  { value: TERRAIN_CONTROLS_DEFAULTS.darkBlueHex },
      pathBaseHex: { value: TERRAIN_CONTROLS_DEFAULTS.pathBaseHex },
      pathDustHex: { value: TERRAIN_CONTROLS_DEFAULTS.pathDustHex },
      pathWetHex:  { value: TERRAIN_CONTROLS_DEFAULTS.pathWetHex },
    }, { collapsed: true }),
    Thresholds: folder({
      t1Min: { value: TERRAIN_CONTROLS_DEFAULTS.t1Min, min: 0, max: 1, step: 0.01 },
      t1Max: { value: TERRAIN_CONTROLS_DEFAULTS.t1Max, min: 0, max: 1, step: 0.01 },
      t2Min: { value: TERRAIN_CONTROLS_DEFAULTS.t2Min, min: 0, max: 1, step: 0.01 },
      t2Max: { value: TERRAIN_CONTROLS_DEFAULTS.t2Max, min: 0, max: 1, step: 0.01 },
      t3Min: { value: TERRAIN_CONTROLS_DEFAULTS.t3Min, min: 0, max: 1, step: 0.01 },
      t3Max: { value: TERRAIN_CONTROLS_DEFAULTS.t3Max, min: 0, max: 1, step: 0.01 },
      waterMin: { value: TERRAIN_CONTROLS_DEFAULTS.waterMin, min: 0, max: 1, step: 0.01 },
      waterMax: { value: TERRAIN_CONTROLS_DEFAULTS.waterMax, min: 0, max: 1, step: 0.01 },
      minBlue:  { value: TERRAIN_CONTROLS_DEFAULTS.minBlue,  min: 0, max: 1, step: 0.01 },
      maxBlue:  { value: TERRAIN_CONTROLS_DEFAULTS.maxBlue,  min: 0, max: 1, step: 0.01 },
    }, { collapsed: true }),
    WaterFX: folder({
      slopeFrequency: { value: TERRAIN_CONTROLS_DEFAULTS.slopeFrequency,  min: 0.5, max: 20, step: 0.1 },
      timeSpeed:      { value: TERRAIN_CONTROLS_DEFAULTS.timeSpeed,      min: 0.0, max: 0.5, step: 0.005 },
      noiseFreq:      { value: TERRAIN_CONTROLS_DEFAULTS.noiseFreq,      min: 0.005, max: 0.2, step: 0.005 },
      noiseStrength:  { value: TERRAIN_CONTROLS_DEFAULTS.noiseStrength,  min: 0.0, max: 1.0, step: 0.01 },
      lineWidth:      { value: TERRAIN_CONTROLS_DEFAULTS.lineWidth,      min: 0.02, max: 0.6, step: 0.005 },
      bandStart:      { value: TERRAIN_CONTROLS_DEFAULTS.bandStart,      min: 0, max: 0.9, step: 0.01 },
      bandEnd:        { value: TERRAIN_CONTROLS_DEFAULTS.bandEnd,        min: 0.1, max: 2, step: 0.01 },
      bandFeather:    { value: TERRAIN_CONTROLS_DEFAULTS.bandFeather,    min: 0.0, max: 0.5, step: 0.005 },
    }, { collapsed: true }),
    Path: folder({
      pathMin:        { value: TERRAIN_CONTROLS_DEFAULTS.pathMin,        min: 0,   max: 1,   step: 0.01 },
      pathMax:        { value: TERRAIN_CONTROLS_DEFAULTS.pathMax,        min: 0,   max: 1,   step: 0.01 },
      pathFeather:    { value: TERRAIN_CONTROLS_DEFAULTS.pathFeather,    min: 0.0, max: 0.5, step: 0.005 },
      pathNoiseFreq:  { value: TERRAIN_CONTROLS_DEFAULTS.pathNoiseFreq,  min: 0.005, max: 0.1, step: 0.001 },
      pathNoiseAmp:   { value: TERRAIN_CONTROLS_DEFAULTS.pathNoiseAmp,   min: 0.0,   max: 0.6, step: 0.01 },
      pathCenterDark: { value: TERRAIN_CONTROLS_DEFAULTS.pathCenterDark, min: 0.0,   max: 0.6, step: 0.01 },
      pathEdgeGreen:  { value: TERRAIN_CONTROLS_DEFAULTS.pathEdgeGreen,  min: 0.0,   max: 0.6, step: 0.01 },
      pathRoughness:  { value: TERRAIN_CONTROLS_DEFAULTS.pathRoughness,  min: 0.3,   max: 1.0, step: 0.01 },
    }, { collapsed: true })
  }, { collapsed: true });

  // ---------------- Terrain-Material ----------------
  const terrainMaterial = useMemo(() => {
    const uDarkG  = new THREE.Color(darkGreenHex);
    const uSand   = new THREE.Color(sandHex);
    const uLightB = new THREE.Color(lightBlueHex);
    const uDarkB  = new THREE.Color(darkBlueHex);

    const uvNode = uv();
    const blue   = texture(terrainMapTex, vec2(uvNode.x, sub(1, uvNode.y))).b;

    const m1 = smoothstep(t1Min, t1Max, blue);
    const c1 = mix(uDarkG, uSand, m1);

    const posY      = positionWorld.y;
    const waterMask = sub(1.0, smoothstep(waterMin, waterMax, posY));
    const m2        = smoothstep(t2Min, t2Max, blue);
    const c2        = mix(c1, uLightB, mul(m2, waterMask));

    const m3  = smoothstep(t3Min, t3Max, blue);
    let col = mix(c2, uDarkB, m3);

    const red = texture(terrainPathTex, vec2(uvNode.x, sub(1, uvNode.y))).r;
    const pathMask = smoothstep(pathMin, add(pathMin, pathFeather), red);
    const pNoiseUV = positionWorld.xz.mul(pathNoiseFreq);
    const pNoise   = texture(noiseTex, pNoiseUV).r.sub(0.5).mul(2.0).mul(pathNoiseAmp);
    const pathBase    = new THREE.Color(pathBaseHex);
    const pathDust    = new THREE.Color(pathDustHex);
    const pathWet     = new THREE.Color(pathWetHex);
    const core = smoothstep(0.4, 0.95, red);
    const edge = sub(1.0, smoothstep(0.55, 0.95, red));
    let pathCol = mix(pathBase, pathDust, edge);
    pathCol     = mix(pathCol,  pathWet,  mul(core, pathCenterDark));
    pathCol     = pathCol.mul(add(1.0, pNoise));
    const greenEdge = mix(pathCol, new THREE.Color(darkGreenHex), mul(edge, pathEdgeGreen));
    const finalPath = mix(pathCol, greenEdge, 0.5);
    col = mix(col, finalPath, pathMask);

    const mat = new THREE.MeshStandardNodeMaterial();
    mat.colorNode     = col;
    mat.roughnessNode = mix(1.0, pathRoughness, pathMask);
    mat.metalnessNode = 0.0;
    return mat;
  }, [
    terrainMapTex, terrainPathTex, noiseTex,
    darkGreenHex, sandHex, lightBlueHex, darkBlueHex,
    t1Min, t1Max, t2Min, t2Max, t3Min, t3Max, waterMin, waterMax,
    pathMin, pathMax, pathFeather, pathNoiseFreq, pathNoiseAmp, pathCenterDark, pathEdgeGreen, pathRoughness,
    pathBaseHex, pathDustHex, pathWetHex,
  ]);

  // ---------------- Water-Uniform-Nodes (stabil) ----------------
  const uMinB            = minBlue;
  const uMaxB            = maxBlue;
  const uSlopeFrequency  = slopeFrequency;
  const uTimeSpeed       = timeSpeed;
  const uNoiseFreq       = noiseFreq;
  const uNoiseStrength   = noiseStrength;
  const uLineWidth       = lineWidth;
  const uBandStart       = bandStart;
  const uBandEnd         = bandEnd;
  const uBandFeather     = bandFeather;

  expose?.onWaterUniforms?.({
    uMinB, uMaxB, uSlopeFrequency, uTimeSpeed, uNoiseFreq,
    uNoiseStrength, uLineWidth, uBandStart, uBandEnd, uBandFeather,
  });

  // ---------------- Water-Material ----------------
  const waterMat = useMemo(() => {
    const terrainUv = uv();
    const blueC     = texture(terrainMapTex, terrainUv).b;
    const t         = clamp( blueC.sub(uMinB).div(sub(uMaxB,uMinB)), 0.0, 1.0 );
    const noiseUV = positionWorld.xz.mul(uNoiseFreq);
    const noise   = texture(noiseTex, noiseUV).r.sub(0.5).mul(2.0).mul(uNoiseStrength);
    const base = t
      .add(time.mul(uTimeSpeed))
      .add(noise)
      .mul(uSlopeFrequency)
      .mod(1.0)
      .sub(sub(1.0, t));
    const tri  = abs(base.sub(0.5)).mul(2.0);
    const line = sub(1.0, smoothstep(0.0, uLineWidth, tri));
    const nearEdge = smoothstep(uBandStart, add(uBandStart, uBandFeather), t);
    const farEdge  = sub(1.0, smoothstep(sub(uBandEnd, uBandFeather), uBandEnd, t));
    const bandMask = mul(nearEdge, farEdge);
    const alpha = line.mul(bandMask);
    const m = new THREE.MeshStandardNodeMaterial();
    m.colorNode   = vec3(1.0);
    m.opacityNode = alpha;
    m.transparent = true;
    m.depthWrite  = false;
    return m;
  }, [terrainMapTex, noiseTex, uMinB, uMaxB, uSlopeFrequency, uTimeSpeed, uNoiseFreq, uNoiseStrength, uLineWidth, uBandStart, uBandEnd, uBandFeather]);

  // ---------------- Plane-UVs → Bild-Ausschnitt ----------------
  const planeRef = useRef();
  useEffect(() => {
    if (!planeRef.current) return;
    const uvAttr = planeRef.current.geometry.getAttribute('uv');
    if (!uvAttr) return;

    const minX = PLANE_POS[0] - PLANE_W * 0.5;
    const maxX = PLANE_POS[0] + PLANE_W * 0.5;
    const minZ = PLANE_POS[2] - PLANE_H * 0.5;
    const maxZ = PLANE_POS[2] + PLANE_H * 0.5;

    const minU = (minX + UV_OFFSET.x) * UV_SCALE.x;
    const maxU = (maxX + UV_OFFSET.x) * UV_SCALE.x;
    const minV = (minZ + UV_OFFSET.y) * UV_SCALE.y;
    const maxV = (maxZ + UV_OFFSET.y) * UV_SCALE.y;

    for (let i = 0; i < uvAttr.count; i++) {
      const u0 = uvAttr.getX(i), v0 = uvAttr.getY(i);
      uvAttr.setXY(i, minU + (maxU - minU) * u0, minV + (maxV - minV) * v0);
    }
    uvAttr.needsUpdate = true;
  }, []);

  return (
    <group>
      <primitive object={terrainMesh} material={terrainMaterial} />
      <mesh
        ref={planeRef}
        position={PLANE_POS}
        rotation-x={-Math.PI * 0.5}
        receiveShadow
      >
        <planeGeometry args={[PLANE_W, PLANE_H, 1, 1]} />
        <primitive object={waterMat} attach="material" />
      </mesh>
    </group>
  );
}
