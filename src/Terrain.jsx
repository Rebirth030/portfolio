import { useMemo }             from 'react'
import { useGLTF }             from '@react-three/drei'
import { HeightfieldCollider } from '@react-three/rapier'
import * as THREE              from 'three/webgpu'

let terrainData = null

export function getHeightAt(x, z) {
    if (!terrainData) return 0
    const { heights, widthSegs, maxX, minX, maxZ, minZ } = terrainData
    const rows = widthSegs + 1
    const stepX = (maxX - minX) / widthSegs
    const stepZ = (maxZ - minZ) / widthSegs

    const gx = (x - minX) / stepX
    const gz = (z - minZ) / stepZ
    const ix = Math.floor(gx)
    const iz = Math.floor(gz)
    const fx = Math.min(Math.max(gx - ix, 0), 1)
    const fz = Math.min(Math.max(gz - iz, 0), 1)

    const clamp = (v, m, M) => Math.max(m, Math.min(M, v))
    const ci = clamp(ix, 0, widthSegs - 1)
    const cj = clamp(iz, 0, widthSegs - 1)

    const idx = (i, j) => i * rows + j
    const h00 = heights[idx(ci, cj)]
    const h10 = heights[idx(ci + 1, cj)]
    const h01 = heights[idx(ci, cj + 1)]
    const h11 = heights[idx(ci + 1, cj + 1)]

    const hx0 = h00 * (1 - fx) + h10 * fx
    const hx1 = h01 * (1 - fx) + h11 * fx
    return hx0 * (1 - fz) + hx1 * fz
}

export function getNormalAt(x, z) {
    if (!terrainData) return new THREE.Vector3(0, 1, 0)
    const step = (terrainData.maxX - terrainData.minX) / terrainData.widthSegs
    const hL = getHeightAt(x - step, z)
    const hR = getHeightAt(x + step, z)
    const hD = getHeightAt(x, z - step)
    const hU = getHeightAt(x, z + step)
    return new THREE.Vector3(hL - hR, 2 * step, hD - hU).normalize()
}


export default function Terrain() {
    const {meshes } = useGLTF('./PortfolioTerrain.glb', true)
    const mesh = meshes.Plane


    const { heights, widthSegs, maxX, minX, maxZ, minZ } = useMemo(() => {
        const posAttr = mesh.geometry.attributes.position
        const total = posAttr.count   // total vertex count from mesh geometry
        const rows =  Math.sqrt(total)    // vertices per row derived from data
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

    terrainData = { heights, widthSegs, maxX, minX, maxZ, minZ }

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
