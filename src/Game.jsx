import {Environment, OrbitControls} from '@react-three/drei'
import {useControls} from 'leva'
import FloorGrid from "./exchange/FloorGrid.jsx";
import {Physics, RigidBody} from "@react-three/rapier";
import Player from "./Player.jsx";
import InfiniteGrass from "./gras/InfiniteGras.jsx";


export default function Game() {
    return (
        <>
            <Physics
                debug={true}
                updateLoop={"follow"}
                timestep="fixed"

            >


                <FloorGrid/>
                <RigidBody >
                <mesh
                    position={[0, 5, 2]}
                    rotation={[-Math.PI * 0.5, 0, 0]}
                    scale={0.7988585829734802}
                >
                    <boxGeometry />
                    <meshStandardMaterial />
                </mesh>
            </RigidBody>

                <Player/>
                <InfiniteGrass/>


            </Physics>
            <Environment preset="apartment" background/>

        </>
    )
}