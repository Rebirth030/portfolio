// components/trees/OakLeaves.jsx
import * as THREE from 'three'
import { createLeafClusterGeometry } from '../../utils/LeafClustersGeometry.js'
import { baseLinearColor, createTreeLeafMaterialSDF } from '../../utils/foliageUtils.js'

export default function createOakMesh({
                                          // Farb-/Geometrie-Parameter
                                          color = '#61803e',
                                          count = 100,
                                          radius = 0.6,
                                          planeSize = 0.6,
                                          tilt = 0.35,

                                          // Assets
                                          sdfUrl = '/bushLeaves_sdf.png',
                                          screenNoiseUrl = '/noiseTexture.png'
                                      } = {}) {
    const baseLin  = baseLinearColor(color)
    const geometry = createLeafClusterGeometry({ baseLin, count, radius, planeSize, tilt })

    // Material mit Defaults; Runtime-Tuning via InstancedTrees (Leva)
    const material = createTreeLeafMaterialSDF({
        sdfUrl,
        screenNoiseUrl,
        baseLin
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
}
