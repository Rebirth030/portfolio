// components/trees/BushLeaves.jsx
import * as THREE from 'three'
import { createLeafClusterGeometry } from '../../utils/LeafClustersGeometry.js'
import { baseLinearColor, createLeafMaterial } from '../../utils/foliageUtils.js'

export default function createBushMesh({
                                           // Farb-/Geometrie-Parameter
                                           color = '#61803e',
                                           count = 100,
                                           radius = 0.6,
                                           planeSize = 0.6,
                                           tilt = 0.35,

                                           // Beleuchtung
                                           backlight = 0.18,
                                           sunDir = new THREE.Vector3(-0.35, 1.0, 0.2).normalize(),

                                           // SDF (Alpha-Kanal)
                                           sdfUrl = '/bushLeaves_sdf.png',

                                           // Cutout/AA
                                           softness = 1.0,
                                           alphaTest = 0.5
                                       } = {}) {
    const baseLin  = baseLinearColor(color)
    const geometry = createLeafClusterGeometry({ baseLin, count, radius, planeSize, tilt })

    // createLeafMaterial nutzt intern die SDF-Textur (Alpha-Kanal) und fwidth-basiertes AA
    const material = createLeafMaterial({ sdfUrl, baseLin, backlight, sunDir, alphaTest, softness })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
}
