import { cameraPosition, matcapUV,smoothstep ,attribute, add,step , mul, sub, mod, div, mix, clamp, uniform, vec2, vec3, normalize, negate, cross, dFdx, dFdy, texture, positionWorld, Fn, time } from 'three/tsl';
import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { useFrame, useLoader } from '@react-three/fiber';
import { folder, useControls } from 'leva';
import {buildWindOffsetNode, windFn} from "../../stores/wind.js";

export default function InfiniteGrass({ playerRef }) {
    // UI controls for grass and wind parameters
    const { gridSize, spacing, bladeHeight, maxHeightVariation, topColorHex, bottomColorHex, roughness, metalness, gridOffsetZ, scaleX, scaleZ,
        windSpeed, windScale1, windScale2, windDirectionX, windDirectionZ,
        waterThreshold, hideHeight, shrinkRange, minScale
    } = useControls('Infinite Grass', {
        Gras: folder({
            gridSize: { value: 510, min: 10, max: 1000, step: 10 },
            gridOffsetZ: { value: -15, min: -15, max: 0, step: 1 },  // X offset of grid center
            scaleX: { value: 1.6, min: 0.1, max: 10, step: 0.1 },       // Scale grid spacing on X
            scaleZ: { value: 0.9, min: 0.1, max: 10, step: 0.1 },
            spacing:  { value: 0.11, min: 0.01, max: 1, step: 0.01 },
            bladeHeight: { value: 0.42, min: 0.05, max: 1, step: 0.01 },
            maxHeightVariation: { value: 0.11, min: 0, max: 0.2, step: 0.005 },
            topColorHex:    { value: '#99ff66' },
            bottomColorHex: { value: '#336622' },
            roughness: { value: 1.0, min: 0, max: 1, step: 0.01 },
            metalness: { value: 0.0, min: 0, max: 1, step: 0.01 }
        }, { collapsed: true }),
        Wind: folder({
            windSpeed:  { value: 0.1, min: 0, max: 1, step: 0.01 },
            windScale1: { value: 0.06, min: 0.01, max: 0.2, step: 0.005 },
            windScale2: { value: 0.043, min: 0.01, max: 0.2, step: 0.005 },
            windDirectionX: { value: -1.0, min: -1, max: 1, step: 0.1 },
            windDirectionZ: { value:  1.0, min: -1, max: 1, step: 0.1 }
        }, { collapsed: true }),
        WaterSettings: folder({
            waterThreshold: { value: 0.22, min: 0, max: 1, step: 0.01 },
            hideHeight:     { value: 200, min: 0, max: 500, step: 1 },
            shrinkRange:    { value: 0.16,  min: 0, max: 1, step: 0.01 },
            minScale:       { value: 0.00,  min: 0, max: 1, step: 0.01 }
        }, { collapsed: true })
    }, { collapsed: true });

    // load textures and set up wrapping for noise
    const matcapTexture = useLoader(THREE.TextureLoader, './matcap-grass2.png');
    const noiseTex = useLoader(THREE.TextureLoader, './noiseTexture.png');
    const heightMapTex = useLoader(THREE.TextureLoader, './Heightmap.png');
    const terrainMapTex = useLoader(THREE.TextureLoader, './TerrainMap.png');
    matcapTexture.colorSpace = THREE.SRGBColorSpace;
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
    heightMapTex.wrapS = heightMapTex.wrapT = THREE.ClampToEdgeWrapping;
    terrainMapTex.wrapS = terrainMapTex.wrapT = THREE.RepeatWrapping;


    // procedural blade geometry: positions, offsets, normals
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
                // Position des Stiels plus leichte Zufallsverschiebung
                const x = ix * spacing - halfX + (Math.random() - 0.5) * spacing;
                const z = iz * spacing - halfZ + (Math.random() - 0.5) * spacing;
                const baseY    = 0.2;
                const variation = (Math.random() * 2 - 1) * maxHeightVariation;

                // 3 Vertices pro Grashalm (links, rechts, oben)
                for (let v = 0; v < 3; v++) {
                    // center-Position
                    centers.set([x, baseY, z], i * 3);

                    // offsets: v=0 linker Fuß, v=1 rechter Fuß, v=2 Spitze
                    if (v < 2) {
                        offsets.set([ (v * 2 - 1) * 0.05, 0, 0 ], i * 3);
                    } else {
                        offsets.set([ 0, bladeHeight + variation, 0 ], i * 3);
                    }

                    // nach oben ausgerichtete Normalen
                    normals.set([0, 1, 0], i * 3);

                    i++;
                }
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(centers, 3));
        g.setAttribute('offset',   new THREE.BufferAttribute(offsets, 3));
        g.setAttribute('normal',   new THREE.BufferAttribute(normals, 3));
        return g;
    }, [gridSize, spacing, bladeHeight, maxHeightVariation, scaleX, scaleZ]);

    // shader inputs: per-vertex and uniforms
    const centerNode = attribute('position');
    const offsetNode = attribute('offset');
    const playerXZ = uniform(new THREE.Vector3());
    const worldPos = positionWorld;
    const uvOffsetNode = uniform(new THREE.Vector2(128, 128)); //Adjust Blender terrain x,y to width / 2
    const uvScaleNode  = uniform(new THREE.Vector2(1 / 256, 1 / 256)); //Adjust Blender terrain x,y to 1/width

    // update player position uniform each frame
    useFrame(() => {
        const p = playerRef.current?.translation();
        if (p) playerXZ.value.set(p.x, 0, p.z);
    });

    // infinite scrolling wrap around player
    const fsX = gridSize * spacing * scaleX;
    const fsZ = gridSize * spacing * scaleZ;
    const halfFSX = fsX * 0.5;
    const halfFSZ = fsZ * 0.5;

    const rel = sub(centerNode, add(playerXZ, vec3(0, 0, gridOffsetZ)));
    const wx = sub(mod(add(rel.x, halfFSX), fsX), halfFSX);
    const wz = sub(mod(add(rel.z, halfFSZ), fsZ), halfFSZ);
    const wrappedCenter = add(vec3(wx, centerNode.y, wz), add(playerXZ, vec3(0, 0, gridOffsetZ)))

    // Höhenanpassung via Heightmap
    const uv0 = add(wrappedCenter.xz, uvOffsetNode).mul(uvScaleNode);
    const uv  = clamp(
        vec2(uv0.x, sub(1.0, uv0.y)), // nur V invertieren, U bleibt
        vec2(0, 0),
        vec2(1, 1)
    );
    const h  = texture(heightMapTex, uv).r.mul(22.4135); //Add the Blender Object height here
    const finalCenter = vec3(wrappedCenter.x, h, wrappedCenter.z);

    // wenn isWater==1, dann Y auf hideHeight, sonst bleibt h
    const waterMask = texture(terrainMapTex, uv).b;                   // 0..1 je nach Blauanteil
    const isWater  = step(waterThreshold, waterMask);       // 1 wenn Blau > Threshold
    const yClamped = mix(finalCenter.y, uniform(hideHeight), isWater);
    const finalCenterClamped = vec3(finalCenter.x, yClamped, finalCenter.z);

    const sEdge  = smoothstep(
        waterThreshold - shrinkRange,
        waterThreshold + shrinkRange,
        waterMask
    );

    const sizeFactor = mix(1.0, minScale, sEdge);

    // billboard rotation to face camera
    const toBlade       = normalize(add(sub(cameraPosition, finalCenter), vec3(0.0001)));
    const right         = normalize(vec3(toBlade.z, 0, negate(toBlade.x)));
    const up            = vec3(0, 1, 0);

    const scaledOffset = vec3(
        offsetNode.x.mul(sizeFactor),
        offsetNode.y.mul(sizeFactor),
        0
    );

    const rotatedOffset = add(
        mul(right, vec3(scaledOffset.x)),
        mul(up,    vec3(scaledOffset.y))
    );

    const windOffset = buildWindOffsetNode({
        noiseTex,
        worldPos,
        offsetNode,
        params: { windDirectionX, windDirectionZ, windSpeed, windScale1, windScale2 },
        mapXZTo: 'xz->(x,z)'
    })

    // final vertex position and color gradient + matcap shading
    const finalPos = add(add(finalCenterClamped, rotatedOffset), windOffset);
    const mColor = texture(matcapTexture, matcapUV);
    const topC = vec3(...new THREE.Color(topColorHex).convertSRGBToLinear().toArray());
    const botC = vec3(...new THREE.Color(bottomColorHex).convertSRGBToLinear().toArray());
    const t = clamp(div(offsetNode.y, 0.25), 0, 1);
    const colorGrad = mix(botC, topC, t);
    const finalColor = mul(mColor, colorGrad);

    const mat = new MeshStandardNodeMaterial({ roughnessNode: uniform(roughness), metalnessNode: uniform(metalness) });
    mat.positionNode = finalPos;
    mat.colorNode    = finalColor;

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.frustumCulled = false;

    return <primitive
        object={mesh}
        receiveShadow
        position={[0, -17.5, 0]}
    />
}
