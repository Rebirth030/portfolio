import { useMemo }             from 'react'
import { useGLTF }             from '@react-three/drei'
import { HeightfieldCollider } from '@react-three/rapier'
import * as THREE              from 'three/webgpu'
import {useLoader} from "@react-three/fiber";


export default function Terrain() {




    const { heights, widthSegs, maxX, minX, maxZ, minZ, mesh } = useMemo(() => {
        const {nodes, meshes } = useGLTF('./PortfolioTerrain.glb', true)
        const mesh = nodes.Plane

        const posAttr = mesh.geometry.attributes.position
        const total = posAttr.count   // total vertex count from mesh geometry
        const rows =  Math.sqrt(total)   // vertices per row derived from data
        let widthSegs = rows - 1;


        // bounding box to get extents
        mesh.geometry.computeBoundingBox()
        const bb    = mesh.geometry.boundingBox
        const minX  = bb.min.x, maxX = bb.max.x
        const minZ  = bb.min.z, maxZ = bb.max.z

        console.log("bounding boy", mesh.geometry.boundingBox)

        // initialize all heights to the mesh’s lowest Y
        const heights = new Float32Array(Math.round(rows * rows)).fill(bb.min.y)
        console.log(heights.length)

        // 1) Basis-Werte einmalig berechnen
                      // = rows
        const deltaX    = (maxX - minX) / widthSegs;
        const deltaZ    = (maxZ - minZ) / widthSegs;

// 2) Für jedes Vertex einzeln:
        for (let k = 0; k < total; k++) {
            const x = posAttr.array[k*3 + 0];
            const y = posAttr.array[k*3 + 1];
            const z = posAttr.array[k*3 + 2];

            // 3) Spalten- und Zeilenindex separat bestimmen
            let i = Math.round((x - minX) / deltaX);
            let j = Math.round((z - minZ) / deltaZ);

            // 5) Linearen Index korrekt berechnen: j * cols + i
            const idx = Math.min(Math.max(i, 0), widthSegs) * rows + Math.min(Math.max(j, 0), widthSegs);

            heights[idx] = y;
        }

        const material = new THREE.MeshStandardNodeMaterial()


        return { heights, widthSegs, maxX, minX, maxZ, minZ, mesh }
    }, [])


    return (
        <group
        position={[0, -20, 0]}>

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
                friction={1.5}
            />
        </group>
    )
}
