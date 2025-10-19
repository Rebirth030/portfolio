// utils/foliageUtils.js
import * as THREE from 'three/webgpu'
import {
    texture, uv, screenUV, screenSize,
    vec2, vec3, float, uniform,
    add, sub, mul, clamp, length, smoothstep,
    normalize, normalWorld, saturate, dot,
    abs, dFdx, dFdy, max
} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from "three/webgpu";

// Linearer Loader für Masken/SDFs (keine Farbraumkonvertierung)
export function loadMaskTexture(url) {
    const tex = new THREE.TextureLoader().load(url)
    tex.colorSpace = THREE.NoColorSpace
    tex.flipY = false
    tex.minFilter = THREE.LinearMipMapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
}

// sRGB → linear + leichte ACES-Dämpfung
export function baseLinearColor(hex, acesMul = 0.75) {
    return new THREE.Color(hex).convertSRGBToLinear().multiplyScalar(acesMul)
}

/* -------------------------------------------------------------
   Interner Helfer: SDF-Coverage aus Alpha-Kanal (0..1, Isolinie ~0.5)
   - thresholdNode: TSL-Node (float)
   - softnessNode : TSL-Node (float), skaliert fwidth-ähnliche Breite
   → rein aus Ausdrücken aufgebaut (keine Assigns/Mutationen)
------------------------------------------------------------- */
function sdfCoverageAlphaChannel(sdfTexture, thresholdNode, softnessNode) {
    const s4 = texture(sdfTexture, uv())
    const sdf01 = s4.a

    // fwidth ≈ |dFdx| + |dFdy|, mit Schutz vor 0
    const ddx = abs(dFdx(sdf01))
    const ddy = abs(dFdy(sdf01))
    const fw = max(add(ddx, ddy), float(1.0 / 2048.0))

    const spread = mul(softnessNode, fw) // skalenrobuste Kantenbreite
    return smoothstep(sub(thresholdNode, spread), add(thresholdNode, spread), sdf01)
}

function makeLeafDistanceMaterial(coverageNode, side = THREE.FrontSide) {
    const m = new THREE.MeshBasicNodeMaterial();
    m.opacityNode = coverageNode; // dieselbe Coverage wie im Sichtbarkeitsmaterial
    m.transparent = false;
    m.alphaTest = 0.5;            // wie im Hauptmaterial
    m.side = side;
    return m;
}

