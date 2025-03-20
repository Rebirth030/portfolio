import {useControls} from "leva";
import * as THREE from "three";
import MeshGridMaterial, {MeshGridMaterialLine} from "./MeshGridMaterial.js";

export default function FloorGrid() {
    /**
     * Material
     */
    const lines = [
        new MeshGridMaterialLine('#444444', 0.1, 0.04, 0.25),
        new MeshGridMaterialLine('#705df2', 1, 0.02, 0.75),
        new MeshGridMaterialLine('#ffffff', 10, 0.002),
    ]
    const linesConfig = {}
    for(let i = 0; i < lines.length; i++){
            linesConfig["line " + (i + 1)] = {
                scale: {value: lines[i].scale.value, min: 0, max: 10, step: 0.001},
                thickness: {value: lines[i].thickness.value, min: 0, max: 1, step: 0.001},
                offsetX: {value: lines[i].offset.value.x, min: 0, max: 1, step: 0.001},
                offsetY: {value: lines[i].offset.value.y, min: 0, max: 1, step: 0.001},
                cross: {value: lines[i].cross.value, min: 0, max: 1, step: 0.001},
                color: {value: lines[i].color.value.getHexString(THREE.SRGBColorSpace)}
            }
        }

    const {scale, antialiased} = useControls('grid', {
        scale: {value: 1, min: 0, max: 10, step: 0.001},
        antialiased: {value: true},


    })

    const worldGridMaterial = new MeshGridMaterial({
        color: '#19191f',
        scale: scale,
        antialiased: antialiased,
        reference: 'worldTriplanar',
        side: THREE.DoubleSide,
        lines
    })


    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        worldGridMaterial
    )
    floor.rotation.x = - Math.PI * 0.5
    floor.position.y = - 1

    return (
        <primitive object={floor} />
    )
}
