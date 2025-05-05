import {
    Var,
    matcapUV,
    uv,
    If,
    color,
    attribute,
    add,
    mul,
    sub,
    mod,
    div,
    mix,
    clamp,
    uniform,
    vec2,
    vec3,
    normalize,
    negate,
    cross,
    dFdx,
    dFdy,
    texture,
    max,
    positionWorld,
    positionLocal,
    Fn,
    time
} from 'three/tsl'; // Added Fn and time
import {useMemo} from 'react';
import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {useFrame, useLoader} from '@react-three/fiber';
import {Vector3} from 'three';
import {folder, useControls} from "leva";
import {cameraPosition} from "three/src/Three.TSL.js";


const windFn = Fn(
    ([noiseTex, worldPos, direction, speed, scale1, scale2, timeOffsetScale, timeOffsetStrength]) => {

        const timeOffsetNoise = texture(noiseTex, worldPos.xy.mul(0.0001)).r

        const noiseUV1 = worldPos.xy.mul(0.06).add(add(direction.mul(time.mul(0.1)), timeOffsetNoise.mul(4))).xy
        const noise1 = texture(noiseTex, noiseUV1).r.sub(0.5)


        const noiseUV2 = worldPos.xy.mul(0.043).add(direction.mul(time.mul(0.1 * 0.3))).xy
        const noise2 = texture(noiseTex, noiseUV2).r


        const intensity = noise1.mul(noise2)

        return direction.mul(intensity)
    }
);


