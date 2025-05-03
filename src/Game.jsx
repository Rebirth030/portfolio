import {Environment, OrbitControls} from '@react-three/drei'
import {useControls} from 'leva'
import FloorGrid from "./exchange/FloorGrid.jsx";
import {Physics, RigidBody} from "@react-three/rapier";
import Player from "./Player.jsx";
import InfiniteGrass from "./gras/InfiniteGras.jsx";
import {useRef} from "react";


export default function Game() {
    const playerRef = useRef();
    return (
        <>
            <Physics
                debug={true}
                updateLoop={"follow"}
                timestep="fixed"

            >

                <OrbitControls/>
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

                <Player ref={playerRef}/>
                <InfiniteGrass playerRef={playerRef}/>


            </Physics>
            <Environment preset="apartment" background/>

        </>
    )
}