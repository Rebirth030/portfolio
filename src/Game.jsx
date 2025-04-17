import {Environment, OrbitControls} from '@react-three/drei'
import {useControls} from 'leva'
import FloorGrid from "./exchange/FloorGrid.jsx";
import {Physics, RigidBody} from "@react-three/rapier";
import Player from "./Player.jsx";
import {EcctrlJoystick} from "ecctrl";
import GrasField from "./gras/InfiniteGras.jsx";
import InfiniteGrass from "./gras/InfiniteGras.jsx";


export default function Game() {
    return (
        <>
            <Physics
                debug={true}
                updateLoop={"independent"}
                timestep="varying"

            >
                <OrbitControls makeDefault />


                <FloorGrid/>
                <InfiniteGrass />
                {/*<RigidBody>
                    <mesh
                        position={[0, 5, 0]}
                        rotation={[-Math.PI * 0.5, 0, 0]}
                        scale={[1, 1, 1]}
                    >
                        <boxGeometry/>
                        <meshStandardMaterial/>
                    </mesh>
                </RigidBody>*/}

                <Player/>


            </Physics>
            <Environment preset="apartment" background/>

        </>
    )
}