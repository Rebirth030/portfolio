// foliageUtils.js
import * as THREE from 'three'
import { MeshPhysicalNodeMaterial } from 'three/webgpu'
import {
    texture, uv, smoothstep, float, vec3,
    normalize, normalWorld, saturate, dot, mul
} from 'three/tsl'

// Non-Color Alpha-Map laden
export function loadAlphaMap(url) {
    const tex = new THREE.TextureLoader().load(url)
    tex.colorSpace = THREE.NoColorSpace
    tex.flipY = false
    return tex
}

// sRGB → Linear + ACES-freundliche Dämpfung
export function baseLinearColor(hex, acesMul = 0.75) {
    return new THREE.Color(hex).convertSRGBToLinear().multiplyScalar(acesMul)
}

// Standard-Leaf-Material: PBR + AlphaTest + leichtes Backlight
export function createLeafMaterial({ alphaMap, baseLin, backlight = 0.16, sunDir = new THREE.Vector3(0, 1, 0) }) {
    const a = texture(alphaMap, uv()).x
    const alphaSoft = smoothstep(float(0.35), float(0.65), a)

    const material = new MeshPhysicalNodeMaterial({
        metalness: 0,
        roughness: 0.92,
        sheen: 0.15,
        sheenRoughness: 0.9,
        vertexColors: true,
        side: THREE.DoubleSide,
        envMapIntensity: 0.1,
        opacityNode: alphaSoft,
        transparent: false,    // alphaTest genügt → saubere Depth
        alphaTest: 0.5
    })

    // Backlight-Fake in Blattfarbe
    const L = normalize(vec3(sunDir.x, sunDir.y, sunDir.z))
    const N = normalize(normalWorld)
    const back = saturate(dot(mul(L, float(-1)), N))
    const boost = mul(back, float(backlight))
    material.emissiveNode = mul(boost, vec3(baseLin.r, baseLin.g, baseLin.b))

    return material
}

// Goldener Winkel für Ring-Versatz
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
export const ringAngleOffset = (i) => i * GOLDEN_ANGLE
