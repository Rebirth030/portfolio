import {Environment, OrbitControls} from '@react-three/drei'
import {useControls} from 'leva'
import FloorGrid from "./exchange/FloorGrid.jsx";
import {Physics, RigidBody} from "@react-three/rapier";
import Player from "./Player.jsx";
import Ecctrl from "ecctrl";


export default function Game() {
    const {position} = useControls("test",{
        position: "top-left"
    })

    return <>
        <Physics
            debug={true}
            updateLoop={"independent"}
            timestep="varying"

        >
            <OrbitControls makeDefault />



            <FloorGrid/>
        <RigidBody >
            <mesh
                position={[0, 2, 0]}
                rotation={[-Math.PI * 0.5, 0, 0]}
                scale={[1, 1, 1]}
            >
                <boxGeometry />
                <meshStandardMaterial />
            </mesh>
        </RigidBody>


            <Player />

        </Physics>
        <Environment preset="studio" background />
    </>
}