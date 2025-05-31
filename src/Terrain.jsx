import { useMemo }             from 'react'
import { useGLTF }             from '@react-three/drei'
import { HeightfieldCollider } from '@react-three/rapier'
import * as THREE              from 'three/webgpu'


export default function Terrain() {
    const {meshes } = useGLTF('./PortfolioTerrain.glb', true)
    const mesh = meshes.Plane


    const { heights, widthSegs, maxX, minX, maxZ, minZ } = useMemo(() => {
        const posAttr = mesh.geometry.attributes.position
        const total = posAttr.count   // hard-coded total vertices for test
        const rows =  Math.sqrt(total)    // hard-coded vertices per row
        const widthSegs = rows - 1


        // bounding box to get extents
        mesh.geometry.computeBoundingBox()
        const bb    = mesh.geometry.boundingBox
        const minX  = bb.min.x, maxX = bb.max.x
        const minZ  = bb.min.z, maxZ = bb.max.z

        // initialize all heights to the mesh’s lowest Y
        const heights = new Float32Array(rows * rows).fill(bb.min.y)

        // fill in each sample index
        for (let i = 0; i < total; i++) {
            const x = posAttr.array[i * 3 + 0]
            const y = posAttr.array[i * 3 + 1]
            const z = posAttr.array[i * 3 + 2]
            const delta = (maxX - minX) / widthSegs
            const idx = Math.round(((x - minX) / delta) * rows + ((z - minZ) / delta))

            heights[idx] = y


            console.log(rows)
            console.log("minX", minX, "maxX", maxX, "minZ", minZ, "maxZ", maxZ)
            console.log(`vertex ${i}: x=${x}, z=${z} → idx=${idx} y=${y}` )
        }
        return { heights, widthSegs, maxX, minX, maxZ, minZ }
    }, [mesh])

    return (
        <>

            <primitive object={mesh} />


            <HeightfieldCollider
                args={[
                    widthSegs,
                    widthSegs,
                    heights,
                    new THREE.Vector3(maxX - minX, 1, maxZ - minZ),
                ]}
                type="fixed"
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
            />
        </>
    )
}
