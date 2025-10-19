// src/utils/buildNodeMaterialFromExisting.js
import * as THREE from 'three/webgpu'

import {
    add, sub, mul, div, pow, dot, mix, smoothstep,
    uv, vec2, vec3, float, uniform, length, clamp, color
} from 'three/tsl'
import { texture } from 'three/src/Three.TSL.js'

// --- NEU: Cache pro Quell-Material (vermeidet Mehrfach-Konvertierung) ---
const _nodeMatCache = new WeakMap()

export default function buildNodeMaterialFromExisting(oldMaterial, opts = {}) {
    if (!oldMaterial) return null

    // Bereits ein NodeMaterial? Direkt zurückgeben.
    if (oldMaterial.isNodeMaterial) return oldMaterial

    // Bereits konvertiert? Aus dem Cache liefern.
    const cached = _nodeMatCache.get(oldMaterial)
    if (cached) return cached

    const needsPhysical =
        (oldMaterial.transmission ?? 0) > 0 ||
        (oldMaterial.ior ?? 0) > 0 ||
        (oldMaterial.thickness ?? 0) > 0 ||
        (oldMaterial.clearcoat ?? 0) > 0 ||
        (oldMaterial.sheen ?? 0) > 0 ||
        (oldMaterial.specularIntensity ?? 0) > 0

    const NodeMatCtor = needsPhysical
        ? THREE.MeshPhysicalNodeMaterial
        : THREE.MeshStandardNodeMaterial

    const nm = new NodeMatCtor()

    // Basis
    nm.name       = oldMaterial.name ?? 'ConvertedNodeMat'
    nm.toneMapped = (oldMaterial.toneMapped !== undefined) ? oldMaterial.toneMapped : true
    nm.side       = oldMaterial.side ?? THREE.FrontSide

    // Farben & Maps
    nm.color          = (oldMaterial.color && oldMaterial.color.isColor) ? oldMaterial.color.clone() : new THREE.Color('white')
    nm.map            = oldMaterial.map ?? null
    nm.normalMap      = oldMaterial.normalMap ?? null
    nm.aoMap          = oldMaterial.aoMap ?? null
    nm.aoMapIntensity = oldMaterial.aoMapIntensity ?? nm.aoMapIntensity
    nm.alphaMap       = oldMaterial.alphaMap ?? null

    // PBR
    nm.roughness    = (oldMaterial.roughness  !== undefined) ? oldMaterial.roughness  : 0.5
    nm.roughnessMap = oldMaterial.roughnessMap ?? null
    nm.metalness    = (oldMaterial.metalness  !== undefined) ? oldMaterial.metalness  : 0.0
    nm.metalnessMap = oldMaterial.metalnessMap ?? null

    // Emissive (Property-Werte bleiben erhalten)
    if (oldMaterial.emissive) nm.emissive = oldMaterial.emissive.clone()
    nm.emissiveMap = oldMaterial.emissiveMap ?? null
    if (oldMaterial.emissiveIntensity !== undefined) nm.emissiveIntensity = oldMaterial.emissiveIntensity

    // Transparenz/Depth
    if (oldMaterial.transparent !== undefined) nm.transparent = oldMaterial.transparent
    if (oldMaterial.opacity     !== undefined) nm.opacity     = oldMaterial.opacity
    if (oldMaterial.alphaTest   !== undefined) nm.alphaTest   = oldMaterial.alphaTest
    if (oldMaterial.depthWrite  !== undefined) nm.depthWrite  = oldMaterial.depthWrite
    if (oldMaterial.depthTest   !== undefined) nm.depthTest   = oldMaterial.depthTest

    // Physical-Erweiterungen
    if (needsPhysical) {
        nm.transmission        = oldMaterial.transmission ?? 0.0
        nm.transmissionMap     = oldMaterial.transmissionMap ?? null
        nm.ior                 = oldMaterial.ior ?? 1.5
        nm.thickness           = oldMaterial.thickness ?? 0.0
        nm.thicknessMap        = oldMaterial.thicknessMap ?? null
        nm.attenuationDistance = oldMaterial.attenuationDistance ?? Infinity
        nm.attenuationColor    = oldMaterial.attenuationColor?.clone?.() ?? nm.attenuationColor

        nm.clearcoat             = oldMaterial.clearcoat ?? 0.0
        nm.clearcoatRoughness    = oldMaterial.clearcoatRoughness ?? 0.0
        nm.clearcoatMap          = oldMaterial.clearcoatMap ?? null
        nm.clearcoatRoughnessMap = oldMaterial.clearcoatRoughnessMap ?? null
        nm.clearcoatNormalMap    = oldMaterial.clearcoatNormalMap ?? null

        nm.sheen = oldMaterial.sheen ?? 0.0
        if (oldMaterial.sheenColor) nm.sheenColor = oldMaterial.sheenColor.clone()
        if (oldMaterial.sheenRoughness !== undefined) nm.sheenRoughness = oldMaterial.sheenRoughness

        if (oldMaterial.specularIntensity !== undefined) nm.specularIntensity = oldMaterial.specularIntensity
        if (oldMaterial.specularColor) nm.specularColor = oldMaterial.specularColor.clone()
        nm.specularIntensityMap = oldMaterial.specularIntensityMap ?? null
        nm.specularColorMap     = oldMaterial.specularColorMap ?? null
    }

    // Env
    if (oldMaterial.envMapIntensity !== undefined) nm.envMapIntensity = oldMaterial.envMapIntensity

    // --- NEU: in den Cache legen und zurückgeben ---
    _nodeMatCache.set(oldMaterial, nm)
    return nm
}
