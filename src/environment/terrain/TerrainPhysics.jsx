import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { HeightfieldCollider } from '@react-three/rapier'
import * as THREE from 'three/webgpu'
import { LAYERS } from '../../physics/layers.js'

export default function TerrainPhysics() {
  const { nodes } = useGLTF('/PortfolioTerrain.glb', true)
  const { heights, widthSegs, maxX, minX, maxZ, minZ } = useMemo(() => {
    const mesh = nodes.Plane
    const posAttr = mesh.geometry.attributes.position
    const total = posAttr.count
    const rows = Math.sqrt(total)
    let widthSegs = rows - 1

    mesh.geometry.computeBoundingBox()
    const bb = mesh.geometry.boundingBox
    const minX = bb.min.x, maxX = bb.max.x
    const minZ = bb.min.z, maxZ = bb.max.z

    const heights = new Float32Array(Math.round(rows * rows)).fill(bb.min.y)

    const deltaX = (maxX - minX) / widthSegs
    const deltaZ = (maxZ - minZ) / widthSegs

    for (let k = 0; k < total; k++) {
      const x = posAttr.array[k*3 + 0]
      const y = posAttr.array[k*3 + 1]
      const z = posAttr.array[k*3 + 2]
      let i = Math.round((x - minX) / deltaX)
      let j = Math.round((z - minZ) / deltaZ)
      const idx = Math.min(Math.max(i, 0), widthSegs) * rows + Math.min(Math.max(j, 0), widthSegs)
      heights[idx] = y
    }
    return { heights, widthSegs, maxX, minX, maxZ, minZ }
  }, [nodes])

  return (
    <HeightfieldCollider
      args={[widthSegs, widthSegs, heights, new THREE.Vector3(maxX - minX, 1, maxZ - minZ)]}
      type="fixed"
      position={[0, -20, 0]}
      rotation={[0, 0, 0]}
      friction={1.5}
      collisionGroups={{ memberships: LAYERS.TERRAIN, filters: LAYERS.PLAYER | LAYERS.DEFAULT }}
    />
  )
}
