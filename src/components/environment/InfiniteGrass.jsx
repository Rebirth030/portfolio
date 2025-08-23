// InfiniteGrass.js
import {
    cameraPosition, smoothstep, attribute, add, step, mul, sub, mod, max, div, mix, clamp,
    uniform, vec2, vec3, normalize, negate, texture, positionWorld
} from 'three/tsl';
import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { useFrame, useLoader } from '@react-three/fiber';
import { folder, useControls } from 'leva';
import { buildWindOffsetNode } from '../../utils/wind.js';

export default function InfiniteGrass({ playerRef }) {
    // UI controls
    const {
        gridSize, spacing, bladeHeight, maxHeightVariation, topColorHex, bottomColorHex,
        roughness, metalness, gridOffsetZ, scaleX, scaleZ,
        windSpeed, windScale1, windScale2, windDirectionX, windDirectionZ,
        waterThreshold, hideHeight, shrinkRange, minScale,
        pathThreshold, pathShrinkRange, pathMinScale
    } = useControls('Infinite Grass', {
        Gras: folder({
            gridSize: { value: 510, min: 10, max: 1000, step: 10 },
            gridOffsetZ: { value: -15, min: -15, max: 0, step: 1 },
            scaleX: { value: 1.6, min: 0.1, max: 10, step: 0.1 },
            scaleZ: { value: 0.9, min: 0.1, max: 10, step: 0.1 },
            spacing: { value: 0.11, min: 0.01, max: 1, step: 0.01 },
            bladeHeight: { value: 0.42, min: 0.05, max: 1, step: 0.01 },
            maxHeightVariation: { value: 0.11, min: 0, max: 0.2, step: 0.005 },
            topColorHex: { value: '#71aa94' },
            bottomColorHex: { value: '#1c472d' },
            roughness: { value: 1.0, min: 0, max: 1, step: 0.01 },
            metalness: { value: 0.0, min: 0, max: 1, step: 0.01 }
        }, { collapsed: true }),
        Wind: folder({
            windSpeed: { value: 0.1, min: 0, max: 1, step: 0.01 },
            windScale1: { value: 0.06, min: 0.01, max: 0.2, step: 0.005 },
            windScale2: { value: 0.043, min: 0.01, max: 0.2, step: 0.005 },
            windDirectionX: { value: -1.0, min: -1, max: 1, step: 0.1 },
            windDirectionZ: { value: 1.0, min: -1, max: 1, step: 0.1 }
        }, { collapsed: true }),
        WaterSettings: folder({
            waterThreshold: { value: 0.25, min: 0, max: 1, step: 0.01 },
            hideHeight: { value: 200, min: 0, max: 500, step: 1 },
            shrinkRange: { value: 0.16, min: 0, max: 1, step: 0.01 },
            minScale: { value: 0.00, min: 0, max: 1, step: 0.01 }
        }, { collapsed: true }),
        PathSettings: folder({
            pathThreshold: { value: 0.26, min: 0, max: 1, step: 0.01 },
            pathShrinkRange: { value: 0.24, min: 0, max: 1, step: 0.01 },
            pathMinScale: { value: 0.00, min: 0, max: 1, step: 0.01 }
        }, { collapsed: true })
    }, { collapsed: true });

    // Texturen
    const noiseTex = useLoader(THREE.TextureLoader, '/noiseTexture.png');
    const heightMapTex = useLoader(THREE.TextureLoader, '/Heightmap.png');
    const terrainMapTex = useLoader(THREE.TextureLoader, '/TerrainColoring0000.png');
    const terrainPathTex = useLoader(THREE.TextureLoader, '/TerrainColoring0000.png');
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
    heightMapTex.wrapS = heightMapTex.wrapT = THREE.ClampToEdgeWrapping;
    terrainMapTex.wrapS = terrainMapTex.wrapT = THREE.RepeatWrapping;
    terrainPathTex.wrapS = terrainPathTex.wrapT = THREE.RepeatWrapping;

    // Geometrie
    const gridCountX = Math.max(1, Math.round(gridSize * scaleX));
    const gridCountZ = Math.max(1, Math.round(gridSize * scaleZ));

    const geometry = useMemo(() => {
        const count = gridCountX * gridCountZ * 3;
        const centers = new Float32Array(count * 3);
        const offsets = new Float32Array(count * 3);
        const normals = new Float32Array(count * 3);

        const halfX = (gridCountX - 1) * spacing * 0.5;
        const halfZ = (gridCountZ - 1) * spacing * 0.5;

        let i = 0;
        for (let ix = 0; ix < gridCountX; ix++) {
            for (let iz = 0; iz < gridCountZ; iz++) {
                const x = ix * spacing - halfX + (Math.random() - 0.5) * spacing;
                const z = iz * spacing - halfZ + (Math.random() - 0.5) * spacing;
                const baseY = 0.2;
                const variation = (Math.random() * 2 - 1) * maxHeightVariation;

                for (let v = 0; v < 3; v++) {
                    centers.set([x, baseY, z], i * 3);
                    if (v < 2) {
                        offsets.set([(v * 2 - 1) * 0.05, 0, 0], i * 3);
                    } else {
                        offsets.set([0, bladeHeight + variation, 0], i * 3);
                    }
                    normals.set([0, 1, 0], i * 3);
                    i++;
                }
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(centers, 3));
        g.setAttribute('offset', new THREE.BufferAttribute(offsets, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        return g;
    }, [gridSize, spacing, bladeHeight, maxHeightVariation, scaleX, scaleZ]);

    // Shader Inputs
    const centerNode = attribute('position');
    const offsetNode = attribute('offset');
    const playerXZ = uniform(new THREE.Vector3());
    const worldPos = positionWorld;
    const uvOffsetNode = uniform(new THREE.Vector2(128, 128));      // Blender-Offset
    const uvScaleNode = uniform(new THREE.Vector2(1 / 256, 1 / 256)); // Blender-Skalierung

    // Spieler-Position
    useFrame(() => {
        const p = playerRef.current?.translation();
        if (p) playerXZ.value.set(p.x, 0, p.z);
    });

    // Infinite Wrap um den Spieler
    const fsX = gridSize * spacing * scaleX;
    const fsZ = gridSize * spacing * scaleZ;
    const halfFSX = fsX * 0.5;
    const halfFSZ = fsZ * 0.5;

    const rel = sub(centerNode, add(playerXZ, vec3(0, 0, gridOffsetZ)));
    const wx = sub(mod(add(rel.x, halfFSX), fsX), halfFSX);
    const wz = sub(mod(add(rel.z, halfFSZ), fsZ), halfFSZ);
    const wrappedCenter = add(vec3(wx, centerNode.y, wz), add(playerXZ, vec3(0, 0, gridOffsetZ)));

    // Höhe via Heightmap
    const uv0 = add(wrappedCenter.xz, uvOffsetNode).mul(uvScaleNode);
    const uv = clamp(vec2(uv0.x, sub(1.0, uv0.y)), vec2(0, 0), vec2(1, 1));
    const h = texture(heightMapTex, uv).r.mul(22.4135);
    const finalCenter = vec3(wrappedCenter.x, h, wrappedCenter.z);

    // Wasser (blau)
    const waterMask = texture(terrainMapTex, uv).b;
    const isWater = step(uniform(waterThreshold), waterMask);
    const sEdgeWater = smoothstep(
        sub(uniform(waterThreshold), uniform(shrinkRange)),
        add(uniform(waterThreshold), uniform(shrinkRange)),
        waterMask
    );
    const sizeWater = mix(1.0, uniform(minScale), sEdgeWater);

    // Pfad (rot)
    const pathMask = texture(terrainPathTex, uv).r;
    const isPath = step(uniform(pathThreshold), pathMask); // hart (binär)
    const sEdgePath = smoothstep(
        sub(uniform(pathThreshold), uniform(pathShrinkRange)),
        add(uniform(pathThreshold), uniform(pathShrinkRange)),
        pathMask
    );
    const sizePath = mix(1.0, uniform(pathMinScale), sEdgePath);

    // kombinierte Skalierung & Clamping der Y-Position
    const sizeFactor = mul(sizeWater, sizePath);
    const isBlocked = max(isWater, isPath);
    const yClamped = mix(finalCenter.y, uniform(hideHeight), isBlocked);
    const finalCenterClamped = vec3(finalCenter.x, yClamped, finalCenter.z);

    // Billboard
    const toBlade = normalize(add(sub(cameraPosition, finalCenter), vec3(0.0001)));
    const right = normalize(vec3(toBlade.z, 0, negate(toBlade.x)));
    const up = vec3(0, 1, 0);

    const scaledOffset = vec3(
        offsetNode.x.mul(sizeFactor),
        offsetNode.y.mul(sizeFactor),
        0
    );

    const rotatedOffset = add(
        mul(right, vec3(scaledOffset.x)),
        mul(up, vec3(scaledOffset.y))
    );

    // Wind
    const windOffset = buildWindOffsetNode({
        noiseTex,
        worldPos,
        offsetNode,
        params: { windDirectionX, windDirectionZ, windSpeed, windScale1, windScale2 },
        mapXZTo: 'xz->(x,z)'
    });

    // ========= Farbberechnung (ohne Matcap) =========
    // Basisfarben (linear)
    const topLin = vec3(...new THREE.Color(topColorHex).convertSRGBToLinear().toArray());
    const botLin = vec3(...new THREE.Color(bottomColorHex).convertSRGBToLinear().toArray());

    // leichte gelbliche Spitze & erdiger Bodensaum
    const tipTint = vec3(...new THREE.Color('#cfe766').convertSRGBToLinear().toArray());
    const rootTint = vec3(...new THREE.Color('#28331c').convertSRGBToLinear().toArray());

    // vertikale Interpolation: 0 (Fuß) … 1 (Spitze)
    const tRaw = clamp(div(offsetNode.y, 0.40), 0.0, 1.0);
    const t = smoothstep(0.0, 1.0, tRaw);

    // großflächige Varianz über Noise (Welt XZ)
    const noiseUV = mul(finalCenter.xz, uniform(0.12));
    const n = texture(noiseTex, noiseUV).r;           // 0..1
    const v = sub(mul(n, 2.0), 1.0);                  // -1..1
    const varAmt = uniform(0.10);                     // Stärke der Varianz

    const botVar = mix(botLin, botLin.mul(add(1.0, mul(varAmt, v))), 0.8);
    const topVar = mix(topLin, topLin.mul(add(1.0, mul(varAmt, v))), 0.8);

    const topWithTip = mix(topVar, tipTint, 0.15);
    const gradColor = mix(botVar, topWithTip, t);

    // bodennaher Saum (unten dunkler)
    const rootWidth = uniform(0.12);
    const rootMask = smoothstep(0.0, rootWidth, t);
    const finalColor = mix(rootTint, gradColor, rootMask);
    // ================================================

    // Finale Position & Material
    const finalPos = add(add(finalCenterClamped, rotatedOffset), windOffset);
    const mat = new MeshStandardNodeMaterial({
        roughnessNode: uniform(roughness),
        metalnessNode: uniform(metalness)
    });
    mat.positionNode = finalPos;
    mat.colorNode = finalColor;

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.frustumCulled = false;

    return (
        <primitive
            object={mesh}
            receiveShadow
            position={[0, -17.5, 0]}
        />
    );
}
