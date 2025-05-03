import { color, attribute, add, mul, sub, mod, div, mix, clamp, uniform, vec2, vec3, normalize, negate, cross, dFdx, dFdy, texture, max, positionWorld, Fn, time } from 'three/tsl'; // Added Fn and time
import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { useFrame, useLoader } from '@react-three/fiber';
import { Vector3 } from 'three';
import {folder, useControls} from "leva";

// Updated windFn to accept uniforms
const windFn = Fn(
    ([noiseTex, worldPos, uTime, uDirection, uSpeed, uScale1, uScale2]) => {
        // uDirection should be normalized when passed in

        // first noise sample
        const noiseUV1 = add(worldPos.xy.mul(uScale1), uDirection.mul(uTime.mul(uSpeed)));
        const noise1   = sub(texture(noiseTex, noiseUV1).r, 0.5); // Assuming noise texture values are 0-1

        // second noise sample (using a fraction of the speed for variation)
        const noiseUV2 = add(worldPos.xy.mul(uScale2), uDirection.mul(uTime.mul(uSpeed * 0.3)));
        const noise2   = texture(noiseTex, noiseUV2).r;

        // combined intensity
        const intensity = noise1.mul(noise2);

        // return a 2D offset, scaled by overall speed for more impact
        // Adjust the '5.0' multiplier to control overall wind strength sensitivity to speed
        return uDirection.mul(intensity * uSpeed * 5.0);
    }
);

export default function InfiniteGrass({ playerRef }) {
    // --- Existing Infinite Grass Controls ---
    const {
        gridSize, spacing, bladeHeight, maxHeightVariation, topColorHex, bottomColorHex, roughness, metalness,
        windSpeed, windScale1, windScale2, windDirectionX, windDirectionZ
    } = useControls('Infinite Grass', {
        Gras: folder({
            gridSize: { value: 340, min: 10, max: 1000, step: 10 },
            spacing: { value: 0.09, min: 0.01, max: 1.0, step: 0.01 },
            bladeHeight: { value: 0.2, min: 0.05, max: 1, step: 0.01 },
            maxHeightVariation: { value: 0.05, min: 0, max: 0.2, step: 0.005 },
            topColorHex: { value: '#99ff66' },
            bottomColorHex: { value: '#336622' },
            roughness: { value: 1.0, min: 0, max: 1, step: 0.01 },
            metalness: { value: 0.0, min: 0, max: 1, step: 0.01 },
        }, {collapsed: true}),
        Wind: folder({
            windSpeed: { value: 0.1, min: 0, max: 1, step: 0.01 },
            windScale1: { value: 0.06, min: 0.01, max: 0.2, step: 0.005 },
            windScale2: { value: 0.043, min: 0.01, max: 0.2, step: 0.005 },
            windDirectionX: { value: -1.0, min: -1.0, max: 1.0, step: 0.1 },
            windDirectionZ: { value: 1.0, min: -1.0, max: 1.0, step: 0.1 },
        }, {collapsed: true}),
    }, { collapsed: true });

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
    const cameraXZ = uniform(new THREE.Vector3()); // camera position (XZ plane only)
    const playerXZ = uniform(new THREE.Vector3());
    const noiseTexNode = uniform(noiseTex);

    const worldPos = positionWorld;

    const prevCamPos = new Vector3();
    const fieldSize = gridSize * spacing;
    const halfSize = fieldSize * 0.5;

    // Uniforms for wind
    const uTime = uniform(0);
    const uDirection = uniform(new THREE.Vector2(windDirectionX, windDirectionZ).normalize()); // Normalized direction
    const uSpeed = uniform(windSpeed);
    const uScale1 = uniform(windScale1);
    const uScale2 = uniform(windScale2);

    // Update cameraXZ every frame (if changed)
    useFrame((state) => {
        const cam = state.camera;
        if (!cam.position.equals(prevCamPos)) {
            cameraXZ.value.set(cam.position.x, 0, cam.position.z);
            prevCamPos.copy(cam.position);
        }

        if (playerRef.current) {
            const pos = playerRef.current.translation(); // Get position directly
            playerXZ.value.set(pos.x, 0, pos.z);
        }


        // Update time for wind animation
        uTime.value = state.clock.getElapsedTime();
        uDirection.value.set(windDirectionX, windDirectionZ).normalize(); // Normalize direction on update
        uSpeed.value = windSpeed; // Update the uniform's value each frame
        uScale1.value = windScale1; // Update scale 1 value each frame
        uScale2.value = windScale2; // Update scale 2 value each frame
    });

    // Wrap blade center positions around the camera for infinite scrolling illusion
    const relative = sub(centerNode, playerXZ);
    const wrappedX = sub(mod(add(relative.x, halfSize), fieldSize), halfSize);
    const wrappedZ = sub(mod(add(relative.z, halfSize), fieldSize), halfSize);
    const wrappedCenter = add(vec3(wrappedX, centerNode.y, wrappedZ), playerXZ);

    const camToBladeXZ = normalize(add(sub(cameraXZ, wrappedCenter), vec3(0.0001)));
    const right = normalize(vec3(camToBladeXZ.z, 0.0, negate(camToBladeXZ.x)));
    const up = vec3(0.0, 1.0, 0.0);

    // only use x/y
    const rotatedOffset = add(
        mul(right, vec3(offsetNode.x)),
        mul(up, vec3(offsetNode.y))
    );

    //Sample wind function
    const windOffset = windFn([noiseTexNode, worldPos, uTime, uDirection, uSpeed, uScale1, uScale2]);

    const finalPosition = add(wrappedCenter, rotatedOffset);

    // Calculate normals in the shader (for lighting/matcap)
    const normal = normalize(cross(dFdx(finalPosition), dFdy(finalPosition)));

    // Use matcap UV trick to simulate shading
    const viewNormal = normalize(normal);
    const matcapUV = add(mul(viewNormal.xy, 0.5), vec3(0.5, 0.5, 0.0));
    const matcapColor = texture(matcapTexture, matcapUV.xy);

    // Create a gradient color from bottom (dark) to tip (light) using local offset
    const localHeight = clamp(div(offsetNode.y, 0.25), 0.0, 1.0);
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
        <primitive object={mesh} />
    );
}