export default function InfiniteGrass({playerRef}) {
    // --- Existing Infinite Grass Controls ---
    const {
        gridSize, spacing, bladeHeight, maxHeightVariation, topColorHex, bottomColorHex, roughness, metalness,
        windSpeed, windScale1, windScale2, windDirectionX, windDirectionZ
    } = useControls('Infinite Grass', {
        Gras: folder({
            gridSize: {value: 340, min: 10, max: 1000, step: 10},
            spacing: {value: 0.09, min: 0.01, max: 1.0, step: 0.01},
            bladeHeight: {value: 0.2, min: 0.05, max: 1, step: 0.01},
            maxHeightVariation: {value: 0.05, min: 0, max: 0.2, step: 0.005},
            topColorHex: {value: '#99ff66'},
            bottomColorHex: {value: '#336622'},
            roughness: {value: 1.0, min: 0, max: 1, step: 0.01},
            metalness: {value: 0.0, min: 0, max: 1, step: 0.01},
        }, {collapsed: true}),
        Wind: folder({
            windSpeed: {value: 0.1, min: 0, max: 1, step: 0.01},
            windScale1: {value: 0.06, min: 0.01, max: 0.2, step: 0.005},
            windScale2: {value: 0.043, min: 0.01, max: 0.2, step: 0.005},
            windDirectionX: {value: -1.0, min: -1.0, max: 1.0, step: 0.1},
            windDirectionZ: {value: 1.0, min: -1.0, max: 1.0, step: 0.1},
        }, {collapsed: true}),
    }, {collapsed: true});

    // Load matcap and noise textures
    const matcapTexture = useLoader(THREE.TextureLoader, './matcap-grass2.png');
    const noiseTex = useLoader(THREE.TextureLoader, './noiseTexture.png');

    matcapTexture.colorSpace = THREE.SRGBColorSpace;

    // --- Set Noise Texture Wrapping ---
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;

    // Generate procedural blade geometry (Unchanged)
    const geometry = useMemo(() => {
        // ... (your existing geometry generation logic) ...
        const bladeCount = gridSize * gridSize;
        const vertexCount = bladeCount * 3;

        const centers = new Float32Array(vertexCount * 3); // per-vertex center
        const offsets = new Float32Array(vertexCount * 3); // local shape of blade
        const normals = new Float32Array(vertexCount * 3); // upward normals

        let v = 0;

        for (let i = 0; i < bladeCount; i++) {
            const halfSize = (gridSize - 1) * spacing * 0.5;

            const x = (i % gridSize) * spacing + (Math.random() - 0.5) * spacing;
            const z = Math.floor(i / gridSize) * spacing - halfSize + (Math.random() - 0.5) * spacing;
            const y = 0.2; // Base of the blade at y=0

            const heightVariation = (Math.random() * 2 - 1) * maxHeightVariation;
            const currentBladeHeight = bladeHeight + heightVariation;

            // Create 3 vertices per blade (a vertical triangle)
            for (let j = 0; j < 3; j++) {
                centers[v * 3 + 0] = x;
                centers[v * 3 + 1] = y; // Store base position y=0 here
                centers[v * 3 + 2] = z;

                if (j === 0) {
                    offsets[v * 3 + 0] = -0.05;
                    offsets[v * 3 + 1] = 0.0;
                    offsets[v * 3 + 2] = 0.0;
                } else if (j === 1) {
                    offsets[v * 3 + 0] = 0.05;
                    offsets[v * 3 + 1] = 0.0;
                    offsets[v * 3 + 2] = 0.0;
                } else if (j === 2) {
                    offsets[v * 3 + 0] = 0.0;
                    offsets[v * 3 + 1] = bladeHeight + heightVariation;
                    offsets[v * 3 + 2] = 0.0;
                }

                normals[v * 3 + 0] = 0;
                normals[v * 3 + 1] = 1;
                normals[v * 3 + 2] = 0;

                v++;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(centers, 3));
        geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

        return geometry;
    }, [gridSize, spacing, bladeHeight, maxHeightVariation]);

    // Access per-vertex data in TSL
    const centerNode = attribute('position');
    const offsetNode = attribute('offset');
    //const cameraXZ = uniform(new THREE.Vector3()); // camera position (XZ plane only)
    const playerXZ = uniform(new THREE.Vector3());
    const noiseTexNode = uniform(noiseTex);
    const uvNode = uv()


    const worldPos = positionWorld;


    const fieldSize = gridSize * spacing;
    const halfSize = fieldSize * 0.5;

    const direction = new THREE.Vector2(windDirectionX, windDirectionZ).normalize();

    // Update cameraXZ every frame (if changed)
    useFrame((state) => {
        /*const cam = state.camera;
        if (!cam.position.equals(prevCamPos)) {
            cameraXZ.value.set(cam.position.x, 0, cam.position.z);
            prevCamPos.copy(cam.position);
        }*/

        if (playerRef.current) {
            const pos = playerRef.current.translation(); // Get position directly
            playerXZ.value.set(pos.x, 0, pos.z);
        }
    });

    // Wrap blade center positions around the camera for infinite scrolling illusion
    const relative = sub(centerNode, playerXZ);
    const wrappedX = sub(mod(add(relative.x, halfSize), fieldSize), halfSize);
    const wrappedZ = sub(mod(add(relative.z, halfSize), fieldSize), halfSize);
    const wrappedCenter = add(vec3(wrappedX, centerNode.y, wrappedZ), playerXZ);

    const camToBladeXZ = normalize(add(sub(cameraPosition, wrappedCenter), vec3(0.0001)));
    const right = normalize(vec3(camToBladeXZ.z, 0.0, negate(camToBladeXZ.x)));
    const up = vec3(0.0, 1.0, 0.0);

    // only use x/y
    const rotatedOffset = add(
        mul(right, vec3(offsetNode.x)),
        mul(up, vec3(offsetNode.y))
    );

    const localHeight = clamp(div(offsetNode.y, 0.25), 0.0, 1.0);

    const windOffset = windFn([noiseTex, worldPos, direction, windSpeed, windScale1, windScale2]).mul(localHeight);

    const finalPosition = add(add(wrappedCenter, rotatedOffset), vec3(windOffset.x, 0.0, windOffset.y));

    const matcapColor = texture(matcapTexture, matcapUV);


    const topColor = vec3(...new THREE.Color(topColorHex).convertSRGBToLinear().toArray());
    const bottomColor = vec3(...new THREE.Color(bottomColorHex).convertSRGBToLinear().toArray());
    const gradientColor = mix(bottomColor, topColor, localHeight);

    // Final color: gradient modulated with matcap lighting
    const finalColor = mul(matcapColor, gradientColor);

    // Construct physically-based material
    const material = new MeshStandardNodeMaterial();
    material.roughnessNode = uniform(roughness); // fully rough (no specular shine)
    material.metalnessNode = uniform(metalness); // no metallic reflection
    material.positionNode = finalPosition;
    material.colorNode = finalColor;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false

    // Return the final mesh
    return (
        <primitive object={mesh}/>
    );
}