/* -------------------------------------------------------------
   SDF-basiertes Blattmaterial mit Screen-Fade (Mitte → außen).
   - SDF liegt im Alpha-Kanal
   - Depth-stabil via alphaTest (kein Blending)
   - Kanten-AA skalenrobust (fwidth-Äquivalent)
   - r180-konform: keine in-place Assignments / .toVar()
------------------------------------------------------------- */
export function createTreeLeafMaterialSDF({
                                              // Texturen
                                              sdfUrl,                           // z. B. '/bushLeaves_sdf.png' – SDF-Isolinie ~ 0.5
                                              screenNoiseUrl = null,            // optionales Noise für organischen Fade-Rand

                                              // Shading/Albedo
                                              baseLin,                          // THREE.Color (linear) – Backlight-Ton
                                              backlight = 0.16,
                                              sunDir = new THREE.Vector3(0, 1, 0),

                                              // Cutout/AA
                                              initialThreshold = 0.50,          // ~ SDF-Isolinie
                                              softness = 1.0,                   // skaliert fwidth-basierte Breite
                                              alphaTest = 0.5,                  // depth-stabiler Cut

                                              // Screen-Fade (Zentrum → außen)
                                              innerRadius = 0.10,
                                              outerRadius = 0.22,
                                              fadeStrength = 1.0                // 0..1
                                          } = {}) {
    // --- Texturen laden ---
    const sdfTex = loadMaskTexture(sdfUrl)
    const noiseTex = screenNoiseUrl ? loadMaskTexture(screenNoiseUrl) : null
    if (noiseTex) {
        noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping
    }

    // --- Uniforms (GUI-freundlich) ---
    const uThreshold = uniform(initialThreshold)
    const uSoftness = uniform(softness)
    const uFadeStr = uniform(fadeStrength)
    const uInnerR = uniform(innerRadius)
    const uOuterR = uniform(outerRadius)
    const uBacklight = uniform(backlight)

    // --- Screen-Fade (aspect-korrigiert) – rein aus Ausdrücken ---
    const aspect = screenSize.x.div(screenSize.y)
    const dx = sub(screenUV.x, float(0.5)).mul(aspect)
    const dy = sub(screenUV.y, float(0.5))
    const distBase = length(vec2(dx, dy))

    // Optional organischer Rand
    const dist = noiseTex
        ? add(
            distBase,
            add(texture(noiseTex, screenUV.mul(float(3.0))).r, float(-0.5)).mul(float(0.15))
        )
        : distBase

    // Fade-Maske 0..1 (1 = im Zentrum aktiv)
    const fadeMask = clamp(
        sub(float(1.0), smoothstep(uInnerR, uOuterR, dist)),
        0.0, 1.0
    )

    // Effektiver Threshold: Basis → 1.0 je nach Fade-Maske
    const mixAmt = mul(fadeMask, uFadeStr)
    const thEff = add(
        mul(uThreshold, sub(float(1.0), mixAmt)),
        mul(float(1.0), mixAmt)
    )

    // --- SDF-Coverage (gemeinsamer Helfer) ---

    const coverage = sdfCoverageAlphaChannel(sdfTex, thEff, uSoftness)

    // --- PBR-Node-Material ---
    const mat = new MeshPhysicalNodeMaterial({
        metalness: 0,
        roughness: 0.92,
        sheen: 0.15,
        sheenRoughness: 0.9,
        vertexColors: true,
        side: THREE.DoubleSide,
        envMapIntensity: 0.1,
        opacityNode: coverage,    // depth-stabiler Cutout
        transparent: false,
        alphaTest
    })
    mat.customDistanceMaterial = makeLeafDistanceMaterial(coverage, THREE.FrontSide);
    mat.shadowSide = THREE.FrontSide; // Schatten nur von vorn – halbiert effektiv die Shadow-Overdraw

    // Gegenlicht-Fake (als Uniform steuerbar)
    const L = normalize(vec3(sunDir.x, sunDir.y, sunDir.z))
    const N = normalize(normalWorld)
    const back = saturate(dot(L.mul(float(-1)), N))
    mat.emissiveNode = back.mul(uBacklight)
        .mul(vec3(baseLin.r, baseLin.g, baseLin.b))

    // Für GUI/Leva: Uniform-Referenzen im userData ablegen
    mat.userData.leafSdfControls = {
        uThreshold,
        uSoftness,
        uFadeStr,
        uInnerR,
        uOuterR,
        uBacklight
    }

    return mat
}

/* -------------------------------------------------------------
   Klassisches Alpha-Leaf (Fallback)
   – nutzt dieselbe SDF-Textur (Alpha-Kanal), statischer Threshold 0.5
   – depth-stabil via alphaTest, r180-konform
------------------------------------------------------------- */
export function createLeafMaterial({
                                       sdfUrl,                            // SDF-Datei statt Alpha-Map
                                       baseLin,
                                       backlight = 0.16,
                                       sunDir = new THREE.Vector3(0, 1, 0),
                                       alphaTest = 0.5,
                                       softness = 1.0                     // optional, Standard wie oben
                                   } = {}) {
    const sdfTex = loadMaskTexture(sdfUrl)

    // Fester Threshold 0.5, skalenrobuste Kantenbreite
    const th = float(0.5)
    const uSoft = uniform(softness)
    const coverage = sdfCoverageAlphaChannel(sdfTex, th, uSoft)

    const material = new MeshPhysicalNodeMaterial({
        metalness: 0,
        roughness: 0.92,
        sheen: 0.15,
        sheenRoughness: 0.9,
        vertexColors: true,
        side: THREE.DoubleSide,
        envMapIntensity: 0.1,
        opacityNode: coverage,
        transparent: false,
        alphaTest
    })
    material.customDistanceMaterial = makeLeafDistanceMaterial(coverage, THREE.FrontSide);
    material.shadowSide = THREE.FrontSide; // Schatten nur von vorn – halbiert effektiv die Shadow-Overdraw

    // Backlight-Fake in Blattfarbe
    const L = normalize(vec3(sunDir.x, sunDir.y, sunDir.z))
    const N = normalize(normalWorld)
    const back = saturate(dot(mul(L, float(-1)), N))
    const boost = mul(back, float(backlight))
    material.emissiveNode = mul(boost, vec3(baseLin.r, baseLin.g, baseLin.b))

    return material
}
