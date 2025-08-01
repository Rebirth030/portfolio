import { useMemo }             from 'react'
import { useGLTF }             from '@react-three/drei'
import { HeightfieldCollider } from '@react-three/rapier'
import * as THREE              from 'three/webgpu'
import {useLoader} from "@react-three/fiber";
import {mix, smoothstep, texture, uniform, uv, vec3, vec2, sub, positionWorld, mul} from "three/tsl";
import {folder, useControls} from "leva";
import WaterMaterial from "./Material/WaterMaterial.jsx";


export default function Terrain() {

    const {
        darkGreenHex,
        sandHex,
        lightBlueHex,
        darkBlueHex,
        t1Min, t1Max,    // Grün → Sand
        t2Min, t2Max,    // Sand → Hellblau
        t3Min, t3Max,     // Hellblau → Dunkelblau
        waterMax, waterMin
    } = useControls(
        'Terrain Material',
        {
            Colors: folder(
                {
                    darkGreenHex: { value: '#426f48' },
                    sandHex:      { value: '#598f5c' },
                    lightBlueHex: { value: '#759059' },
                    darkBlueHex:  { value: '#227393' }
                },
                { collapsed: true }
            ),
            Thresholds: folder(
                {
                    t1Min: { value: 0.18, min: 0, max: 1, step: 0.01 },
                    t1Max: { value: 0.93, min: 0, max: 1, step: 0.01 },
                    t2Min: { value: 0.48, min: 0, max: 1, step: 0.01 },
                    t2Max: { value: 1.00, min: 0, max: 1, step: 0.01 },
                    t3Min: { value: 0.62, min: 0, max: 1, step: 0.01 },
                    t3Max: { value: 1.00, min: 0, max: 1, step: 0.01 },
                    waterMin: { value: 0.67, min: 0, max: 1, step: 0.01 },
                    waterMax: { value: 1.00, min: 0, max: 1, step: 0.01 },
                },
                { collapsed: true }
            )
        },
        { collapsed: true }
    )


    const terrainMaterial = useMemo(() => {
        // Lade TerrainMap
        const terrainMap = useLoader(THREE.TextureLoader, './TerrainMap.png')
        terrainMap.wrapS = terrainMap.wrapT = THREE.RepeatWrapping

        // Hex-Werte in linearen RGB umwandeln
        const uDarkG = new THREE.Color(darkGreenHex)
        const uSand   = new THREE.Color(sandHex)
        const uLightB = new THREE.Color(lightBlueHex)
        const uDarkB = new THREE.Color(darkBlueHex)

        // Blauwert aus der TerrainMap holen (Textur)
        // sample the blue channel (flip V so it matches your UV orientation)
        const uvNode = uv();
        const blue = texture(terrainMap, vec2(uvNode.x, sub(1, uvNode.y))).b;

// Erster Masken-Schritt: Dunkelgrün → Sand
        const m1 = smoothstep(t1Min, t1Max, blue);
        const c1 = mix(uDarkG, uSand, m1);

// Zweiter Masken-Schritt: Sand → Hellblau
// Bestimme die Welt‑Y-Position
        const posY = positionWorld.y;
// Erzeuge eine Maske, die nur dort 1 ergibt, wo die Welt‑Position unterhalb der Wasseroberfläche liegt.
// Hier wird die Standard-Smoothstep-Funktion verwendet, um einen scharfen Übergang rund um die Wasserlinie zu erzeugen.
// Durch sub(1.0, …) kehren wir die Maske um, sodass bei tiefen Y-Werten (also im Wasser) ein hoher Wert resultiert.
        const waterMask = sub(1.0, smoothstep(uniform(waterMin), uniform(waterMax), posY));

// Mit m2 wird der Übergang im Bereich zwischen Sand und Hellblau anhand des blaue Kanals gesteuert.
        const m2 = smoothstep(t2Min, t2Max, blue);
// Die Maske wird mit m2 kombiniert, sodass der Übergang zu Hellblau nur dort erfolgt, wo auch das Wasser vorhanden ist.
        const m2Water = mul(m2, waterMask);
// Mische Sand (c1) mit Hellblau, gesteuert durch den kombinierten Übergang
        const c2 = mix(c1, uLightB, m2Water);

// Dritter Masken-Schritt: Hellblau → Dunkelblau
        const m3 = smoothstep(t3Min, t3Max, blue);
        const col = mix(c2, uDarkB, m3);


        // Erstelle Material mit dem finalen Farbgemisch
        const mat = new THREE.MeshStandardNodeMaterial()
        mat.colorNode = col
        mat.roughnessNode = 1.0
        mat.metalnessNode = 0
        return mat
    }, [
        darkGreenHex, lightBlueHex, darkBlueHex, sandHex,
        t1Min, t1Max, t2Min, t2Max, t3Min, t3Max,
    ])



    const { heights, widthSegs, maxX, minX, maxZ, minZ, mesh, water } = useMemo(() => {
        const {nodes } = useGLTF('./PortfolioTerrain.glb', true)
        const mesh = nodes.Plane
        const water = nodes.Water



        water.material = WaterMaterial(waterMin, waterMax)

        const posAttr = mesh.geometry.attributes.position
        const total = posAttr.count   // total vertex count from mesh geometry
        const rows =  Math.sqrt(total)   // vertices per row derived from data
        let widthSegs = rows - 1;


        // bounding box to get extents
        mesh.geometry.computeBoundingBox()
        const bb    = mesh.geometry.boundingBox
        const minX  = bb.min.x, maxX = bb.max.x
        const minZ  = bb.min.z, maxZ = bb.max.z


        // initialize all heights to the mesh’s lowest Y
        const heights = new Float32Array(Math.round(rows * rows)).fill(bb.min.y)

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
        return { heights, widthSegs, maxX, minX, maxZ, minZ, mesh, water }
    }, [waterMin, waterMax])


    return (
        <>
            <primitive object={water} position-y={0}/>
        <group
        position={[0, -20, 0]}>
            <primitive object={mesh} material={terrainMaterial}/>
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
            </>
    )
}
