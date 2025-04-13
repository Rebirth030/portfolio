import { color, attribute, add, mul, sub, mod, div, mix, clamp, uniform, vec3, normalize, negate, cross, dFdx, dFdy, texture } from 'three/tsl';
import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { useFrame, useLoader } from '@react-three/fiber';
import { Vector3 } from 'three';
import {useControls} from "leva";

export default function InfiniteGrass() {
    const {
        gridSize,
        spacing,
        bladeHeight,
        maxHeightVariation,
        topColorHex,
        bottomColorHex,
        roughness,
        metalness
    } = useControls('Infinite Grass', {
        gridSize: { value: 500, min: 10, max: 1000, step: 10 },
        spacing: { value: 0.1, min: 0.01, max: 1.0, step: 0.01 },
        bladeHeight: { value: 0.2, min: 0.05, max: 0.5, step: 0.01 },
        maxHeightVariation: { value: 0.05, min: 0, max: 0.2, step: 0.005 },
        topColorHex: { value: '#99ff66' },
        bottomColorHex: { value: '#336622' },
        roughness: { value: 1.0, min: 0, max: 1, step: 0.01 },
        metalness: { value: 0.0, min: 0, max: 1, step: 0.01 },
    });

    // Load matcap texture for stylized shading
    const matcapTexture = useLoader(THREE.TextureLoader, './matcap-grass2.png');
    matcapTexture.colorSpace = THREE.SRGBColorSpace;

    // Generate procedural blade geometry
    const geometry = useMemo(() => {
        const bladeCount = gridSize * gridSize;
        const vertexCount = bladeCount * 3;

        const centers = new Float32Array(vertexCount * 3); // per-vertex center
        const offsets = new Float32Array(vertexCount * 3); // local shape of blade
        const normals = new Float32Array(vertexCount * 3); // upward normals

        let v = 0;

        for (let i = 0; i < bladeCount; i++) {
            const halfSize = (gridSize - 1) * spacing * 0.5;

            const x = (i % gridSize) * spacing - halfSize + (Math.random() - 0.5) * spacing;
            const z = Math.floor(i / gridSize) * spacing - halfSize + (Math.random() - 0.5) * spacing;
            const y = bladeHeight;

            const heightVariation = (Math.random() * 2 - 1) * maxHeightVariation;

            // Create 3 vertices per blade (a vertical triangle)
            for (let j = 0; j < 3; j++) {
                centers[v * 3 + 0] = x;
                centers[v * 3 + 1] = y;
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
                    offsets[v * 3 + 1] = 0.2 + heightVariation;
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
    }, [gridSize, spacing, bladeHeight]);

    // Access per-vertex data in TSL
    const centerNode = attribute('position');
    const offsetNode = attribute('offset');
    const cameraXZ = uniform(new THREE.Vector3()); // camera position (XZ plane only)

    const prevCamPos = new Vector3();
    const fieldSize = gridSize * spacing;
    const halfSize = fieldSize * 0.5;

    // Update cameraXZ every frame (if changed)
    useFrame((state) => {
        const cam = state.camera;
        if (!cam.position.equals(prevCamPos)) {
            cameraXZ.value.set(cam.position.x, 0, cam.position.z);
            prevCamPos.copy(cam.position);
        }
    });

    // Wrap blade center positions around the camera for infinite scrolling illusion
    const relative = sub(centerNode, cameraXZ);
    const wrappedX = sub(mod(add(relative.x, halfSize), fieldSize), halfSize);
    const wrappedZ = sub(mod(add(relative.z, halfSize), fieldSize), halfSize);
    const wrappedCenter = add(vec3(wrappedX, centerNode.y, wrappedZ), cameraXZ);

    // Align each blade to face the camera (billboard-style)
    const camToBlade = normalize(
        sub(vec3(cameraXZ.x, 0.0, cameraXZ.z), vec3(wrappedCenter.x, 0.0, wrappedCenter.z))
    );

    const right = normalize(vec3(camToBlade.z, 0.0, negate(camToBlade.x)));
    const up = vec3(0.0, 1.0, 0.0);

    // Rotate offset by camera orientation
    const rotatedOffset = add(
        add(mul(right, vec3(offsetNode.x)), mul(up, vec3(offsetNode.y))),
        mul(camToBlade, vec3(offsetNode.z))
    );

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

    // Return the final mesh
    return (
        <primitive object={new THREE.Mesh(geometry, material)} />
    );
}
